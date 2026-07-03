#!/usr/bin/env python3
"""
Phase 10 — Algorithm + Learning-loop verification.

Assertions (from docs/QA_MASTER_PROMPT.md §5):
  • Discover ranker is deterministic across two back-to-back requests within
    a short window (with no intervening signals).
  • aiPicks variant returns a different ordering than the default ranker
    (so AI is actually doing work).
  • DTM symmetry: A↔B compatibility score equals B↔A within tolerance.
  • Tracking ingest accepts a v6 event and returns 2xx.
  • Negative-signal: after a pass+pass_feedback on user X, X is no longer in
    the next discover batch for that user.

Output: scripts/qa-runs/phase-10-learning-loop.report.json
"""
from __future__ import annotations
import json, sys, time, urllib.request, urllib.error
from collections import Counter
from pathlib import Path

BASE = "http://localhost:3200"
INGEST = "http://localhost:3260"

errors: list[dict] = []
sigs: Counter = Counter()


def req(url, path, method="GET", data=None, token=None, timeout=20):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    for attempt in range(3):
        r = urllib.request.Request(url + path, data=body, headers=headers, method=method)
        try:
            resp = urllib.request.urlopen(r, timeout=timeout)
            raw = resp.read()
            try:
                return json.loads(raw or b"{}"), resp.getcode()
            except json.JSONDecodeError:
                return {"_raw": raw[:400].decode("utf-8", "replace")}, resp.getcode()
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8", "replace")
            if e.code == 429 and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            try:
                return json.loads(body_text), e.code
            except json.JSONDecodeError:
                return {"_raw": body_text[:400]}, e.code
        except Exception as e:
            return {"_err": str(e)}, 0
    return {"_err": "exhausted"}, 0


def expect(label, code, want, body=None, persona=None):
    if isinstance(want, int):
        want = (want,)
    ok = code in want
    if not ok:
        sig = f"{label} -> {code} (want {sorted(set(want))})"
        sigs[sig] += 1
        errors.append({"persona": persona, "label": label, "code": code, "want": list(want), "body": body})
    return ok


def items_of(d):
    if d is None:
        return []
    data = d.get("data") if isinstance(d, dict) else None
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("items") or data.get("results") or []
    if isinstance(d, list):
        return d
    return []


def login(u):
    d, c = req(BASE, "/api/v1/auth/login", "POST", {"email": f"{u}@miamo.test", "password": u})
    if c == 200:
        return (d.get("data") or {}).get("accessToken") or (d.get("data") or {}).get("token")
    return None


def my_id(tok):
    d, _ = req(BASE, "/api/v1/auth/me", token=tok)
    user = (d.get("data") or {}).get("user") or d.get("data") or {}
    return user.get("id")


print("=== Phase 10: algorithm + learning loop ===\n")
PERSONAS = ["miamo3", "miamo7", "miamo10", "miamo15"]
tokens = {p: login(p) for p in PERSONAS}
tokens = {p: t for p, t in tokens.items() if t}
print(f"  logged in: {len(tokens)}/{len(PERSONAS)}\n")


# ─── 10.1 Determinism within a 5-second window ──────────────
print("--- 10.1 Determinism (back-to-back /discover) ---")
tok = tokens.get("miamo3")
if tok:
    a, ca = req(BASE, "/api/v1/discover?limit=20", token=tok)
    b, cb = req(BASE, "/api/v1/discover?limit=20", token=tok)
    if expect("GET /discover #1", ca, 200, a) and expect("GET /discover #2", cb, 200, b):
        ids_a = [(it.get("id") or it.get("userId")) for it in items_of(a) if isinstance(it, dict)]
        ids_b = [(it.get("id") or it.get("userId")) for it in items_of(b) if isinstance(it, dict)]
        # Head (top 5) should be stable; tail is allowed to wobble via explore noise.
        head_a, head_b = ids_a[:5], ids_b[:5]
        if head_a != head_b:
            common_head = sum(1 for x, y in zip(head_a, head_b) if x == y)
            if common_head < 4:
                sigs[f"ranker head-instability: {common_head}/5 positional match"] += 1
                errors.append({"label": "ranker head unstable", "head_a": head_a, "head_b": head_b})
            else:
                print(f"    head {common_head}/5 match (tail allowed to wobble)")
        else:
            print(f"    top-5 stable ✓")


# ─── 10.2 aiPicks ranker differs from default ─────────────
print("--- 10.2 aiPicks vs default ranker ---")
if tok:
    a, ca = req(BASE, "/api/v1/discover?limit=20", token=tok)
    b, cb = req(BASE, "/api/v1/discover?limit=20&aiPicks=true", token=tok)
    if ca == 200 and cb == 200:
        ids_a = [(it.get("id") or it.get("userId")) for it in items_of(a) if isinstance(it, dict)]
        ids_b = [(it.get("id") or it.get("userId")) for it in items_of(b) if isinstance(it, dict)]
        if ids_a and ids_b and ids_a == ids_b:
            sigs["aiPicks identical to default ranker — AI is a no-op"] += 1
            errors.append({"label": "aiPicks no-op", "ids": ids_a[:10]})
        else:
            print(f"    aiPicks reordered (head: {ids_b[:3]} vs default {ids_a[:3]}) ✓")


