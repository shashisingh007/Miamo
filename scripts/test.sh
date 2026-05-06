#!/bin/bash
# ═══ Miamo — Test Suite ═══
# Runs all tests: health checks, API integration, e2e
# Must pass before deploying. Exit code 0 = all pass.
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo -e "  ${G}✓${NC} $1"; }
fail() { FAIL=$((FAIL+1)); echo -e "  ${R}✗${NC} $1"; }

echo -e "\n${Y}═══ MIAMO TEST SUITE ═══${NC}\n"

# ─── 1. Container Health ─────────────────────────────
echo -e "${Y}[1/4] Container Health${NC}"
SERVICES="postgres redis auth users social messaging content notifications gateway web"
for svc in $SERVICES; do
  STATUS=$(docker-compose ps "$svc" --format json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('Health','unknown'))" 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "healthy" ]; then ok "$svc"; else fail "$svc ($STATUS)"; fi
done

# ─── 2. API Health Endpoints ─────────────────────────
echo -e "\n${Y}[2/4] API Health Endpoints${NC}"
ENDPOINTS=(
  "http://localhost:3200/health:gateway"
  "http://localhost:3100:web"
)
for ep in "${ENDPOINTS[@]}"; do
  URL="${ep%%:*}:${ep#*:}"
  URL="${ep%:*}"
  NAME="${ep##*:}"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then ok "$NAME ($URL)"; else fail "$NAME → HTTP $CODE"; fi
done

# ─── 3. API Integration Tests ────────────────────────
echo -e "\n${Y}[3/4] API Integration${NC}"

# Login test
LOGIN=$(curl -s -X POST http://localhost:3200/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"miamo1@miamo.test","password":"miamo1"}' --max-time 5 2>/dev/null)
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")
if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  ok "POST /auth/login → got token"
else
  fail "POST /auth/login → no token"
fi

# Profile fetch
if [ -n "$TOKEN" ]; then
  PROFILE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3200/api/v1/users/me 2>/dev/null || echo "000")
  if [ "$PROFILE_CODE" = "200" ]; then ok "GET /users/me → 200"; else fail "GET /users/me → $PROFILE_CODE"; fi

  FEED_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3200/api/v1/feed 2>/dev/null || echo "000")
  if [ "$FEED_CODE" = "200" ]; then ok "GET /feed → 200"; else fail "GET /feed → $FEED_CODE"; fi

  DISCOVER_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3200/api/v1/discover 2>/dev/null || echo "000")
  if [ "$DISCOVER_CODE" = "200" ]; then ok "GET /discover → 200"; else fail "GET /discover → $DISCOVER_CODE"; fi

  MATCHES_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3200/api/v1/matches 2>/dev/null || echo "000")
  if [ "$MATCHES_CODE" = "200" ]; then ok "GET /matches → 200"; else fail "GET /matches → $MATCHES_CODE"; fi

  MESSAGES_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3200/api/v1/messages 2>/dev/null || echo "000")
  if [ "$MESSAGES_CODE" = "200" ]; then ok "GET /messages → 200"; else fail "GET /messages → $MESSAGES_CODE"; fi

  NOTIF_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3200/api/v1/notifications 2>/dev/null || echo "000")
  if [ "$NOTIF_CODE" = "200" ]; then ok "GET /notifications → 200"; else fail "GET /notifications → $NOTIF_CODE"; fi
fi

# ─── 4. Response Time ────────────────────────────────
echo -e "\n${Y}[4/4] Response Time (< 500ms)${NC}"
for endpoint in "/api/v1/auth/login" "/api/v1/feed" "/api/v1/discover"; do
  if [ "$endpoint" = "/api/v1/auth/login" ]; then
    TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 \
      -X POST -H "Content-Type: application/json" \
      -d '{"email":"miamo1@miamo.test","password":"miamo1"}' \
      "http://localhost:3200$endpoint" 2>/dev/null || echo "9")
  else
    TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 \
      -H "Authorization: Bearer $TOKEN" \
      "http://localhost:3200$endpoint" 2>/dev/null || echo "9")
  fi
  MS=$(echo "$TIME * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "9999")
  if [ "${MS:-9999}" -lt 500 ]; then ok "$endpoint → ${MS}ms"; else fail "$endpoint → ${MS}ms (slow)"; fi
done

# ─── Summary ─────────────────────────────────────────
echo -e "\n${Y}═══════════════════════════════${NC}"
TOTAL=$((PASS+FAIL))
echo -e "  Results: ${G}$PASS passed${NC}, ${R}$FAIL failed${NC} / $TOTAL total"
echo -e "${Y}═══════════════════════════════${NC}\n"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
