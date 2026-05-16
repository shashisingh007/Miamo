#!/bin/bash
# Comprehensive API test script for Miamo
TOKEN="$1"
BASE="http://localhost:3200"
PASS=0
FAIL=0
ERRORS=""

test_endpoint() {
  local method="$1" path="$2" body="$3" label="$4"
  local opts=("-s" "-w" "\n%{http_code}" "-H" "Authorization: Bearer $TOKEN")
  if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "DELETE" ]; then
    opts+=("-X" "$method" "-H" "Content-Type: application/json")
    [ -n "$body" ] && opts+=("-d" "$body")
  fi
  local resp=$(curl "${opts[@]}" "$BASE$path")
  local code=$(echo "$resp" | tail -1)
  local body_resp=$(echo "$resp" | sed '$d')
  
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    printf "  ✅ %-50s %s\n" "$label" "$code"
    PASS=$((PASS+1))
  else
    local err=$(echo "$body_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',{}).get('message','')[:80])" 2>/dev/null)
    printf "  ❌ %-50s %s  %s\n" "$label" "$code" "$err"
    FAIL=$((FAIL+1))
    ERRORS="$ERRORS\n$label: $code $err"
  fi
}

echo "═══ AUTH ═══"
test_endpoint GET "/api/v1/auth/me" "" "GET /auth/me"

echo "═══ PROFILES ═══"
test_endpoint GET "/api/v1/profiles/me" "" "GET /profiles/me"
test_endpoint GET "/api/v1/profiles/me/score" "" "GET /profiles/me/score"

echo "═══ DISCOVER ═══"
test_endpoint GET "/api/v1/discover" "" "GET /discover"
test_endpoint GET "/api/v1/discover/filters" "" "GET /discover/filters"
test_endpoint PUT "/api/v1/discover/filters" '{"minAge":20,"maxAge":35}' "PUT /discover/filters"
test_endpoint GET "/api/v1/discover/moves/received" "" "GET /discover/moves/received"

echo "═══ FEED ═══"
test_endpoint GET "/api/v1/feed" "" "GET /feed"
test_endpoint POST "/api/v1/feed" '{"content":"API test post","type":"text"}' "POST /feed (create post)"

echo "═══ MATCHES ═══"
test_endpoint GET "/api/v1/matches" "" "GET /matches"
test_endpoint GET "/api/v1/matches/incoming" "" "GET /matches/incoming"

echo "═══ MESSAGES ═══"
test_endpoint GET "/api/v1/messages/chats" "" "GET /messages/chats"

echo "═══ AI MATCH ═══"
test_endpoint GET "/api/v1/ai-match/suggestions" "" "GET /ai-match/suggestions"

echo "═══ STORIES ═══"
test_endpoint GET "/api/v1/stories" "" "GET /stories"
test_endpoint GET "/api/v1/stories/mine" "" "GET /stories/mine"

echo "═══ VIDEOS ═══"
test_endpoint GET "/api/v1/videos" "" "GET /videos"

echo "═══ CREATIVITY ═══"
test_endpoint GET "/api/v1/creativity/feed" "" "GET /creativity/feed"
test_endpoint GET "/api/v1/creativity/categories" "" "GET /creativity/categories"
test_endpoint GET "/api/v1/creativity/items" "" "GET /creativity/items"
test_endpoint GET "/api/v1/creativity/trends" "" "GET /creativity/trends"

echo "═══ NOTIFICATIONS ═══"
test_endpoint GET "/api/v1/notifications" "" "GET /notifications"

echo "═══ SETTINGS ═══"
test_endpoint GET "/api/v1/settings" "" "GET /settings"

echo "═══ SEARCH ═══"
test_endpoint GET "/api/v1/search?q=music" "" "GET /search?q=music"

echo "═══ SAFETY ═══"
test_endpoint GET "/api/v1/safety/tips" "" "GET /safety/tips"

echo "═══ BEATS ═══"
test_endpoint GET "/api/v1/beats" "" "GET /beats"

echo "═══ DATE TO MARRY (DTM) ═══"
test_endpoint GET "/api/v1/matrimonial/profile" "" "GET /matrimonial/profile"
test_endpoint GET "/api/v1/matrimonial/browse" "" "GET /matrimonial/browse"
test_endpoint GET "/api/v1/matrimonial/templates" "" "GET /matrimonial/templates"
test_endpoint GET "/api/v1/matrimonial/numerology" "" "GET /matrimonial/numerology"
test_endpoint GET "/api/v1/matrimonial/browse/advanced" "" "GET /matrimonial/browse/advanced"
test_endpoint GET "/api/v1/matrimonial/matches" "" "GET /matrimonial/matches"
test_endpoint GET "/api/v1/matrimonial/access-requests/incoming" "" "GET /matrimonial/access-requests/incoming"
test_endpoint GET "/api/v1/matrimonial/access-requests/sent" "" "GET /matrimonial/access-requests/sent"
test_endpoint GET "/api/v1/matrimonial/chats" "" "GET /matrimonial/chats"

echo ""
echo "═══════════════════════════════════════"
printf "PASS: %d  |  FAIL: %d  |  TOTAL: %d\n" $PASS $FAIL $((PASS+FAIL))
if [ $FAIL -gt 0 ]; then
  echo ""
  echo "FAILURES:"
  printf "$ERRORS\n"
fi
