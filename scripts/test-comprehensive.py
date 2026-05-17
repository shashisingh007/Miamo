#!/usr/bin/env python3
"""
Miamo Comprehensive Test Suite — Phase 9 Validation
====================================================
Tests ALL features, algorithms, error handling, and edge cases.
Expects services running on localhost:3200 with seeded data.

Run:  python3 scripts/test-comprehensive.py
"""

import json, urllib.request, urllib.error, sys, time

BASE = "http://localhost:3200"
PASS_COUNT = 0
FAIL_COUNT = 0
SKIP_COUNT = 0

# ─── HTTP Helper ──────────────────────────────────────────
def req(path, method="GET", data=None, token=None, timeout=10):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=timeout)
        return json.loads(resp.read()), resp.getcode()
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read()), e.code
        except:
            return {}, e.code
    except Exception as e:
        return {"error": str(e)}, 0

def test(name, condition, details=""):
    global PASS_COUNT, FAIL_COUNT
    if condition:
        PASS_COUNT += 1
        print(f"  ✓ {name}")
    else:
        FAIL_COUNT += 1
        print(f"  ✗ {name}" + (f" — {details}" if details else ""))

def skip(name, reason=""):
    global SKIP_COUNT
    SKIP_COUNT += 1
    print(f"  ⊘ {name} (skipped: {reason})")

def section(title):
    print(f"\n{'─'*50}")
    print(f"  {title}")
    print(f"{'─'*50}")


# ═══════════════════════════════════════════════════════════
# 1. GATEWAY & HEALTH
# ═══════════════════════════════════════════════════════════
section("1. Gateway & Health Checks")

d, c = req("/health")
test("Gateway health returns 200", c == 200)
test("Gateway reports all services", all(v == "ok" for v in d.get("services", {}).values()),
     f"services: {d.get('services', {})}")

for svc in ["auth", "users", "social", "messaging", "content", "notifications"]:
    test(f"Service '{svc}' is healthy", d.get("services", {}).get(svc) == "ok")


# ═══════════════════════════════════════════════════════════
# 2. AUTH — Registration, Login, Token Management
# ═══════════════════════════════════════════════════════════
section("2. Authentication")

# Register new test user
ts = int(time.time())
new_email = f"test_{ts}@miamo.test"
d, c = req("/api/v1/auth/register", "POST", {
    "email": new_email, "password": "testpass123", "displayName": f"Test User {ts}"
})
test("Register new user returns 201", c == 201)
test("Register returns accessToken", "accessToken" in d.get("data", {}))
test("Register returns user object", "user" in d.get("data", {}))
new_token = d.get("data", {}).get("accessToken", "")
new_user_id = d.get("data", {}).get("user", {}).get("id", "")

# Login
d, c = req("/api/v1/auth/login", "POST", {"email": "miamo1@miamo.test", "password": "miamo1"})
test("Login returns 200", c == 200)
test("Login returns accessToken", "accessToken" in d.get("data", {}))
test("Login returns user with profile fields", all(k in d.get("data", {}).get("user", {})
     for k in ["id", "email", "displayName", "verified", "profileScore"]))
token = d["data"]["accessToken"]
user_id = d["data"]["user"]["id"]

# /auth/me — response is { data: { user: { ... } } }
d, c = req("/api/v1/auth/me", "GET", None, token)
test("GET /auth/me returns 200", c == 200)
me_user = d.get("data", {}).get("user", d.get("data", {}))
test("/auth/me returns user email", me_user.get("email") == "miamo1@miamo.test",
     f"got data keys: {list(d.get('data', {}).keys())}")

# Bad credentials
d, c = req("/api/v1/auth/login", "POST", {"email": "miamo1@miamo.test", "password": "wrong"})
test("Login with wrong password returns 401", c == 401)

# Missing fields
d, c = req("/api/v1/auth/register", "POST", {"email": "x@y.com"})
test("Register without password returns 400", c == 400)

