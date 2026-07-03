#!/usr/bin/env python3
"""
Phase 1+2 — Full endpoint sweep across every Miamo microservice.

Exercises every public route the gateway proxies (auth / users / social /
messaging / content / notifications / matrimonial / DTM / safety / search / AI)
across 6 distinct seeded personas to surface bugs that single-user happy paths
miss.

Output: scripts/qa-runs/phase-1-2-endpoint-sweep.report.json
Exit:   0 on clean run, otherwise count of distinct error signatures.
"""
from __future__ import annotations
import json, sys, time, random, urllib.request, urllib.error
from collections import Counter, defaultdict

BASE = "http://localhost:3200"
PERSONAS = ["miamo3", "miamo10", "miamo15", "miamo25", "miamo49", "miamo30"]

errors: list[dict] = []
sigs: Counter = Counter()


def req(path, method="GET", data=None, token=None, timeout=15):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=timeout)
        raw = resp.read()
        try:
            return json.loads(raw or b"{}"), resp.getcode()
        except json.JSONDecodeError:
            return {"_raw": raw[:200].decode("utf-8", "replace")}, resp.getcode()
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", "replace")
        try:
            return json.loads(body_text), e.code
        except json.JSONDecodeError:
            return {"_raw": body_text[:400]}, e.code
    except Exception as e:
        return {"_err": str(e)}, 0


def expect(persona, label, path, code, want, body):
    if isinstance(want, int):
        want = (want,)
    ok = code in want
    if not ok:
        sig = f"{label} -> {code} (want {sorted(set(want))})"
        sigs[sig] += 1
        errors.append({"persona": persona, "label": label, "path": path, "code": code, "want": list(want), "body": body})
    return ok


def login(u):
    d, c = req("/api/v1/auth/login", "POST", {"email": f"{u}@miamo.test", "password": u})
    if c == 200:
        tok = (d.get("data") or {}).get("accessToken")
        if tok:
            return tok
    sigs[f"login {u} -> {c}"] += 1
    errors.append({"persona": u, "label": "login", "path": "/auth/login", "code": c, "body": d})
    return None


def my_id(tok):
    d, _ = req("/api/v1/auth/me", token=tok)
    user = (d.get("data") or {}).get("user") or d.get("data") or {}
    return user.get("id"), user


# ─── Phase 1: Auth + Users ──────────────────────────────────────────────
print("=== Phase 1: Auth + Users (6 personas) ===")
tokens: dict[str, str] = {}
ids: dict[str, str] = {}
for p in PERSONAS:
    tok = login(p)
    if tok:
        tokens[p] = tok
        uid, _ = my_id(tok)
        if uid:
            ids[p] = uid
print(f"  logged in: {len(tokens)}/{len(PERSONAS)}")

for p, tok in tokens.items():
    # Auth
    for path in ["/api/v1/auth/me", "/api/v1/auth/sessions"]:
        d, c = req(path, token=tok); expect(p, f"GET {path}", path, c, 200, d)
    # Users / profiles
    for path in [
        "/api/v1/profiles/me",
        "/api/v1/profiles/me/completion",
        "/api/v1/settings",
        "/api/v1/settings/blocks",
    ]:
        d, c = req(path, token=tok)
        # 200 or 404 (some endpoints may legitimately not exist for sparse personas)
        expect(p, f"GET {path}", path, c, (200, 404), d)


# ─── Phase 2: Social (Discover, Matches, AI, Vibe, Safety) ──────────────
print("\n=== Phase 2: Social (discover/matches/ai/vibe) ===")
for p, tok in tokens.items():
    for path in [
        "/api/v1/discover",
        "/api/v1/discover/filters",
        "/api/v1/discover/active",
        "/api/v1/discover/new",
        "/api/v1/discover/verified",
        "/api/v1/discover/serious",
        "/api/v1/discover/ai-picks",
        "/api/v1/discover/incoming",
        "/api/v1/discover/deferred",
        "/api/v1/matches",
        "/api/v1/matches/incoming",
        "/api/v1/matches/sent",
        "/api/v1/matches/holds",
        "/api/v1/ai-match/suggestions",
        "/api/v1/vibe-check",
        "/api/v1/safety/blocked",
    ]:
        d, c = req(path, token=tok); expect(p, f"GET {path}", path, c, (200, 204, 404), d)


# Cross-user actions: miamo3 likes miamo49, then unlikes; pass; super-like; comment
print("\n  cross-user discover actions (miamo3 → miamo49)")
if "miamo3" in tokens and "miamo49" in ids:
    target_id = ids["miamo49"]
    tok = tokens["miamo3"]
    cases = [
        ("POST /discover/like", "/api/v1/discover/like", "POST", {"toUserId": target_id}, (200, 201, 409)),
        ("POST /discover/comment", "/api/v1/discover/comment", "POST", {"toUserId": target_id, "text": "hi from QA sweep"}, (200, 201, 409)),
        ("POST /discover/pass", "/api/v1/discover/pass", "POST", {"toUserId": target_id}, (200, 201, 409)),
        ("POST /discover/pass-feedback", "/api/v1/discover/pass-feedback", "POST", {"toUserId": target_id, "reason": "too_far"}, (200, 201, 409)),
        ("POST /discover/move", "/api/v1/discover/move", "POST", {"toUserId": target_id, "type": "like"}, (200, 201, 409)),
    ]
    for label, path, method, body, want in cases:
        d, c = req(path, method, body, token=tok)
        expect("miamo3", label, path, c, want, d)