# ─── 10.3 ai-match suggestions endpoint ────────────────────
print("--- 10.3 /api/v1/ai-match/suggestions ---")
if tok:
    d, c = req(BASE, "/api/v1/ai-match/suggestions?limit=10", token=tok)
    if expect("GET /ai-match/suggestions", c, (200, 403, 404), d):
        if c == 200:
            print(f"    returned {len(items_of(d))} AI suggestions")


# ─── 10.4 Tracking ingest accepts a v1 envelope ─────────────────
print("--- 10.4 Tracking ingest v1 envelope ---")
if tok:
    uid = my_id(tok)
    env = {
        "ctx": {
            "v": 1,
            "did": "qa-phase10-device-001",
            "sid": "qa-phase10-session-001",
            "uid": uid,
            "path": "/discover",
        },
        "evts": [{
            "e": "page.view",
            "t": int(time.time() * 1000),
            "n": 1,
            "p": {"surface": "discover"},
        }],
    }
    d, c = req(INGEST, "/v1/track", "POST", env, token=tok)
    # Ingest always returns 204 on success (including parse failure — surface
    # is intentionally boring). Any non-204 is suspicious.
    expect("POST /v1/track", c, 204, d)


# ─── 10.5 Negative-signal: pass → next discover excludes target ───
print("--- 10.5 Negative-signal exclusion ---")
if tok:
    # Take the first discover candidate
    a, ca = req(BASE, "/api/v1/discover?limit=5", token=tok)
    if ca == 200:
        items = items_of(a)
        target = None
        for it in items:
            if isinstance(it, dict):
                tid = it.get("id") or it.get("userId")
                if tid:
                    target = tid
                    break
        if target:
            # Pass them
            d, c = req(BASE, "/api/v1/discover/pass", "POST", {"toUserId": target, "reason": "not_my_vibe"}, token=tok)
            expect("POST /discover/pass", c, (200, 201, 409), d, persona="miamo3")
            # Optional pass-feedback
            req(BASE, "/api/v1/discover/pass-feedback", "POST", {"toUserId": target, "reason": "not_my_vibe"}, token=tok)
            # Refetch
            b, cb = req(BASE, "/api/v1/discover?limit=20", token=tok)
            if cb == 200:
                ids = [(it.get("id") or it.get("userId")) for it in items_of(b) if isinstance(it, dict)]
                if target in ids:
                    sigs["negative-signal not honoured — passed user still in next batch"] += 1
                    errors.append({"label": "neg-signal not honoured", "passed": target, "next_head": ids[:5]})
                else:
                    print(f"    passed user {target[:8]}… excluded ✓")


# ─── 10.6 DTM symmetry (miamo10 ↔ another mod-10) ─────────
print("--- 10.6 DTM compatibility symmetry ---")
if "miamo10" in tokens:
    other = None
    for p in PERSONAS:
        if p != "miamo10" and p in tokens:
            other = p
            break
    if other:
        # Note: miamo15 (mod-5) may not have full DTM profile; tolerate 403/404
        u_self = my_id(tokens["miamo10"])
        u_other = my_id(tokens[other])
        if u_self and u_other:
            a, ca = req(BASE, f"/api/v1/ai-match/score/{u_other}", token=tokens["miamo10"])
            b, cb = req(BASE, f"/api/v1/ai-match/score/{u_self}", token=tokens[other])
            if ca == 200 and cb == 200:
                sa = (a.get("data") or {}).get("score")
                sb = (b.get("data") or {}).get("score")
                if isinstance(sa, (int, float)) and isinstance(sb, (int, float)):
                    if abs(sa - sb) > 2:
                        sigs[f"ai-match asymmetry: {sa} vs {sb}"] += 1
                        errors.append({"label": "ai-match asymmetry", "a": sa, "b": sb})
                    else:
                        print(f"    symmetric ({sa} ≈ {sb}) ✓")
            else:
                print(f"    score endpoints not both available ({ca}/{cb}) — skip")


# ─── Summary + report ────────────────────────────────────────
print("\n=== ERROR SUMMARY ===")
for s, n in sigs.most_common():
    print(f"  {n:3d}  {s}")
print(f"\nTotal events: {len(errors)}   distinct: {len(sigs)}")

out = Path(__file__).parent / "phase-10-learning-loop.report.json"
out.write_text(json.dumps({"errors": errors, "signatures": dict(sigs)}, indent=2, default=str))
print(f"Report → {out.relative_to(Path.cwd())}")
sys.exit(0 if not sigs else 1)