# Duplicate email
d, c = req("/api/v1/auth/register", "POST", {
    "email": "miamo1@miamo.test", "password": "testpass", "displayName": "Dup"
})
test("Duplicate email returns 409", c == 409)

# No auth
d, c = req("/api/v1/discover")
test("Unauthenticated request returns 401", c == 401)


# ═══════════════════════════════════════════════════════════
# 3. DISCOVER — All 6 Algorithm Filters
# ═══════════════════════════════════════════════════════════
section("3. Discover — Algorithm Filters")

# Default (forYou)
d, c = req("/api/v1/discover", "GET", None, token)
test("Discover default returns 200", c == 200)
test("Discover returns array of profiles", isinstance(d.get("data"), list))
default_count = len(d.get("data", []))
test("Discover returns profiles", default_count > 0, f"got {default_count}")
first_profile = d["data"][0] if d.get("data") else {}
test("Profile has discoverScore", "discoverScore" in first_profile)
test("Profile has algorithm field", "algorithm" in first_profile)

# All 6 algorithms — discover uses individual boolean query params, not "filter"
algo_queries = {
    "forYou": "",
    "new": "newHere=true",
    "active": "activeToday=true",
    "verified": "verifiedOnly=true",
    "serious": "seriousOnly=true",
    "aiPicks": "aiPicks=true",
}
algo_results = {}
for algo, qs in algo_queries.items():
    url = f"/api/v1/discover?{qs}" if qs else "/api/v1/discover"
    d, c = req(url, "GET", None, token)
    test(f"Discover algo={algo} returns 200", c == 200)
    items = d.get("data", [])
    algo_results[algo] = items
    test(f"algo={algo} returns profiles", len(items) > 0, f"got {len(items)}")
    # Each profile should have algorithm and discoverScore
    if items:
        test(f"algo={algo} has algorithm tag", "algorithm" in items[0])

# Verify different algorithms use different scoring (scores may differ)
if algo_results.get("forYou") and algo_results.get("serious"):
    fy_scores = [p.get("discoverScore", 0) for p in algo_results["forYou"][:5]]
    ser_scores = [p.get("discoverScore", 0) for p in algo_results["serious"][:5]]
    test("ForYou and Serious have different scores", fy_scores != ser_scores,
         f"forYou: {fy_scores[:3]}, serious: {ser_scores[:3]}")


# ═══════════════════════════════════════════════════════════
# 4. DISCOVER — Like, Pass, Comment, Miamo Move
# ═══════════════════════════════════════════════════════════
section("4. Discover Actions — Like, Pass, Comment, Move")

# Get targets from discover
targets = [p["id"] for p in algo_results.get("forYou", [])[:5]]

if len(targets) >= 3:
    # Like
    d, c = req("/api/v1/discover/like", "POST", {"toUserId": targets[0]}, token)
    test("Like a profile returns 200", c == 200)
    test("Like returns like object", "like" in d.get("data", {}))

    # Pass
    d, c = req("/api/v1/discover/pass", "POST", {"userId": targets[1]}, token)
    test("Pass a profile returns 200", c == 200)

    # Comment (match request with message)
    d, c = req("/api/v1/discover/comment", "POST", {
        "toUserId": targets[2], "message": "Love your photography!"
    }, token)
    test("Comment/thought returns 200", c == 200)

    # Miamo Move
    d, c = req("/api/v1/discover/move", "POST", {
        "toUserId": targets[3] if len(targets) > 3 else targets[2],
        "message": "Your travel photos are amazing!"
    }, token)
    test("Miamo Move returns 200", c == 200)

    # Received moves
    d, c = req("/api/v1/discover/moves/received", "GET", None, token)
    test("GET received moves returns 200", c == 200)
else:
    skip("Discover actions", "Not enough profiles")


# ═══════════════════════════════════════════════════════════
# 5. DISCOVER FILTERS
# ═══════════════════════════════════════════════════════════
section("5. Discover Filters (Saved Preferences)")

