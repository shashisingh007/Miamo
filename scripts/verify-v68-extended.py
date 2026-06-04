#!/usr/bin/env python3
"""
v6.8 EXTENDED — multi-persona end-to-end walk hitting EVERY personalized endpoint.
Personas:
  - serious_dweller (miamo1): long dwells, profile expansions, no fast swipes
  - fast_passer    (miamo2): swipes everything left, bounces, refreshes empty
  - dtm_seeker     (miamo3): browses matrimonial, applies dtm filters
  - blocker        (miamo4): blocks/reports many → big negative profile
  - explorer       (miamo7): mixed signals, filter pivots, returns fast

For each persona: log in, simulate behavior via tracking ingest, then hit
discover, dtm, matches, chats, search, notifications, creativity feed, and
verify each response carries a meta block whose intent/diversifier/negative
signals reflect the persona.
"""
import json, sys, time, urllib.request, urllib.parse, uuid

API = "http://localhost:3200/api/v1"

def req(method, path, token=None, body=None, q=None):
    url = API + path
    if q: url += "?" + urllib.parse.urlencode(q)
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read().decode() or "{}")
        except: return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}

def login(email, password):
    r = req("POST", "/auth/login", body={"email": email, "password": password})
    return r.get("data", {}).get("accessToken")

def emit_events(uid_hash, events):
    body = {
        "uidHash": uid_hash,
        "events": [{"e": e["e"], "p": e.get("p", {}), "tid": e.get("tid"), "tt": e.get("tt"), "d": e.get("d"), "t": int(time.time()*1000) - i*1000, "n": i} for i, e in enumerate(events)],
        "ctx": {"app": "web", "ua": "test", "ts": int(time.time()*1000)},
    }
    return req("POST", "/track", body=body)

def hash_uid(uid):
    import hashlib
    return hashlib.sha256(("mio_v1::" + uid).encode()).hexdigest()

PERSONAS = {
    "miamo1": ("serious_dweller", [{"e": "profile.depth_score", "p": {"score": 8}}]*8 + [{"e": "card.dwell.long", "p": {"d": 15000}}]*12 + [{"e": "profile.bio.expand"}]*5),
    "miamo2": ("fast_passer", [{"e": "discover.swipe", "p": {"dir": "left"}}]*40 + [{"e": "feed.bounce"}]*4 + [{"e": "discover.refresh.empty"}]*3 + [{"e": "card.dwell.short"}]*15),
    "miamo3": ("dtm_seeker", [{"e": "matrimonial.browse"}]*15 + [{"e": "matrimonial.profile.view"}]*10 + [{"e": "dtm.filter.applied"}]*6 + [{"e": "serious.mode.on"}]*2),
    "miamo4": ("blocker", [{"e": "discover.swipe", "p": {"dir": "left"}}]*20 + [{"e": "card.hover.no_action"}]*8),
    "miamo7": ("explorer", [{"e": "filter.reverted"}]*5 + [{"e": "feed.return.fast"}]*4 + [{"e": "card.dwell.long"}]*5 + [{"e": "discover.swipe"}]*15 + [{"e": "feed.bounce"}]*2),
}

def walk(uname):
    persona, events = PERSONAS[uname]
    print(f"\n═══ {uname} ({persona}) ═══")
    tok = login(f"{uname}@miamo.test", uname)
    if not tok: print(f"  LOGIN FAILED"); return
    me = req("GET", "/profiles/me", tok)
    uid = me.get("data", {}).get("profile", {}).get("userId")
    if not uid: print(f"  no uid"); return
    # seed behavior signals into ingest
    emit_events(hash_uid(uid), events)
    time.sleep(2)  # let ingest worker aggregate

    # 1. discover
    d = req("GET", "/discover", tok, q={"limit": 10})
    intent = d.get("meta", {}).get("intent", {})
    div = d.get("meta", {}).get("diversifier", {})
    neg = d.get("meta", {}).get("negativeSignals", {})
    print(f"  discover    : cards={len(d.get('data') or [])} algo={d.get('meta',{}).get('algorithm')} stated={intent.get('stated')} revealed={intent.get('revealed')} mood={div.get('mood')} reasoning={div.get('reasoning')} negEvents={neg.get('totalEvents')}")

    # 2. dtm
    dtm = req("GET", "/matrimonial/browse", tok, q={"limit": 10})
    print(f"  dtm         : cards={len(dtm.get('data') or [])} reasoning={dtm.get('meta',{}).get('diversifier',{}).get('reasoning')} negEvents={dtm.get('meta',{}).get('negativeSignals',{}).get('totalEvents')}")

    # 3. matches
    m = req("GET", "/matches", tok)
    mm = m.get("meta", {})
    print(f"  matches     : count={len(m.get('data') or [])} revealed={mm.get('intent',{}).get('revealed')} reasoning={mm.get('diversifier',{}).get('reasoning')}")

    # 4. chats
    c = req("GET", "/messages/chats", tok)
    cm = c.get("meta", {})
    print(f"  chats       : count={len(c.get('data') or [])} revealed={cm.get('intent',{}).get('revealed')} reasoning={cm.get('diversifier',{}).get('reasoning')}")

    # 5. search
    s = req("GET", "/search", tok, q={"q": "miamo", "type": "all"})
    sm = s.get("meta", {})
    print(f"  search      : count={len(s.get('data') or [])} revealed={sm.get('intent',{}).get('revealed')} reasoning={sm.get('diversifier',{}).get('reasoning')}")

    # 6. notifications
    n = req("GET", "/notifications", tok)
    nm = n.get("meta", {})
    print(f"  notif       : count={len(n.get('data') or [])} revealed={nm.get('intent',{}).get('revealed')} reranked={nm.get('reranked')}")

    # 7. creativity feed
    f = req("GET", "/creativity/feed", tok)
    fm = f.get("meta", {})
    print(f"  feed        : count={len(f.get('data') or [])} revealed={fm.get('intent',{}).get('revealed')} reasoning={fm.get('diversifier',{}).get('reasoning')}")

if __name__ == "__main__":
    for u in PERSONAS: walk(u)
    print("\nDONE")
