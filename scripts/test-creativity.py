import urllib.request, json

def fetch(url, data=None, headers=None):
    headers = headers or {}
    if data:
        data = json.dumps(data).encode()
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())

# Login
print("=== LOGIN ===")
r = fetch('http://localhost:3200/api/v1/auth/login', {'email':'miamo1@miamo.test','password':'Miamo@12345'})
print(f"Login response keys: {list(r.keys())}")
data = r.get('data', r)
print(f"Data keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}")
token = data.get('token', '') or data.get('accessToken', '') or ''
if not token:
    print(f"Full response: {json.dumps(r, indent=2)[:500]}")
    exit()
user = data.get('user', {})
print(f"User: {user.get('displayName', '?')}")
print(f"Token: {token[:30]}...")

# Creativity Feed
print("\n=== CREATIVITY FEED ===")
req = urllib.request.Request('http://localhost:3200/api/v1/creativity/feed')
req.add_header('Authorization', f'Bearer {token}')
with urllib.request.urlopen(req, timeout=10) as resp:
    r2 = json.loads(resp.read())
items = r2.get('data', [])
print(f"Items: {len(items)}")
for i in items[:5]:
    cat = i.get('category', {}).get('name', '?')
    title = i.get('title', '?')
    author = i.get('author', {}).get('displayName', '?')
    views = i.get('views', 0)
    print(f"  [{cat}] {title} by {author} ({views} views)")
meta = r2.get('meta', {})
if meta:
    print(f"Meta: algo={meta.get('algorithm','?')}, total={meta.get('total','?')}")
