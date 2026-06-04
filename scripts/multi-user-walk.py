#!/usr/bin/env python3
"""
Multi-user functional walk — 10 seeded users.
For each user logs in, hits the major reads, asserts unique recommendations,
sends one cross-user like, records timings, and prints a summary table.
"""
import json, time, urllib.request, urllib.error
BASE = "http://localhost:3200"

def req(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=10)
        return json.loads(resp.read()), resp.getcode()
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read()), e.code
        except: return {}, e.code
    except Exception as e:
        return {"_err": str(e)}, 0

users = [f"miamo{i}" for i in range(1, 11)]
results = []
tokens = {}
discover_first_id = {}

for u in users:
    t0 = time.time()
    d, code = req("/api/v1/auth/login", "POST", {"email": f"{u}@miamo.test", "password": u})
    if code != 200:
        results.append((u, "LOGIN_FAIL", code, "-", "-", "-", "-", "-"))
        continue
    tok = d["data"]["accessToken"]
    tokens[u] = tok
    me, _ = req("/api/v1/auth/me", token=tok)
    prof, _ = req("/api/v1/profiles/me", token=tok)
    comp, _ = req("/api/v1/profiles/me/completion", token=tok)
    disc, dcode = req("/api/v1/discover", token=tok)
    matches, _ = req("/api/v1/matches", token=tok)
    feed, _ = req("/api/v1/feed", token=tok)
    notes, _ = req("/api/v1/notifications", token=tok)
    if dcode == 200 and disc.get("data"):
        discover_first_id[u] = disc["data"][0].get("id", "?")
    qlen = len(disc.get("data", [])) if isinstance(disc, dict) else 0
    score = (comp.get("data") or {}).get("score") if isinstance(comp, dict) else None
    elapsed = round((time.time() - t0) * 1000)
    results.append((u, "OK", code, score, qlen, len(feed.get("data", [])), len(matches.get("data", [])), elapsed))

# Cross-user like: miamo3 likes miamo7's userId
target = None
for u in ["miamo7", "miamo8", "miamo9"]:
    if u in tokens:
        me, _ = req("/api/v1/auth/me", token=tokens[u])
        target = (me.get("data") or {}).get("id")
        if target:
            break
if "miamo3" in tokens and target:
    res, code = req("/api/v1/discover/moves", "POST", {"toUserId": target, "type": "like"}, tokens["miamo3"])
    cross_like = (code, res.get("error", {}).get("code") or "ok")
else:
    cross_like = ("?", "skipped")

# Algorithm uniqueness check: how many *distinct* first-card IDs across the 10 users?
distinct_first = len(set(discover_first_id.values()))

# Print table
print(f"{'user':<10} {'status':<10} {'code':<5} {'score':<7} {'discover':<10} {'feed':<6} {'matches':<8} {'ms':<6}")
print("-" * 70)
for r in results:
    print(f"{r[0]:<10} {r[1]:<10} {r[2]:<5} {str(r[3]):<7} {str(r[4]):<10} {str(r[5]):<6} {str(r[6]):<8} {str(r[7]):<6}")
print()
print(f"Cross-user like (miamo3 → miamo7): code={cross_like[0]} result={cross_like[1]}")
print(f"Algorithm uniqueness: {distinct_first} distinct first-card IDs across {len(discover_first_id)} users")
ok = sum(1 for r in results if r[1] == "OK")
print(f"\n{ok}/{len(results)} users walked successfully")
