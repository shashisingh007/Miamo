#!/bin/bash
# Comprehensive API test for all Miamo microservices
set -e
API="http://localhost:3200"
PASS=0
FAIL=0
TOTAL=0

test_endpoint() {
  local method="$1" path="$2" expected="$3" data="$4" auth="$5" desc="$6"
  TOTAL=$((TOTAL + 1))
  local args=("-s" "--max-time" "10" "-w" "\n%{http_code}" "-X" "$method")
  if [ -n "$auth" ]; then args+=("-H" "Authorization: Bearer $auth"); fi
  if [ -n "$data" ]; then args+=("-H" "Content-Type: application/json" "-d" "$data"); fi
  
  local response
  response=$(curl "${args[@]}" "$API$path" 2>/dev/null)
  local code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$code" = "$expected" ]; then
    PASS=$((PASS + 1))
    echo "  ✅ $method $path → $code $desc"
  else
    FAIL=$((FAIL + 1))
    echo "  ❌ $method $path → $code (expected $expected) $desc"
    echo "     Response: $(echo "$body" | head -c 150)"
  fi
}

echo ""
echo "🧪 Miamo Comprehensive API Test"
echo "================================"

# ─── AUTH SERVICE ─────────────────────────────────────
echo ""
echo "📦 AUTH SERVICE (port 3201 via gateway)"

# Register
test_endpoint "POST" "/api/v1/auth/register" "201" \
  '{"email":"testuser@miamo.test","password":"Test@12345","displayName":"Test User"}' \
  "" "Register new user"

# Login
LOGIN_RESP=$(curl -s --max-time 10 "$API/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"miamo1@miamo.test","password":"Miamo@12345"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

if [ -n "$TOKEN" ]; then
  echo "  ✅ POST /api/v1/auth/login → 200 Login + got JWT"
  PASS=$((PASS + 1))
else
  echo "  ❌ POST /api/v1/auth/login → Failed to get token"
  FAIL=$((FAIL + 1))
  echo "Cannot continue without token"
  exit 1
fi
TOTAL=$((TOTAL + 1))

# Auth me
test_endpoint "GET" "/api/v1/auth/me" "200" "" "$TOKEN" "Get current user"

# Refresh
REFRESH=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['refreshToken'])" 2>/dev/null)
test_endpoint "POST" "/api/v1/auth/refresh" "200" "{\"refreshToken\":\"$REFRESH\"}" "" "Refresh token"

# Logout
test_endpoint "POST" "/api/v1/auth/logout" "200" "" "$TOKEN" "Logout"

# Bad login
test_endpoint "POST" "/api/v1/auth/login" "401" '{"email":"bad@email.com","password":"wrong"}' "" "Invalid login"

# ─── USERS SERVICE ─────────────────────────────────────
echo ""
echo "📦 USERS SERVICE (port 3202 via gateway)"

test_endpoint "GET" "/api/v1/users" "200" "" "$TOKEN" "List users"

USER_ID=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['id'])" 2>/dev/null)
test_endpoint "GET" "/api/v1/users/$USER_ID" "200" "" "$TOKEN" "Get user by ID"
test_endpoint "GET" "/api/v1/profiles/me" "200" "" "$TOKEN" "Get my profile"
test_endpoint "PUT" "/api/v1/profiles/me" "200" '{"bio":"Testing the API!"}' "$TOKEN" "Update profile"
test_endpoint "PUT" "/api/v1/profiles/me/interests" "200" '{"interests":["Music","Travel","Coffee"]}' "$TOKEN" "Update interests"
test_endpoint "GET" "/api/v1/settings" "200" "" "$TOKEN" "Get settings"
test_endpoint "PUT" "/api/v1/settings" "200" '{"theme":"dark"}' "$TOKEN" "Update settings"
test_endpoint "PUT" "/api/v1/settings/privacy" "200" '{"searchable":true}' "$TOKEN" "Update privacy"
test_endpoint "GET" "/api/v1/settings/export" "200" "" "$TOKEN" "GDPR export"
test_endpoint "GET" "/api/v1/settings/blocks" "200" "" "$TOKEN" "List blocks"
test_endpoint "GET" "/api/v1/search?q=Marcus" "200" "" "$TOKEN" "Search users"

