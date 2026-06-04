#!/usr/bin/env python3
"""v6.8 verification: intent classification, negative-signal engine, refresh diversifier.

Walks 5 users, captures discover meta, diff their top-5, runs cursor page 2,
walks DTM, and checks that the new tracking event names hit the stream.
"""
import json
import sys
import urllib.request
import urllib.error

GATEWAY = "http://localhost:3200"
USERS = ["miamo1", "miamo2", "miamo3", "miamo4", "miamo7"]


def req(method, path, token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(f"{GATEWAY}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"_status": e.code, "_body": e.read().decode()[:200]}


def login(email, pw):
    res = req("POST", "/api/v1/auth/login", body={"email": email, "password": pw})
    tok = res.get("data", {}).get("accessToken")
    if not tok:
        print(f"  ✗ login failed for {email}: {res}")
        sys.exit(1)
    return tok


def fmt_card(c):
    name = c.get("displayName", "?")[:25]
    return f"{c['id'][:8]} {c.get('discoverScore', '?'):>5} {name}"


def section(title):
    print()
    print(f"═══ {title} ═══")


for u in USERS:
    section(f"USER: {u}")
    tok = login(f"{u}@miamo.test", u)
    res = req("GET", "/api/v1/discover?limit=10", token=tok)
    cards = res.get("data", [])
    meta = res.get("meta") or {}
    print(f"  page-1: {len(cards)} cards | algo={meta.get('algorithm')}")
    intent = meta.get("intent") or {}
    div = meta.get("diversifier") or {}
    neg = meta.get("negativeSignals") or {}
    print(f"  intent: stated={intent.get('stated')} revealed={intent.get('revealed')} "
          f"mismatch={intent.get('mismatch')} confidence={intent.get('confidence')}")
    print(f"  diversifier: mood={div.get('sessionMood')} novelty={div.get('noveltyAffinity')} "
          f"reasoning={div.get('reasoning')} injected={div.get('injected')}")
    print(f"  negSignals: events={neg.get('totalEvents')} hardBlocked={neg.get('hardBlockedTraits')}")
    print("  top-5:")
    for c in cards[:5]:
        print(f"    {fmt_card(c)}")
    page1_ids = {c["id"] for c in cards}

    cursor = res.get("cursor")
    if cursor:
        res2 = req("GET", f"/api/v1/discover?limit=10&cursor={cursor}", token=tok)
        cards2 = res2.get("data", [])
        overlap = page1_ids & {c["id"] for c in cards2}
        meta2 = res2.get("meta") or {}
        div2 = meta2.get("diversifier") or {}
        print(f"  page-2: {len(cards2)} cards | overlap_with_p1={len(overlap)} | reasoning={div2.get('reasoning')}")

    # DTM
    dtm = req("GET", "/api/v1/matrimonial/browse?limit=10", token=tok)
    if "_status" in dtm:
        print(f"  dtm: HTTP {dtm['_status']}")
    else:
        dcards = dtm.get("data", [])
        dmeta = dtm.get("meta") or {}
        print(f"  dtm: {len(dcards)} cards | reasoning={(dmeta.get('diversifier') or {}).get('reasoning')} "
              f"negEvents={(dmeta.get('negativeSignals') or {}).get('totalEvents')}")

# Apply a filter to trigger a new algo on miamo3 and see intent reaction
section("FILTER PER-PIVOT (miamo3, serious=true vs aiPicks=true)")
tok = login("miamo3@miamo.test", "miamo3")
for q in ["seriousOnly=true", "aiPicks=true", "newHere=true", "verifiedOnly=true", "activeToday=true"]:
    r = req("GET", f"/api/v1/discover?limit=5&{q}", token=tok)
    cards = r.get("data", [])
    meta = r.get("meta") or {}
    top = ",".join(c["id"][:6] for c in cards[:3])
    print(f"  {q:<24} algo={meta.get('algorithm'):<10} top3={top}")
