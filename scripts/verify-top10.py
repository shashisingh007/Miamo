#!/usr/bin/env python3
"""Verify v6.7 top-10 refresh contract on Discover + DTM."""
import json
import sys
import urllib.request

GW = 'http://localhost:3200'
ING = 'http://localhost:3260'


def post(path, body, token=None):
    req = urllib.request.Request(GW + path, data=json.dumps(body).encode(),
                                  headers={'Content-Type': 'application/json',
                                           **({'Authorization': f'Bearer {token}'} if token else {})})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def get(host, path, token=None, raw=False):
    req = urllib.request.Request(host + path,
                                  headers={'Authorization': f'Bearer {token}'} if token else {})
    with urllib.request.urlopen(req) as r:
        body = r.read()
        return body.decode() if raw else json.loads(body)


def login(user):
    r = post('/api/v1/auth/login', {'email': f'{user}@miamo.test', 'password': user})
    return r.get('accessToken') or r.get('data', {}).get('accessToken') or r.get('token') or r['data']['token']


def main():
    user = sys.argv[1] if len(sys.argv) > 1 else 'miamo3'
    tok = login(user)
    print(f'== {user} logged in ==')

    # Page 1
    p1 = get(GW, '/api/v1/discover?limit=10', tok)
    d1 = p1['data']
    print(f'\nDiscover page 1: {len(d1)} cards, batchSize={p1.get("batchSize")}, cursor={(p1.get("cursor") or "")[:8]}')
    for i, p in enumerate(d1[:5]):
        print(f'  #{i+1}  {p["id"][:8]}  score={p.get("discoverScore"):.1f}  {p.get("displayName","?")}')

    # Page 2 via cursor — simulates user consuming all 10 + auto-refresh
    cur = p1.get('cursor')
    if cur:
        p2 = get(GW, f'/api/v1/discover?limit=10&cursor={cur}', tok)
        d2 = p2['data']
        print(f'\nDiscover page 2 (after cursor): {len(d2)} cards, batchSize={p2.get("batchSize")}')
        for i, p in enumerate(d2[:5]):
            print(f'  #{i+1}  {p["id"][:8]}  score={p.get("discoverScore"):.1f}  {p.get("displayName","?")}')
        overlap = {p['id'] for p in d1} & {p['id'] for p in d2}
        print(f'\nOverlap between page1 & page2: {len(overlap)} (should be 0 \u2014 cursor advances)')

    # DTM
    dtm = get(GW, '/api/v1/matrimonial/browse?limit=10', tok)
    dd = dtm['data']
    print(f'\nDTM browse: {len(dd)} profiles, batchSize={dtm.get("batchSize")}')
    for i, p in enumerate(dd[:5]):
        score = p.get('dtmScore')
        print(f'  #{i+1}  {p.get("userId","")[:8]}  dtmScore={score}  {p.get("fullName","?")}')

    # Ingest counters
    metrics = get(ING, '/metrics', raw=True)
    counters = [l for l in metrics.splitlines() if l.startswith(('events_', 'requests_'))]
    print('\nIngest counters:')
    for c in counters[:8]:
        print(f'  {c}')


if __name__ == '__main__':
    main()