# ─── Phase 3: Messaging (chats, suggestions, comm-profile) ──────────────
print("\n=== Phase 3: Messaging ===")
for p, tok in tokens.items():
    for path in ["/api/v1/messages/chats", "/api/v1/messages/chats/archived", "/api/v1/messages/backgrounds"]:
        d, c = req(path, token=tok); expect(p, f"GET {path}", path, c, (200, 404), d)


# ─── Phase 4: Content (feed/stories/videos/creativity/matrimonial/defer) ─
print("\n=== Phase 4: Content ===")
for p, tok in tokens.items():
    for path in [
        "/api/v1/feed",
        "/api/v1/feed?limit=10",
        "/api/v1/stories",
        "/api/v1/videos",
        "/api/v1/creativity/feed",
        "/api/v1/creativity/categories",
        "/api/v1/creativity/spotlight",
        "/api/v1/creativity/vault",
        "/api/v1/creativity/trending/live",
        "/api/v1/matrimonial/profile",
        "/api/v1/matrimonial/browse",
        "/api/v1/matrimonial/templates",
        "/api/v1/defer/discover",
        "/api/v1/defer/dtm",
    ]:
        d, c = req(path, token=tok); expect(p, f"GET {path}", path, c, (200, 204, 404), d)


# ─── Phase 5: Notifications ─────────────────────────────────────────────
print("\n=== Phase 5: Notifications ===")
for p, tok in tokens.items():
    d, c = req("/api/v1/notifications", token=tok); expect(p, f"GET /notifications", "/api/v1/notifications", c, 200, d)
    d, c = req("/api/v1/notifications/unread-count", token=tok); expect(p, f"GET /notifications/unread-count", "/api/v1/notifications/unread-count", c, (200, 404), d)


# ─── Phase 6: Search ────────────────────────────────────────────────────
print("\n=== Phase 6: Search ===")
for p, tok in tokens.items():
    d, c = req("/api/v1/search?q=miamo&type=name", token=tok); expect(p, "search by name", "/api/v1/search", c, 200, d)
    d, c = req("/api/v1/search?q=Mumbai&type=city", token=tok); expect(p, "search by city", "/api/v1/search", c, 200, d)
    d, c = req("/api/v1/search?q=miamo10&type=miamoId", token=tok); expect(p, "search by miamoId", "/api/v1/search", c, 200, d)


# ─── Phase 7: Vibe Check + Premium + Settings PATCH round-trips ─────────
print("\n=== Phase 7: Settings round-trips ===")
if "miamo3" in tokens:
    tok = tokens["miamo3"]
    # Update settings (PUT — service uses PUT not PATCH)
    payload = {"theme": "dark", "notificationsEnabled": True}
    d, c = req("/api/v1/settings", "PUT", payload, token=tok)
    expect("miamo3", "PUT /settings dark", "/api/v1/settings", c, (200, 204), d)
    payload = {"theme": "system"}
    d, c = req("/api/v1/settings", "PUT", payload, token=tok)
    expect("miamo3", "PUT /settings system", "/api/v1/settings", c, (200, 204), d)


# ─── Phase 8: Profile PUT round-trip ────────────────────────────────────
print("\n=== Phase 8: Profile PUT ===")
if "miamo3" in tokens:
    tok = tokens["miamo3"]
    d, c = req("/api/v1/profiles/me", "PUT", {"bio": "QA sweep round-trip 2026"}, token=tok)
    expect("miamo3", "PUT /profiles/me bio", "/api/v1/profiles/me", c, (200, 204), d)


# ─── Phase 9: Auth no-token must 401 ────────────────────────────────────
print("\n=== Phase 9: Auth gating sanity ===")
for path in ["/api/v1/auth/me", "/api/v1/discover", "/api/v1/matches", "/api/v1/feed", "/api/v1/notifications", "/api/v1/creativity/spotlight"]:
    d, c = req(path)  # no token
    expect("anon", f"unauth {path}", path, c, 401, d)


# ─── Summary ────────────────────────────────────────────────────────────
print("\n=== ERROR SUMMARY ===")
for s, n in sigs.most_common(40):
    print(f"  {n:>4}  {s}")
print(f"\nTotal error events: {len(errors)}   distinct signatures: {len(sigs)}")

with open("scripts/qa-runs/phase-1-2-endpoint-sweep.report.json", "w") as f:
    json.dump({"signatures": dict(sigs), "errors": errors[:300]}, f, indent=2, default=str)
print("Report → scripts/qa-runs/phase-1-2-endpoint-sweep.report.json")
sys.exit(min(len(sigs), 250))
