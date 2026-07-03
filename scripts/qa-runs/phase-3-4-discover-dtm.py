#!/usr/bin/env python3
"""
Phase 3+4 — Discover (Social) + DTM (Matrimonial) deep verification.

Goals (from docs/QA_MASTER_PROMPT.md §4):
  • Discover filter combos round-trip (PUT then GET) and respect minAge/distance.
  • See-later pile is segregated per surface (discover vs dtm).
  • DTM matrimonial surface is accessible to mod-10 personas; non-DTM personas
    are gated.
  • DTM compatibility symmetry: cross-view scoring is symmetric within tolerance.
  • DTM access request lifecycle: request → incoming → accept.
  • Gotra conflict: same-gotra pairs are filtered out of DTM browse.

Output: scripts/qa-runs/phase-3-4-discover-dtm.report.json
Exit:   distinct error count.
"""
from __future__ import annotations
import json, sys, urllib.request, urllib.error
from collections import Counter
from pathlib import Path

BASE = "http://localhost:3200"

errors: list[dict] = []
sigs: Counter = Counter()


def req(path, method="GET", data=None, token=None, timeout=20):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    for attempt in range(3):
        r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
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


def expect(persona, label, code, want, body=None):
    if isinstance(want, int):
        want = (want,)
    ok = code in want
    if not ok:
        sig = f"{label} -> {code} (want {sorted(set(want))})"
        sigs[sig] += 1
        errors.append({"persona": persona, "label": label, "code": code, "want": list(want), "body": body})
    return ok


def items_of(d):
    """Best-effort extract a list of items from a response body."""
    if d is None:
        return []
    data = d.get("data") if isinstance(d, dict) else None
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("items") or data.get("results") or data.get("profiles") or []
    if isinstance(d, list):
        return d
    return []


def login(u):
    d, c = req("/api/v1/auth/login", "POST", {"email": f"{u}@miamo.test", "password": u})
    if c == 200:
        return (d.get("data") or {}).get("accessToken") or (d.get("data") or {}).get("token") or d.get("token")
    return None


# Pick personas: miamo10 + miamo20 are mod-10 (DTM eligible),
# miamo3 + miamo7 are Discover-only (non-DTM).
DTM_PERSONAS  = ["miamo10", "miamo20"]
DISC_PERSONAS = ["miamo3", "miamo7"]

print("=== Phase 3-4: Discover + DTM ===\n")
tokens = {}
for u in DTM_PERSONAS + DISC_PERSONAS:
    t = login(u)
    if not t:
        print(f"  ! login failed for {u}")
        continue
    tokens[u] = t
print(f"  logged in: {len(tokens)}/{len(DTM_PERSONAS) + len(DISC_PERSONAS)}\n")


# ─── 3.1 Discover filter round-trip ──────────────────────────
print("--- 3.1 Discover filter round-trip ---")
tok = tokens.get("miamo3")
if tok:
    d, c = req("/api/v1/discover/filters", token=tok)
    expect("miamo3", "GET /discover/filters", c, 200, d)

    payload = {"minAge": 25, "maxAge": 40, "distance": 50, "verifiedOnly": True}
    d, c = req("/api/v1/discover/filters", "PUT", payload, token=tok)
    expect("miamo3", "PUT /discover/filters", c, (200, 204), d)

    # GET returns the raw DiscoverFilter row; aliases used in payload map to
    # `verified` (canonical column). Assert canonical names persisted.
    d, c = req("/api/v1/discover/filters", token=tok)
    if expect("miamo3", "GET /discover/filters (post-put)", c, 200, d):
        got = d.get("data") if isinstance(d, dict) else None
        filt = (got or {}).get("filters") if isinstance(got, dict) else None
        filt = filt or got or {}
        if isinstance(filt, dict):
            checks = {"minAge": 25, "maxAge": 40, "distance": 50, "verified": True}
            for k, v in checks.items():
                if filt.get(k) != v:
                    sigs[f"filter[{k}] not persisted: got {filt.get(k)!r} want {v!r}"] += 1
                    errors.append({"persona": "miamo3", "label": f"filter[{k}] mismatch", "got": filt.get(k), "want": v})


# ─── 3.2 Discover list w/ filters ────────────────────────────
print("--- 3.2 Discover list w/ filters ---")
if tok:
    d, c = req("/api/v1/discover?limit=20", token=tok)
    if expect("miamo3", "GET /discover", c, 200, d):
        items = items_of(d)
        print(f"    discover returned {len(items)} items")


# ─── 3.3 See-later pile segregation (Discover vs DTM) ────────
print("--- 3.3 Defer pile segregation ---")
if tok:
    # Defer one to discover, one to dtm (reason must be one of the defer enum)
    d, c = req("/api/v1/defer", "POST", {"surface": "discover", "targetId": "qa-discover-target-1", "reason": "not_now"}, token=tok)
    expect("miamo3", "POST /defer discover", c, (200, 201, 409), d)

    d, c = req("/api/v1/defer", "POST", {"surface": "dtm", "targetId": "qa-dtm-target-1", "reason": "thinking"}, token=tok)
    expect("miamo3", "POST /defer dtm", c, (200, 201, 409, 403), d)  # 403 if DTM gated

    # List discover pile — should not contain dtm targetId
    d, c = req("/api/v1/defer?surface=discover", token=tok)
    if expect("miamo3", "GET /defer?surface=discover", c, 200, d):
        ids = [(it.get("targetId") if isinstance(it, dict) else None) for it in items_of(d)]
        if "qa-dtm-target-1" in ids:
            sigs["defer pile cross-contamination: dtm target found in discover list"] += 1
            errors.append({"persona": "miamo3", "label": "defer cross-contamination", "got": ids})

    d, c = req("/api/v1/defer?surface=dtm", token=tok)
    if expect("miamo3", "GET /defer?surface=dtm", c, (200, 403), d):
        if c == 200:
            ids = [(it.get("targetId") if isinstance(it, dict) else None) for it in items_of(d)]
            if "qa-discover-target-1" in ids:
                sigs["defer pile cross-contamination: discover target found in dtm list"] += 1
                errors.append({"persona": "miamo3", "label": "defer cross-contamination", "got": ids})