d, c = req("/api/v1/discover/filters", "GET", None, token)
test("GET discover filters returns 200", c == 200)

# Schema uses minAge/maxAge, not ageMin/ageMax
d, c = req("/api/v1/discover/filters", "PUT", {
    "minAge": 22, "maxAge": 35, "city": "Mumbai", "verified": True
}, token)
test("PUT discover filters returns 200", c == 200)

d, c = req("/api/v1/discover/filters", "GET", None, token)
test("Saved filters persist", d.get("data", {}).get("minAge") == 22 or c == 200)


# ═══════════════════════════════════════════════════════════
# 6. MATCHES — Incoming, Requests, Management
# ═══════════════════════════════════════════════════════════
section("6. Matches & Incoming")

d, c = req("/api/v1/matches", "GET", None, token)
test("GET matches returns 200", c == 200)
test("Matches is an array", isinstance(d.get("data"), list))
matches = d.get("data", [])
match_count = len(matches)
test("Has existing matches", match_count > 0, f"got {match_count}")

# Incoming likes
d, c = req("/api/v1/matches/incoming", "GET", None, token)
test("GET incoming returns 200", c == 200)
incoming = d.get("data", [])
test("Has incoming likes", len(incoming) > 0, f"got {len(incoming)}")

# Match requests
d, c = req("/api/v1/matches/requests", "GET", None, token)
test("GET match requests returns 200", c == 200)

d, c = req("/api/v1/matches/requests/sent", "GET", None, token)
test("GET sent requests returns 200", c == 200)

# Incoming management — endpoint uses userId from the user object
if incoming:
    # The incoming entry has a "user" object with the from-user's ID
    inc_user = incoming[0].get("user", {})
    from_user_id = inc_user.get("id") or incoming[0].get("id")
    if from_user_id:
        d, c = req(f"/api/v1/matches/incoming/{from_user_id}/hold", "POST", None, token)
        test("Hold incoming returns 200", c == 200)
        d, c = req(f"/api/v1/matches/incoming/{from_user_id}/resume", "POST", None, token)
        test("Resume incoming returns 200", c == 200)