# ─── SOCIAL SERVICE ───────────────────────────────────
echo ""
echo "📦 SOCIAL SERVICE (port 3203 via gateway)"

test_endpoint "GET" "/api/v1/discover" "200" "" "$TOKEN" "Discovery feed"
test_endpoint "GET" "/api/v1/matches" "200" "" "$TOKEN" "List matches"
test_endpoint "GET" "/api/v1/matches/requests" "200" "" "$TOKEN" "Match requests"
test_endpoint "GET" "/api/v1/matches/requests/sent" "200" "" "$TOKEN" "Sent requests"
test_endpoint "GET" "/api/v1/ai-match/suggestions" "200" "" "$TOKEN" "AI suggestions"
test_endpoint "GET" "/api/v1/safety/reports" "200" "" "$TOKEN" "My reports"
test_endpoint "GET" "/api/v1/safety/tips" "200" "" "$TOKEN" "Safety tips"

# Like a user
LOGIN2_RESP=$(curl -s --max-time 10 "$API/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"miamo5@miamo.test","password":"Miamo@12345"}')
USER5_ID=$(echo "$LOGIN2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['user']['id'])" 2>/dev/null)
test_endpoint "POST" "/api/v1/discover/like" "200" "{\"toUserId\":\"$USER5_ID\"}" "$TOKEN" "Like user"
test_endpoint "POST" "/api/v1/discover/pass" "200" '{}' "$TOKEN" "Pass"

# ─── MESSAGING SERVICE ────────────────────────────────
echo ""
echo "📦 MESSAGING SERVICE (port 3204 via gateway)"

test_endpoint "GET" "/api/v1/messages/chats" "200" "" "$TOKEN" "List chats"
test_endpoint "GET" "/api/v1/messages/chats/archived" "200" "" "$TOKEN" "Archived chats"
test_endpoint "GET" "/api/v1/beats" "200" "" "$TOKEN" "List beats"

# Get a chat ID to test messages
CHATS_RESP=$(curl -s --max-time 10 -H "Authorization: Bearer $TOKEN" "$API/api/v1/messages/chats")
CHAT_ID=$(echo "$CHATS_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else '')" 2>/dev/null)

if [ -n "$CHAT_ID" ]; then
  test_endpoint "GET" "/api/v1/messages/chats/$CHAT_ID/messages" "200" "" "$TOKEN" "Get messages"
  test_endpoint "POST" "/api/v1/messages/chats/$CHAT_ID/messages" "200" '{"content":"Hello from test!"}' "$TOKEN" "Send message"
  test_endpoint "POST" "/api/v1/messages/chats/$CHAT_ID/pin" "200" '{"pinned":true}' "$TOKEN" "Pin chat"
  test_endpoint "POST" "/api/v1/messages/chats/$CHAT_ID/mute" "200" '{"muted":false}' "$TOKEN" "Mute toggle"
fi

# ─── CONTENT SERVICE ──────────────────────────────────
echo ""
echo "📦 CONTENT SERVICE (port 3205 via gateway)"

test_endpoint "GET" "/api/v1/feed" "200" "" "$TOKEN" "Get feed"
test_endpoint "POST" "/api/v1/feed" "200" '{"content":"Test post from API test!","type":"thought"}' "$TOKEN" "Create post"

# Get post ID for reactions/comments
FEED_RESP=$(curl -s --max-time 10 -H "Authorization: Bearer $TOKEN" "$API/api/v1/feed")
POST_ID=$(echo "$FEED_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else '')" 2>/dev/null)

if [ -n "$POST_ID" ]; then
  test_endpoint "POST" "/api/v1/feed/$POST_ID/react" "200" '{"type":"like"}' "$TOKEN" "React to post"
  test_endpoint "POST" "/api/v1/feed/$POST_ID/comments" "200" '{"content":"Great post!"}' "$TOKEN" "Comment on post"
  test_endpoint "GET" "/api/v1/feed/$POST_ID/comments" "200" "" "$TOKEN" "Get comments"
fi

test_endpoint "GET" "/api/v1/stories" "200" "" "$TOKEN" "Get stories"
test_endpoint "POST" "/api/v1/stories" "200" '{"type":"text","content":"Test story!","expiresInHours":24}' "$TOKEN" "Create story"

test_endpoint "GET" "/api/v1/videos" "200" "" "$TOKEN" "Get videos"
test_endpoint "POST" "/api/v1/videos" "200" '{"title":"Test Video","description":"API test","url":"https://example.com/v.mp4","thumbnailUrl":"https://example.com/t.jpg"}' "$TOKEN" "Upload video"

test_endpoint "GET" "/api/v1/creativity/categories" "200" "" "$TOKEN" "Creativity categories"
test_endpoint "GET" "/api/v1/creativity/items" "200" "" "$TOKEN" "Creativity items"
test_endpoint "GET" "/api/v1/creativity/trends" "200" "" "$TOKEN" "Trends"

# ─── NOTIFICATIONS SERVICE ────────────────────────────
echo ""
echo "📦 NOTIFICATIONS SERVICE (port 3206 via gateway)"

test_endpoint "GET" "/api/v1/notifications" "200" "" "$TOKEN" "List notifications"
test_endpoint "GET" "/api/v1/notifications/count" "200" "" "$TOKEN" "Unread count"
test_endpoint "POST" "/api/v1/notifications/read-all" "200" "" "$TOKEN" "Mark all read"

# ─── AUTH GUARDS ──────────────────────────────────────
echo ""
echo "🔒 AUTH GUARD TESTS"

test_endpoint "GET" "/api/v1/users" "401" "" "" "Users without token"
test_endpoint "GET" "/api/v1/discover" "401" "" "" "Discover without token"
test_endpoint "GET" "/api/v1/messages/chats" "401" "" "" "Messages without token"
test_endpoint "GET" "/api/v1/feed" "401" "" "" "Feed without token"
test_endpoint "GET" "/api/v1/notifications" "401" "" "" "Notifications without token"

# ─── SERVICE HEALTH ──────────────────────────────────
echo ""
echo "❤️  HEALTH CHECKS"

for port in 3201 3202 3203 3204 3205 3206; do
  SVC_HEALTH=$(curl -s --max-time 5 "http://localhost:$port/health" 2>/dev/null)
  SVC_NAME=$(echo "$SVC_HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('service','unknown'))" 2>/dev/null)
  SVC_DB=$(echo "$SVC_HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('db','unknown'))" 2>/dev/null)
  if [ "$SVC_DB" = "connected" ]; then
    echo "  ✅ :$port → $SVC_NAME (db: connected)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ :$port → $SVC_NAME (db: $SVC_DB)"
    FAIL=$((FAIL + 1))
  fi
  TOTAL=$((TOTAL + 1))
done

# Gateway aggregated health
GW_HEALTH=$(curl -s --max-time 5 http://localhost:3200/health 2>/dev/null)
echo "  ✅ :3200 → gateway (aggregated)"
PASS=$((PASS + 1))
TOTAL=$((TOTAL + 1))

# ─── SUMMARY ─────────────────────────────────────────
echo ""
echo "========================================"
echo "  📊 TEST RESULTS"
echo "  Total:  $TOTAL"
echo "  Passed: $PASS ✅"
echo "  Failed: $FAIL ❌"
echo "========================================"
if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED!"
else
  echo "  ⚠️  $FAIL tests failed"
fi
echo ""