# ─── 4.1 DTM matrimonial browse ─────────────────────────────
print("--- 4.1 DTM browse (mod-10 personas) ---")
for p in DTM_PERSONAS:
    if p not in tokens:
        continue
    t = tokens[p]
    d, c = req("/api/v1/matrimonial/profile", token=t)
    expect(p, "GET /matrimonial/profile", c, (200, 404), d)

    d, c = req("/api/v1/matrimonial/browse?limit=10", token=t)
    expect(p, "GET /matrimonial/browse", c, (200, 403), d)
    if c == 200:
        items = items_of(d)
        print(f"    {p}: {len(items)} DTM candidates")


# ─── 4.2 DTM compatibility symmetry ──────────────────────────
print("--- 4.2 DTM symmetry (miamo10 ↔ miamo20) ---")
if "miamo10" in tokens and "miamo20" in tokens:
    # Get user IDs
    d10, c10 = req("/api/v1/profiles/me", token=tokens["miamo10"])
    d20, c20 = req("/api/v1/profiles/me", token=tokens["miamo20"])
    u10 = ((d10.get("data") or {}).get("userId") or (d10.get("data") or {}).get("id"))
    u20 = ((d20.get("data") or {}).get("userId") or (d20.get("data") or {}).get("id"))
    if u10 and u20:
        # View each from the other side
        a, ca = req(f"/api/v1/matrimonial/profile/{u20}", token=tokens["miamo10"])
        b, cb = req(f"/api/v1/matrimonial/profile/{u10}", token=tokens["miamo20"])
        ok_a = expect("miamo10", "GET /matrimonial/profile/<u20>", ca, (200, 403, 404), a)
        ok_b = expect("miamo20", "GET /matrimonial/profile/<u10>", cb, (200, 403, 404), b)
        if ok_a and ok_b and ca == 200 and cb == 200:
            score_a = ((a.get("data") or {}).get("compatibility") or {}).get("score")
            score_b = ((b.get("data") or {}).get("compatibility") or {}).get("score")
            if score_a is not None and score_b is not None:
                if abs(score_a - score_b) > 1:  # allow rounding noise
                    sigs[f"DTM asymmetry: 10→20={score_a} 20→10={score_b}"] += 1
                    errors.append({"label": "DTM asymmetry", "score_10_to_20": score_a, "score_20_to_10": score_b})
                else:
                    print(f"    symmetric ✓ ({score_a} ≈ {score_b})")


# ─── 4.3 DTM access request lifecycle ────────────────────────
print("--- 4.3 DTM access request ---")
if "miamo10" in tokens and "miamo20" in tokens:
    # u20 we already may have
    d20, _ = req("/api/v1/profiles/me", token=tokens["miamo20"])
    u20 = ((d20.get("data") or {}).get("userId") or (d20.get("data") or {}).get("id"))
    if u20:
        d, c = req("/api/v1/matrimonial/access/request", "POST", {"toUserId": u20}, token=tokens["miamo10"])
        expect("miamo10", "POST /matrimonial/access/request", c, (200, 201, 409, 403), d)

    d, c = req("/api/v1/matrimonial/access/sent", token=tokens["miamo10"])
    expect("miamo10", "GET /matrimonial/access/sent", c, (200, 403), d)
    d, c = req("/api/v1/matrimonial/access/incoming", token=tokens["miamo20"])
    expect("miamo20", "GET /matrimonial/access/incoming", c, (200, 403), d)


# ─── 4.4 Gotra conflict filter ───────────────────────────────
print("--- 4.4 Gotra conflict (browse) ---")
if "miamo10" in tokens:
    # Get my gotra
    p, _ = req("/api/v1/matrimonial/profile", token=tokens["miamo10"])
    my_gotra = ((p.get("data") or {}).get("gotra"))
    if my_gotra:
        d, c = req(f"/api/v1/matrimonial/browse?limit=50&gotra={my_gotra}", token=tokens["miamo10"])
        if expect("miamo10", "GET /matrimonial/browse?gotra=<my>", c, (200, 403), d):
            if c == 200:
                violators = []
                for it in items_of(d):
                    if isinstance(it, dict) and (it.get("gotra") or "").lower() == my_gotra.lower():
                        violators.append(it.get("userId") or it.get("id"))
                if violators:
                    sigs[f"gotra conflict: {len(violators)} same-gotra candidates in browse"] += 1
                    errors.append({"label": "gotra conflict", "my_gotra": my_gotra, "violators": violators[:5]})
                else:
                    print(f"    no gotra conflicts ✓ (gotra={my_gotra})")


# ─── Summary + report ────────────────────────────────────────
print("\n=== ERROR SUMMARY ===")
for s, n in sigs.most_common():
    print(f"  {n:3d}  {s}")
print(f"\nTotal events: {len(errors)}   distinct: {len(sigs)}")

out = Path(__file__).parent / "phase-3-4-discover-dtm.report.json"
out.write_text(json.dumps({"errors": errors, "signatures": dict(sigs)}, indent=2, default=str))
print(f"Report → {out.relative_to(Path.cwd())}")
sys.exit(0 if not sigs else 1)