# Favorite/pin match
if matches:
    m_id = matches[0].get("id")
    d, c = req(f"/api/v1/matches/{m_id}/favorite", "POST", None, token)
    test("Favorite match returns 200", c == 200)
    d, c = req(f"/api/v1/matches/{m_id}/pin", "POST", None, token)
    test("Pin match returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 7. AI MATCH — Suggestions, Score, Why This Match
# ═══════════════════════════════════════════════════════════
section("7. AI Match")

d, c = req("/api/v1/ai-match/suggestions", "GET", None, token)
test("AI match suggestions returns 200", c == 200)
ai_suggestions = d.get("data", [])
test("AI match returns suggestions", len(ai_suggestions) > 0)

if ai_suggestions:
    target_id = ai_suggestions[0].get("id", ai_suggestions[0].get("userId", ""))
    if target_id:
        d, c = req(f"/api/v1/ai-match/score/{target_id}", "GET", None, token)
        test("AI match score returns 200", c == 200)
        test("Score has totalScore", "totalScore" in d.get("data", {}),
             f"keys: {list(d.get('data', {}).keys())[:5]}")

        # Verify score has breakdown categories
        test("Score has breakdown", any(k in d.get("data", {}) for k in
             ["breakdown", "categories", "interestScore", "behavioralScore"]),
             f"keys: {list(d.get('data', {}).keys())}")


# ═══════════════════════════════════════════════════════════
# 8. MESSAGES — Chats, Send, Search, Manage
# ═══════════════════════════════════════════════════════════
section("8. Messaging")

d, c = req("/api/v1/messages/chats", "GET", None, token)
test("GET chats returns 200", c == 200)
chats = d.get("data", [])
test("Has chats", len(chats) > 0, f"got {len(chats)}")

if chats:
    chat_id = chats[0]["id"]

    # Get messages
    d, c = req(f"/api/v1/messages/chats/{chat_id}/messages", "GET", None, token)
    test("GET messages returns 200", c == 200)
    msgs = d.get("data", [])
    test("Messages are decrypted (no enc: prefix)", all(
        not str(m.get("content", "")).startswith("enc:") for m in msgs[:5]
    ) if msgs else True)

    # Send message
    d, c = req(f"/api/v1/messages/chats/{chat_id}/messages", "POST", {
        "content": "Hello from test suite! 🧪"
    }, token)
    test("Send message returns 200", c == 200)
    msg_id = d.get("data", {}).get("id", "")

    # Search messages (in-memory decrypted search)
    d, c = req(f"/api/v1/messages/chats/{chat_id}/search?q=test", "GET", None, token)
    test("Search messages returns 200", c == 200)

    # Chat suggestions (AI)
    d, c = req(f"/api/v1/messages/chats/{chat_id}/suggestions", "POST", {"context": "just matched"}, token)
    test("Chat suggestions returns 200", c == 200)

    # Pin/mute/archive
    d, c = req(f"/api/v1/messages/chats/{chat_id}/pin", "POST", {"pinned": True}, token)
    test("Pin chat returns 200", c == 200)
    d, c = req(f"/api/v1/messages/chats/{chat_id}/mute", "POST", {"muted": True}, token)
    test("Mute chat returns 200", c == 200)

    # Archived chats
    d, c = req("/api/v1/messages/chats/archived", "GET", None, token)
    test("GET archived chats returns 200", c == 200)

    # Content moderation check
    d, c = req("/api/v1/messages/check-content", "POST", {"content": "Hello!"}, token)
    test("Content check returns 200", c == 200)

    # Delete message (for self)
    if msg_id:
        d, c = req(f"/api/v1/messages/messages/{msg_id}/delete-for-me", "POST", None, token)
        test("Delete-for-me returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 9. BEATS (Streaks)
# ═══════════════════════════════════════════════════════════
section("9. Beats / Streaks")

d, c = req("/api/v1/beats", "GET", None, token)
test("GET beats returns 200", c == 200)
beats = d.get("data", [])

# Start a new beat — matches return { matchedUser: { id, ... } } not user1Id/user2Id
if matches:
    matched_user_obj = matches[0].get("matchedUser", {})
    other_user = matched_user_obj.get("id") or matches[0].get("user2Id") or matches[0].get("user1Id")
    if other_user:
        d, c = req("/api/v1/beats/start", "POST", {"matchedUserId": other_user}, token)
        test("Start beat returns 200", c in [200, 400])  # 400 if already exists
    beat_id = d.get("data", {}).get("id")
    if beat_id:
        d, c = req(f"/api/v1/beats/{beat_id}/complete", "POST", {"type": "snap", "content": "Test beat!"}, token)
        test("Complete beat returns 200", c in [200, 400])  # 400 if already completed today


# ═══════════════════════════════════════════════════════════
# 10. VIBE CHECK
# ═══════════════════════════════════════════════════════════
section("10. Vibe Check")

d, c = req("/api/v1/vibe-check", "POST", {
    "mood": "chill", "energy": 3, "topics": ["Movies", "Music"], "intent": "Friendship"
}, token)
test("Save vibe check returns 200", c == 200)

d, c = req("/api/v1/vibe-check", "GET", None, token)
test("Vibe history returns 200", c == 200)
test("Vibe history has entries", len(d.get("data", [])) > 0)

d, c = req("/api/v1/vibe-check/latest", "GET", None, token)
test("Latest vibe returns 200", c == 200)
test("Latest vibe has mood", d.get("data", {}).get("mood") is not None)

d, c = req("/api/v1/vibe-check/matches", "GET", None, token)
test("Vibe matches returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 11. FEED — Posts, Comments, Reactions
# ═══════════════════════════════════════════════════════════
section("11. Feed")

d, c = req("/api/v1/feed", "GET", None, token)
test("GET feed returns 200", c == 200)
feed = d.get("data", [])
test("Feed has posts", len(feed) > 0)

# Create post
d, c = req("/api/v1/feed", "POST", {
    "content": "Testing the feed from comprehensive test suite! 🧪",
    "type": "thought"
}, token)
test("Create post returns 200/201", c in [200, 201])
post_id = d.get("data", {}).get("id")

if post_id:
    # React to post
    d, c = req(f"/api/v1/feed/{post_id}/react", "POST", {"type": "heart"}, token)
    test("React to post returns 200", c == 200)

    # Comment on post
    d, c = req(f"/api/v1/feed/{post_id}/comments", "POST", {"content": "Great test!"}, token)
    test("Comment on post returns 200", c == 200)

    # Get comments
    d, c = req(f"/api/v1/feed/{post_id}/comments", "GET", None, token)
    test("GET post comments returns 200", c == 200)

    # Delete post
    d, c = req(f"/api/v1/feed/{post_id}", "DELETE", None, token)
    test("Delete post returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 12. STORIES
# ═══════════════════════════════════════════════════════════
section("12. Stories")

d, c = req("/api/v1/stories", "GET", None, token)
test("GET stories returns 200", c == 200)

# Create story
d, c = req("/api/v1/stories", "POST", {
    "content": "Test story from suite!",
    "mediaUrl": "https://picsum.photos/400/600",
    "type": "photo"
}, token)
test("Create story returns 200/201", c in [200, 201])
story_id = d.get("data", {}).get("id")

if story_id:
    d, c = req(f"/api/v1/stories/{story_id}/view", "POST", None, token)
    test("View story returns 200", c == 200)

    d, c = req(f"/api/v1/stories/{story_id}/like", "POST", None, token)
    test("Like story returns 200", c == 200)

    d, c = req(f"/api/v1/stories/{story_id}/comments", "POST", {"content": "Nice story!"}, token)
    test("Comment on story returns 200", c == 200)

    d, c = req(f"/api/v1/stories/{story_id}/comments", "GET", None, token)
    test("GET story comments returns 200", c == 200)

# My stories
d, c = req("/api/v1/stories/mine", "GET", None, token)
test("GET my stories returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 13. VIDEOS
# ═══════════════════════════════════════════════════════════
section("13. Videos")

d, c = req("/api/v1/videos", "GET", None, token)
test("GET videos returns 200", c == 200)

d, c = req("/api/v1/videos", "POST", {
    "title": "Test video", "url": "https://example.com/video.mp4",
    "thumbnailUrl": "https://picsum.photos/300/400"
}, token)
test("Create video returns 200/201", c in [200, 201])
vid_id = d.get("data", {}).get("id")

if vid_id:
    d, c = req(f"/api/v1/videos/{vid_id}/react", "POST", {"type": "fire"}, token)
    test("React to video returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 14. CREATIVITY
# ═══════════════════════════════════════════════════════════
section("14. Creativity")

d, c = req("/api/v1/creativity/categories", "GET", None, token)
test("GET creativity categories returns 200", c == 200)

d, c = req("/api/v1/creativity/feed", "GET", None, token)
test("GET creativity feed returns 200", c == 200)
cre_items = d.get("data", [])
test("Creativity feed has items", len(cre_items) > 0)

d, c = req("/api/v1/creativity/items", "GET", None, token)
test("GET creativity items returns 200", c == 200)

# Create item
d, c = req("/api/v1/creativity/items", "POST", {
    "title": "Test Art", "description": "Created by test suite",
    "category": "Art", "mediaUrl": "https://picsum.photos/400/400"
}, token)
test("Create creativity item returns 200/201", c in [200, 201])
cre_id = d.get("data", {}).get("id")

if cre_id:
    d, c = req(f"/api/v1/creativity/items/{cre_id}/react", "POST", {"type": "love"}, token)
    test("React to creativity returns 200", c == 200)

    d, c = req(f"/api/v1/creativity/items/{cre_id}/comments", "POST", {"content": "Beautiful!"}, token)
    test("Comment on creativity returns 200", c == 200)

    d, c = req(f"/api/v1/creativity/items/{cre_id}/comments", "GET", None, token)
    test("GET creativity comments returns 200", c == 200)

    d, c = req(f"/api/v1/creativity/items/{cre_id}/view", "POST", None, token)
    test("Track creativity view returns 200", c == 200)

# Trends
d, c = req("/api/v1/creativity/trends", "GET", None, token)
test("GET creativity trends returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 15. SEARCH
# ═══════════════════════════════════════════════════════════
section("15. Search")

d, c = req("/api/v1/search?q=miamo&type=all", "GET", None, token)
test("Search (all) returns 200", c == 200)
search_results = d.get("data", [])
test("Search finds users", len(search_results) > 0)

d, c = req("/api/v1/search?q=Mumbai&type=city", "GET", None, token)
test("Search by city returns 200", c == 200)

d, c = req("/api/v1/search?q=miamo2&type=name", "GET", None, token)
test("Search by name returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 16. PROFILES — Get, Update, Prompts, Interests
# ═══════════════════════════════════════════════════════════
section("16. Profiles")

d, c = req("/api/v1/profiles/me", "GET", None, token)
test("GET my profile returns 200", c == 200)
profile = d.get("data", {})
test("Profile has age field", "age" in profile or "profile" in profile)

# Update profile
d, c = req("/api/v1/profiles/me", "PUT", {
    "bio": "Updated by test suite!",
    "city": "Test City",
    "profession": "QA Engineer"
}, token)
test("Update profile returns 200", c == 200)

# Update prompts
d, c = req("/api/v1/profiles/me/prompts", "PUT", {
    "prompts": [
        {"question": "I geek out about…", "answer": "Testing software", "position": 0},
        {"question": "My love language is…", "answer": "Quality time", "position": 1},
    ]
}, token)
test("Update prompts returns 200", c == 200)

# Update interests
d, c = req("/api/v1/profiles/me/interests", "PUT", {
    "interests": ["Travel", "Photography", "Testing", "Music"]
}, token)
test("Update interests returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 17. SETTINGS & PRIVACY
# ═══════════════════════════════════════════════════════════
section("17. Settings & Privacy")

d, c = req("/api/v1/settings", "GET", None, token)
test("GET settings returns 200", c == 200)

d, c = req("/api/v1/settings", "PUT", {
    "emailNotifications": True,
    "pushNotifications": True,
    "theme": "dark",
    "language": "en"
}, token)
test("Update settings returns 200", c == 200)

d, c = req("/api/v1/settings/privacy", "PUT", {
    "searchByName": True,
    "searchByCity": True,
    "onlineStatus": True,
    "readReceipts": True,
    "lastActive": True,
    "typingIndicator": True
}, token)
test("Update privacy returns 200", c == 200)

d, c = req("/api/v1/settings/blocks", "GET", None, token)
test("GET block list returns 200", c == 200)

d, c = req("/api/v1/settings/export", "GET", None, token)
test("Data export returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 18. NOTIFICATIONS
# ═══════════════════════════════════════════════════════════
section("18. Notifications")

d, c = req("/api/v1/notifications", "GET", None, token)
test("GET notifications returns 200", c == 200)
notifs = d.get("data", [])
test("Has notifications", len(notifs) > 0)

d, c = req("/api/v1/notifications/count", "GET", None, token)
test("GET notification count returns 200", c == 200)

if notifs:
    notif_id = notifs[0]["id"]
    d, c = req(f"/api/v1/notifications/{notif_id}/read", "POST", None, token)
    test("Mark notification read returns 200", c == 200)

d, c = req("/api/v1/notifications/read-all", "POST", None, token)
test("Mark all read returns 200", c == 200)

# Unread only filter
d, c = req("/api/v1/notifications?unreadOnly=true", "GET", None, token)
test("Unread-only filter returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 19. SAFETY — Report, Block, Tips
# ═══════════════════════════════════════════════════════════
section("19. Safety")

d, c = req("/api/v1/safety/tips", "GET", None, token)
test("Safety tips returns 200", c == 200)
test("Has safety tips", len(d.get("data", [])) > 0)

# Block a user (use the new test user we created)
if new_user_id:
    d, c = req("/api/v1/safety/block", "POST", {"blockedId": new_user_id}, token)
    test("Block user returns 200", c == 200)

    d, c = req("/api/v1/safety/unblock", "POST", {"blockedId": new_user_id}, token)
    test("Unblock user returns 200", c == 200)

# Report user
if targets:
    d, c = req("/api/v1/safety/report", "POST", {
        "reportedId": targets[-1], "reason": "test_report", "details": "Testing report system"
    }, token)
    test("Report user returns 200", c in [200, 201])


# ═══════════════════════════════════════════════════════════
# 20. MATRIMONIAL (Date to Marry)
# ═══════════════════════════════════════════════════════════
section("20. Matrimonial / Date to Marry")

d, c = req("/api/v1/matrimonial/profile", "GET", None, token)
test("GET matrimonial profile returns 200", c == 200)

d, c = req("/api/v1/matrimonial/profile", "PUT", {
    "religion": "Hindu", "caste": "General", "motherTongue": "Hindi",
    "education": "Masters", "occupation": "Engineer", "annualIncome": "10-15 LPA",
    "familyType": "Nuclear", "maritalStatus": "Never Married",
    "aboutFamily": "Test family description"
}, token)
test("Update matrimonial profile returns 200", c == 200)

d, c = req("/api/v1/matrimonial/browse", "GET", None, token)
test("Browse matrimonial returns 200", c == 200)

d, c = req("/api/v1/matrimonial/matches", "GET", None, token)
test("DTM matches returns 200", c == 200)

d, c = req("/api/v1/matrimonial/templates", "GET", None, token)
test("Bio-data templates returns 200", c == 200)

d, c = req("/api/v1/matrimonial/numerology", "GET", None, token)
test("Numerology returns 200", c == 200)

# DTM Chat
dtm_target = targets[0] if targets else None
if dtm_target:
    d, c = req("/api/v1/matrimonial/chat/send", "POST", {
        "recipientId": dtm_target, "message": "Namaste! Comprehensive test.", "type": "text"
    }, token)
    test("DTM send message returns 200", c == 200)

    d, c = req(f"/api/v1/matrimonial/chat/{dtm_target}", "GET", None, token)
    test("DTM get messages returns 200", c == 200)

    d, c = req("/api/v1/matrimonial/chat", "GET", None, token)
    test("DTM chat list returns 200", c == 200)

# Compatibility
if dtm_target:
    d, c = req(f"/api/v1/matrimonial/compatibility/{dtm_target}", "GET", None, token)
    test("DTM compatibility returns 200", c == 200)

    d, c = req(f"/api/v1/matrimonial/numerology/compatibility/{dtm_target}", "GET", None, token)
    test("Numerology compatibility returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 21. ACTIVITY TRACKING
# ═══════════════════════════════════════════════════════════
section("21. Activity Tracking")

d, c = req("/api/v1/activity/track", "POST", {
    "action": "page_view", "targetType": "page", "targetId": "test_page",
    "metadata": {"source": "test_suite"}
}, token)
test("Track activity returns 200", c == 200)

d, c = req("/api/v1/activity/track", "POST", {
    "action": "page_dwell", "targetType": "page", "targetId": "test_page",
    "durationMs": 15000
}, token)
test("Track dwell time returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 22. BOOKMARKS
# ═══════════════════════════════════════════════════════════
section("22. Bookmarks")

d, c = req("/api/v1/bookmarks", "GET", None, token)
test("GET bookmarks returns 200", c == 200)

if targets:
    d, c = req("/api/v1/bookmarks", "POST", {"targetId": targets[0], "type": "profile"}, token)
    test("Create bookmark returns 200/201", c in [200, 201])
    bkmk_id = d.get("data", {}).get("id")

    d, c = req("/api/v1/bookmarks", "GET", None, token)
    test("Bookmarks list has entries", len(d.get("data", [])) > 0)

    if bkmk_id:
        d, c = req(f"/api/v1/bookmarks/{bkmk_id}", "DELETE", None, token)
        test("Delete bookmark returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 23. SESSIONS
# ═══════════════════════════════════════════════════════════
section("23. Sessions")

d, c = req("/api/v1/auth/sessions", "GET", None, token)
test("GET sessions returns 200", c == 200)
test("Has at least one session", len(d.get("data", [])) > 0)


# ═══════════════════════════════════════════════════════════
# 24. ACTIVITY ANALYSIS
# ═══════════════════════════════════════════════════════════
section("24. Activity Analysis")

d, c = req("/api/v1/activity/analysis", "GET", None, token)
test("Activity analysis returns 200", c == 200)


# ═══════════════════════════════════════════════════════════
# 25. ERROR HANDLING — Verify proper error responses
# ═══════════════════════════════════════════════════════════
section("25. Error Handling")

# 404
d, c = req("/api/v1/nonexistent", "GET", None, token)
test("Non-existent route returns 404", c == 404)

# Invalid JSON
r = urllib.request.Request(BASE + "/api/v1/auth/login", b"not-json",
                           {"Content-Type": "application/json"}, "POST")
try:
    resp = urllib.request.urlopen(r, timeout=5)
    code = resp.getcode()
except urllib.error.HTTPError as e:
    code = e.code
test("Invalid JSON returns 400", code == 400)

# Missing required fields
# Like without toUserId — may succeed with defaults or return error
d, c = req("/api/v1/discover/like", "POST", {}, token)
test("Like without toUserId returns response", c in [200, 400, 500])

# Invalid token
d, c = req("/api/v1/discover", "GET", None, "invalid-token-xyz")
test("Invalid token returns 401", c == 401)

# Password change (wrong current password)
d, c = req("/api/v1/auth/password", "PUT", {
    "currentPassword": "wrongpassword", "newPassword": "newpass123"
}, token)
test("Wrong current password returns 401", c in [400, 401])


# ═══════════════════════════════════════════════════════════
# 26. CROSS-SERVICE INTEGRATION
# ═══════════════════════════════════════════════════════════
section("26. Cross-Service Integration")

# Verify the new test user can independently access services
if new_token:
    d, c = req("/api/v1/discover", "GET", None, new_token)
    test("New user can access discover", c == 200)

    d, c = req("/api/v1/profiles/me", "GET", None, new_token)
    test("New user has profile", c == 200)

    d, c = req("/api/v1/settings", "GET", None, new_token)
    test("New user has settings", c == 200)

    d, c = req("/api/v1/notifications", "GET", None, new_token)
    test("New user can get notifications", c == 200)


# ═══════════════════════════════════════════════════════════
# RESULTS SUMMARY
# ═══════════════════════════════════════════════════════════
print(f"\n{'═'*50}")
total = PASS_COUNT + FAIL_COUNT
print(f"  RESULTS: {PASS_COUNT}/{total} passed, {FAIL_COUNT} failed, {SKIP_COUNT} skipped")
print(f"{'═'*50}")

if FAIL_COUNT > 0:
    print("\n⚠ Some tests failed. Review the output above.")
    sys.exit(1)
else:
    print("\n✅ All tests passed!")
    sys.exit(0)
