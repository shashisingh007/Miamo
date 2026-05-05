#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Miamo Feature + E2E + Sanity Test Suite
# Tests every feature, interaction, and API endpoint
# ═══════════════════════════════════════════════════════════
set -euo pipefail

BASE="http://localhost:3200"
WEB="http://localhost:3100"
PASS=0 FAIL=0 TOTAL=0

GREEN='\033[0;32m' RED='\033[0;31m' YELLOW='\033[0;33m' CYAN='\033[0;36m' NC='\033[0m'

test_endpoint() {
  local method="$1" path="$2" expect="$3" desc="$4" data="${5:-}" headers="${6:-}"
  TOTAL=$((TOTAL+1))
  local curl_args=(-s --max-time 10 -w "\n%{http_code}" -o -)
  if [ -n "$headers" ]; then curl_args+=(-H "$headers"); fi
  if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "DELETE" ]; then
    curl_args+=(-X "$method" -H "Content-Type: application/json")
    if [ -n "$data" ]; then curl_args+=(-d "$data"); fi
  fi
  local output=$(curl "${curl_args[@]}" "${BASE}${path}")
  local code=$(echo "$output" | tail -1)
  local body=$(echo "$output" | sed '$d')
  if [ "$code" = "$expect" ]; then
    PASS=$((PASS+1))
    printf "  ${GREEN}✅${NC} $method $path → $code $desc\n"
  else
    FAIL=$((FAIL+1))
    printf "  ${RED}❌${NC} $method $path → $code (expected $expect) $desc\n"
    echo "     Body: $(echo "$body" | head -c 120)"
  fi
}

echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN} 🧪 Miamo Complete Test Suite${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"

# ─── SANITY: Web app + Gateway + All services ─────────
echo -e "${YELLOW}📦 SANITY CHECKS${NC}"
TOTAL=$((TOTAL+1))
WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$WEB")
if [ "$WEB_CODE" = "200" ]; then PASS=$((PASS+1)); printf "  ${GREEN}✅${NC} Web app on :3100 → 200\n"; else FAIL=$((FAIL+1)); printf "  ${RED}❌${NC} Web app → $WEB_CODE\n"; fi

for PORT in 3201 3202 3203 3204 3205 3206; do
  TOTAL=$((TOTAL+1))
  HC=$(curl -s --max-time 3 "http://localhost:$PORT/health" 2>/dev/null || echo '{}')
  SVC=$(echo "$HC" | grep -o '"service":"[^"]*"' | head -1 | cut -d'"' -f4)
  DB=$(echo "$HC" | grep -o '"connected"' | head -1)
  if [ -n "$SVC" ] && [ -n "$DB" ]; then PASS=$((PASS+1)); printf "  ${GREEN}✅${NC} :$PORT → $SVC (db: connected)\n"; else FAIL=$((FAIL+1)); printf "  ${RED}❌${NC} :$PORT health check failed\n"; fi
done

test_endpoint GET "/health" 200 "Gateway aggregated health"

# ─── AUTH: Full flow ──────────────────────────────────
echo -e "\n${YELLOW}🔐 AUTH SERVICE${NC}"
UNIQUE=$(date +%s%N | tail -c 8)
REG=$(curl -s --max-time 10 -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"test${UNIQUE}@miamo.test\",\"password\":\"Test@12345\",\"displayName\":\"TestBot ${UNIQUE}\"}" \
  "${BASE}/api/v1/auth/register")
TOTAL=$((TOTAL+1))
if echo "$REG" | grep -q "accessToken"; then PASS=$((PASS+1)); printf "  ${GREEN}✅${NC} POST /auth/register → new user created\n"; else FAIL=$((FAIL+1)); printf "  ${RED}❌${NC} Register failed\n"; fi

LOGIN=$(curl -s --max-time 10 -X POST -H "Content-Type: application/json" \
  -d '{"email":"miamo1@miamo.test","password":"Miamo@12345"}' \
  "${BASE}/api/v1/auth/login")
TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
USER_ID=$(echo "$LOGIN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
TOTAL=$((TOTAL+1))
if [ -n "$TOKEN" ]; then PASS=$((PASS+1)); printf "  ${GREEN}✅${NC} POST /auth/login → JWT obtained\n"; else FAIL=$((FAIL+1)); printf "  ${RED}❌${NC} Login failed\n"; fi

AUTH="Authorization: Bearer $TOKEN"
test_endpoint GET "/api/v1/auth/me" 200 "Get current user" "" "$AUTH"

REFRESH=$(echo "$LOGIN" | grep -o '"refreshToken":"[^"]*"' | head -1 | cut -d'"' -f4)
test_endpoint POST "/api/v1/auth/refresh" 200 "Refresh token" "{\"refreshToken\":\"$REFRESH\"}" "$AUTH"
test_endpoint POST "/api/v1/auth/login" 401 "Bad credentials" '{"email":"bad@bad.com","password":"wrong"}'

# ─── USERS ────────────────────────────────────────────
echo -e "\n${YELLOW}👥 USERS SERVICE${NC}"
test_endpoint GET "/api/v1/users" 200 "List users" "" "$AUTH"
test_endpoint GET "/api/v1/users/$USER_ID" 200 "Get user by ID" "" "$AUTH"

# ─── PROFILES ────────────────────────────────────────
echo -e "\n${YELLOW}👤 PROFILES${NC}"
test_endpoint GET "/api/v1/profiles/me" 200 "Get my profile" "" "$AUTH"
test_endpoint PUT "/api/v1/profiles/me" 200 "Update profile (bio)" '{"bio":"Updated via test"}' "$AUTH"
test_endpoint PUT "/api/v1/profiles/me/interests" 200 "Update interests" '{"interests":["Travel","Music","Art"]}' "$AUTH"
test_endpoint PUT "/api/v1/profiles/me/prompts" 200 "Update prompts" '{"prompts":[{"question":"Test?","answer":"Yes"}]}' "$AUTH"

# ─── SETTINGS ────────────────────────────────────────
echo -e "\n${YELLOW}⚙️  SETTINGS${NC}"
test_endpoint GET "/api/v1/settings" 200 "Get settings" "" "$AUTH"
test_endpoint PUT "/api/v1/settings" 200 "Update settings" '{"notificationsEnabled":true,"messageNotifications":true}' "$AUTH"
test_endpoint PUT "/api/v1/settings/privacy" 200 "Update privacy" '{"profileVisible":true}' "$AUTH"
test_endpoint GET "/api/v1/settings/export" 200 "GDPR data export" "" "$AUTH"
test_endpoint GET "/api/v1/settings/blocks" 200 "Get block list" "" "$AUTH"

# ─── SEARCH ──────────────────────────────────────────
echo -e "\n${YELLOW}🔍 SEARCH${NC}"
test_endpoint GET "/api/v1/search?q=Marcus" 200 "Search by name" "" "$AUTH"
test_endpoint GET "/api/v1/search?q=a&type=name" 200 "Search with type filter" "" "$AUTH"

# ─── DISCOVER ────────────────────────────────────────
echo -e "\n${YELLOW}💫 DISCOVER${NC}"
test_endpoint GET "/api/v1/discover" 200 "Discovery feed" "" "$AUTH"
test_endpoint GET "/api/v1/discover?filter=new" 200 "Filter: new" "" "$AUTH"
test_endpoint GET "/api/v1/discover?filter=serious" 200 "Filter: serious" "" "$AUTH"

# Get a user to like/pass
DISCOVER=$(curl -s --max-time 10 -H "$AUTH" "${BASE}/api/v1/discover")
TARGET_ID=$(echo "$DISCOVER" | python3 -c "import sys,json; d=json.load(sys.stdin); users=d.get('data',[]); print(users[0]['id'] if users else '')" 2>/dev/null)
if [ -n "$TARGET_ID" ] && [ "$TARGET_ID" != "$USER_ID" ]; then
  test_endpoint POST "/api/v1/discover/like" 200 "Like user" "{\"toUserId\":\"$TARGET_ID\"}" "$AUTH"
  test_endpoint POST "/api/v1/discover/pass" 200 "Pass user" "{}" "$AUTH"
  test_endpoint POST "/api/v1/discover/comment" 200 "Comment on profile" "{\"toUserId\":\"$TARGET_ID\",\"message\":\"Great profile!\"}" "$AUTH"
fi

# ─── MATCHES ─────────────────────────────────────────
echo -e "\n${YELLOW}💕 MATCHES${NC}"
test_endpoint GET "/api/v1/matches" 200 "List matches" "" "$AUTH"
test_endpoint GET "/api/v1/matches/requests" 200 "Incoming requests" "" "$AUTH"
test_endpoint GET "/api/v1/matches/requests/sent" 200 "Sent requests" "" "$AUTH"

# ─── AI MATCH ────────────────────────────────────────
echo -e "\n${YELLOW}🧠 AI MATCH${NC}"
test_endpoint GET "/api/v1/ai-match/suggestions" 200 "AI suggestions" "" "$AUTH"

# ─── MESSAGES ────────────────────────────────────────
echo -e "\n${YELLOW}💬 MESSAGES${NC}"
test_endpoint GET "/api/v1/messages/chats" 200 "List chats" "" "$AUTH"
test_endpoint GET "/api/v1/messages/chats/archived" 200 "Archived chats" "" "$AUTH"

CHATS=$(curl -s --max-time 10 -H "$AUTH" "${BASE}/api/v1/messages/chats")
CHAT_ID=$(echo "$CHATS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$CHAT_ID" ]; then
  test_endpoint GET "/api/v1/messages/chats/$CHAT_ID/messages" 200 "Get chat messages" "" "$AUTH"
  test_endpoint POST "/api/v1/messages/chats/$CHAT_ID/messages" 200 "Send message" '{"content":"Test message from suite"}' "$AUTH"
  test_endpoint POST "/api/v1/messages/chats/$CHAT_ID/pin" 200 "Pin chat" '{"pinned":true}' "$AUTH"
  test_endpoint POST "/api/v1/messages/chats/$CHAT_ID/mute" 200 "Mute chat" '{"muted":true}' "$AUTH"
  test_endpoint POST "/api/v1/messages/chats/$CHAT_ID/pin" 200 "Unpin chat" '{"pinned":false}' "$AUTH"
  test_endpoint POST "/api/v1/messages/chats/$CHAT_ID/mute" 200 "Unmute chat" '{"muted":false}' "$AUTH"
fi

# ─── BEATS ───────────────────────────────────────────
echo -e "\n${YELLOW}⚡ BEATS${NC}"
test_endpoint GET "/api/v1/beats" 200 "List all beats" "" "$AUTH"
test_endpoint GET "/api/v1/beats?state=strong" 200 "Filter strong beats" "" "$AUTH"

BEATS=$(curl -s --max-time 10 -H "$AUTH" "${BASE}/api/v1/beats")
BEAT_ID=$(echo "$BEATS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$BEAT_ID" ]; then
  test_endpoint POST "/api/v1/beats/$BEAT_ID/complete" 200 "Complete beat" '{"type":"text","content":"Daily check-in!"}' "$AUTH"
fi

# ─── FEED ────────────────────────────────────────────
echo -e "\n${YELLOW}📰 FEED${NC}"
test_endpoint GET "/api/v1/feed" 200 "Get feed" "" "$AUTH"
test_endpoint POST "/api/v1/feed" 200 "Create post" '{"content":"E2E test post","type":"text"}' "$AUTH"

FEED=$(curl -s --max-time 10 -H "$AUTH" "${BASE}/api/v1/feed")
POST_ID=$(echo "$FEED" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$POST_ID" ]; then
  test_endpoint POST "/api/v1/feed/$POST_ID/react" 200 "React to post" '{"type":"like"}' "$AUTH"
  test_endpoint POST "/api/v1/feed/$POST_ID/comments" 200 "Comment on post" '{"content":"Great post!"}' "$AUTH"
  test_endpoint GET "/api/v1/feed/$POST_ID/comments" 200 "Get post comments" "" "$AUTH"
fi

# ─── STORIES ─────────────────────────────────────────
echo -e "\n${YELLOW}📸 STORIES${NC}"
test_endpoint GET "/api/v1/stories" 200 "Get stories" "" "$AUTH"
test_endpoint POST "/api/v1/stories" 200 "Create story" '{"content":"Test story","type":"text"}' "$AUTH"

# Create a fresh story first so we have a known ID
NEW_STORY=$(curl -s --max-time 10 -X POST -H 'Content-Type: application/json' -H "$AUTH" "${BASE}/api/v1/stories" -d '{"content":"View test story","type":"text"}')
STORY_ID=$(echo "$NEW_STORY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$STORY_ID" ]; then
  test_endpoint POST "/api/v1/stories/$STORY_ID/view" 200 "View story" "" "$AUTH"
  test_endpoint POST "/api/v1/stories/$STORY_ID/react" 200 "React to story" '{"reaction":"❤️"}' "$AUTH"
fi

# ─── VIDEOS ──────────────────────────────────────────
echo -e "\n${YELLOW}🎬 VIDEOS${NC}"
test_endpoint GET "/api/v1/videos" 200 "Get videos" "" "$AUTH"
test_endpoint POST "/api/v1/videos" 200 "Upload video" '{"title":"Test video","url":"https://example.com/test.mp4"}' "$AUTH"

VIDS=$(curl -s --max-time 10 -H "$AUTH" "${BASE}/api/v1/videos")
VID_ID=$(echo "$VIDS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$VID_ID" ]; then
  test_endpoint POST "/api/v1/videos/$VID_ID/react" 200 "React to video" '{"type":"like"}' "$AUTH"
  test_endpoint POST "/api/v1/videos/$VID_ID/comments" 200 "Comment on video" '{"content":"Cool video!"}' "$AUTH"
fi

# ─── CREATIVITY ──────────────────────────────────────
echo -e "\n${YELLOW}✨ CREATIVITY${NC}"
test_endpoint GET "/api/v1/creativity/categories" 200 "Get categories" "" "$AUTH"
test_endpoint GET "/api/v1/creativity/items" 200 "Get items" "" "$AUTH"
test_endpoint GET "/api/v1/creativity/items?category=music" 200 "Filter by category" "" "$AUTH"
test_endpoint GET "/api/v1/creativity/trends" 200 "Get trends" "" "$AUTH"
test_endpoint POST "/api/v1/creativity/items" 200 "Create item" '{"title":"Test art","category":"art","description":"A test piece"}' "$AUTH"

CITEMS=$(curl -s --max-time 10 -H "$AUTH" "${BASE}/api/v1/creativity/items")
CITEM_ID=$(echo "$CITEMS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$CITEM_ID" ]; then
  test_endpoint POST "/api/v1/creativity/items/$CITEM_ID/react" 200 "React to item" '{"type":"like"}' "$AUTH"
  test_endpoint POST "/api/v1/creativity/items/$CITEM_ID/comments" 200 "Comment on item" '{"content":"Amazing!"}' "$AUTH"
fi

# ─── NOTIFICATIONS ───────────────────────────────────
echo -e "\n${YELLOW}🔔 NOTIFICATIONS${NC}"
test_endpoint GET "/api/v1/notifications" 200 "List notifications" "" "$AUTH"
test_endpoint GET "/api/v1/notifications?unreadOnly=true" 200 "Unread only" "" "$AUTH"
test_endpoint GET "/api/v1/notifications/count" 200 "Unread count" "" "$AUTH"
test_endpoint POST "/api/v1/notifications/read-all" 200 "Mark all read" "" "$AUTH"

NOTIFS=$(curl -s --max-time 10 -H "$AUTH" "${BASE}/api/v1/notifications")
NOTIF_ID=$(echo "$NOTIFS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$NOTIF_ID" ]; then
  test_endpoint POST "/api/v1/notifications/$NOTIF_ID/read" 200 "Mark single read" "" "$AUTH"
fi

# ─── SAFETY ──────────────────────────────────────────
echo -e "\n${YELLOW}🛡️  SAFETY${NC}"
test_endpoint GET "/api/v1/safety/reports" 200 "Get my reports" "" "$AUTH"
test_endpoint GET "/api/v1/safety/tips" 200 "Safety tips" "" "$AUTH"
test_endpoint POST "/api/v1/safety/report" 200 "Submit report" "{\"reportedId\":\"$TARGET_ID\",\"reason\":\"test report\",\"details\":\"automated test\"}" "$AUTH"

# ─── AUTH GUARDS ─────────────────────────────────────
echo -e "\n${YELLOW}🔒 AUTH GUARD TESTS${NC}"
test_endpoint GET "/api/v1/users" 401 "Users - no token"
test_endpoint GET "/api/v1/discover" 401 "Discover - no token"
test_endpoint GET "/api/v1/messages/chats" 401 "Messages - no token"
test_endpoint GET "/api/v1/feed" 401 "Feed - no token"
test_endpoint GET "/api/v1/notifications" 401 "Notifications - no token"
test_endpoint GET "/api/v1/beats" 401 "Beats - no token"
test_endpoint GET "/api/v1/settings" 401 "Settings - no token"
test_endpoint GET "/api/v1/profiles/me" 401 "Profile - no token"

# ─── E2E: Login and interact flow ────────────────────
echo -e "\n${YELLOW}🔄 E2E: Complete user flow${NC}"

# Login as user2
LOGIN2=$(curl -s --max-time 10 -X POST -H "Content-Type: application/json" \
  -d '{"email":"miamo2@miamo.test","password":"Miamo@12345"}' "${BASE}/api/v1/auth/login")
TOKEN2=$(echo "$LOGIN2" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
AUTH2="Authorization: Bearer $TOKEN2"

TOTAL=$((TOTAL+1))
if [ -n "$TOKEN2" ]; then PASS=$((PASS+1)); printf "  ${GREEN}✅${NC} E2E: Login as user2\n"; else FAIL=$((FAIL+1)); printf "  ${RED}❌${NC} E2E: Login as user2 failed\n"; fi

# User2 discovers and likes user1
test_endpoint POST "/api/v1/discover/like" 200 "E2E: User2 likes User1" "{\"toUserId\":\"$USER_ID\"}" "$AUTH2"

# User2 creates a post
test_endpoint POST "/api/v1/feed" 200 "E2E: User2 creates post" '{"content":"Cross-user test post"}' "$AUTH2"

# User1 reads User2's post
test_endpoint GET "/api/v1/feed" 200 "E2E: User1 reads feed" "" "$AUTH"

# User2 creates a story
test_endpoint POST "/api/v1/stories" 200 "E2E: User2 creates story" '{"content":"User2 story","type":"text"}' "$AUTH2"

# User1 reads stories
test_endpoint GET "/api/v1/stories" 200 "E2E: User1 reads stories" "" "$AUTH"

# User1 requests data export
test_endpoint GET "/api/v1/settings/export" 200 "E2E: GDPR export" "" "$AUTH"

# User1 logs out
test_endpoint POST "/api/v1/auth/logout" 200 "E2E: Logout" "" "$AUTH"

# ─── PERFORMANCE: Response time ──────────────────────
echo -e "\n${YELLOW}⏱️  PERFORMANCE CHECKS${NC}"
for ENDPOINT in "/api/v1/discover" "/api/v1/feed" "/api/v1/messages/chats" "/api/v1/creativity/items"; do
  LOGIN_P=$(curl -s --max-time 10 -X POST -H "Content-Type: application/json" \
    -d '{"email":"miamo1@miamo.test","password":"Miamo@12345"}' "${BASE}/api/v1/auth/login")
  TOKEN_P=$(echo "$LOGIN_P" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
  TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 -H "Authorization: Bearer $TOKEN_P" "${BASE}${ENDPOINT}")
  TOTAL=$((TOTAL+1))
  TIME_MS=$(echo "$TIME * 1000" | bc 2>/dev/null || echo "0")
  if (( $(echo "$TIME < 3" | bc -l 2>/dev/null || echo 0) )); then
    PASS=$((PASS+1)); printf "  ${GREEN}✅${NC} $ENDPOINT → ${TIME_MS%.*}ms (< 3s)\n"
  else
    FAIL=$((FAIL+1)); printf "  ${RED}❌${NC} $ENDPOINT → ${TIME_MS%.*}ms (SLOW > 3s)\n"
  fi
done

# ─── RESULTS ─────────────────────────────────────────
echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
printf "  📊 ${CYAN}TEST RESULTS${NC}\n"
printf "  Total:  $TOTAL\n"
printf "  Passed: ${GREEN}$PASS ✅${NC}\n"
printf "  Failed: ${RED}$FAIL ❌${NC}\n"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
if [ "$FAIL" -eq 0 ]; then echo -e "  ${GREEN}🎉 ALL TESTS PASSED!${NC}\n"; else echo -e "  ${RED}⚠ Some tests failed.${NC}\n"; fi
exit $FAIL
