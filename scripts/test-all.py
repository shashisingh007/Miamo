import json, urllib.request, urllib.error

BASE = "http://localhost:3200"

def req(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=10)
        return json.loads(resp.read()), resp.getcode()
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read()), e.code
        except:
            return {}, e.code

# Login
d, _ = req("/api/v1/auth/login", "POST", {"email":"miamo1@miamo.test","password":"miamo1"})
token = d["data"]["accessToken"]

# Discover a valid user ID for DTM tests (first profile in discover results)
disc, _ = req("/api/v1/discover", "GET", None, token)
dtm_recipient = disc["data"][0]["id"] if disc.get("data") else "unknown"

tests = [
    ("Gateway Health", "GET", "/health", None, None),
    ("Discover (AI sorted)", "GET", "/api/v1/discover", None, token),
    ("AI Match Suggestions", "GET", "/api/v1/ai-match/suggestions", None, token),
    ("Vibe Save", "POST", "/api/v1/vibe-check", {"mood":"flirty","energy":5,"topics":["Travel plans"],"intent":"Romance"}, token),
    ("Vibe History", "GET", "/api/v1/vibe-check", None, token),
    ("Vibe Latest", "GET", "/api/v1/vibe-check/latest", None, token),
    ("Vibe Matches", "GET", "/api/v1/vibe-check/matches", None, token),
    ("DTM Chat Send", "POST", "/api/v1/matrimonial/chat/send", {"recipientId": dtm_recipient, "message":"Test persistent","type":"text"}, token),
    ("DTM Messages", "GET", "/api/v1/matrimonial/chat/" + dtm_recipient, None, token),
    ("DTM Chat List", "GET", "/api/v1/matrimonial/chat", None, token),
    ("Matches", "GET", "/api/v1/matches", None, token),
    ("Incoming", "GET", "/api/v1/matches/incoming", None, token),
    ("Messages", "GET", "/api/v1/messages/chats", None, token),
    ("Feed", "GET", "/api/v1/feed", None, token),
    ("Creativity", "GET", "/api/v1/creativity/feed", None, token),
    ("Notifications", "GET", "/api/v1/notifications", None, token),
    ("Settings", "GET", "/api/v1/settings", None, token),
    ("Profile", "GET", "/api/v1/profiles/me", None, token),
    ("Safety Tips", "GET", "/api/v1/safety/tips", None, token),
]

passed = 0
failed = 0
for name, method, path, data, tk in tests:
    d, code = req(path, method, data, tk)
    status = "PASS" if code < 400 else "FAIL"
    if status == "PASS":
        passed += 1
    else:
        failed += 1
    extra = ""
    if "data" in d:
        if isinstance(d["data"], list):
            extra = " (" + str(len(d["data"])) + " items)"
        elif isinstance(d["data"], dict) and "id" in d["data"]:
            extra = " (created)"
    sym = "v" if status == "PASS" else "x"
    print(sym + " " + name + ": " + str(code) + extra)

print("")
print(str(passed) + "/" + str(passed + failed) + " passed, " + str(failed) + " failed")
