#!/bin/bash
# ═══ Miamo — Test Suite (Kubernetes) ═══
# Verifies all pods are running and services respond correctly
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'
PASS=0; FAIL=0

pass() { echo -e "  ${G}✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${R}✗${NC} $1"; FAIL=$((FAIL + 1)); }

echo -e "\n${B}═══ MIAMO K8S TEST SUITE ═══${NC}\n"

# ─── 1. Pod Health ───────────────────────────────────────
echo -e "${Y}[1/4] Pod Status${NC}"
EXPECTED_RUNNING=(auth users social messaging content notifications gateway web postgres redis)
for svc in "${EXPECTED_RUNNING[@]}"; do
  STATUS=$(kubectl get pods -n miamo -l service=$svc --no-headers 2>/dev/null | awk '{print $3}' | head -1)
  if [[ "$STATUS" == "Running" ]]; then
    pass "$svc pod running"
  else
    fail "$svc pod NOT running (status: $STATUS)"
  fi
done

# Check migrate job completed
MIGRATE_STATUS=$(kubectl get pods -n miamo -l service=migrate --no-headers 2>/dev/null | awk '{print $3}' | head -1)
if [[ "$MIGRATE_STATUS" == "Completed" ]]; then
  pass "migrate job completed"
else
  fail "migrate job not completed (status: $MIGRATE_STATUS)"
fi

# ─── 2. Service Connectivity (from within cluster) ───────
echo -e "\n${Y}[2/4] Internal Service Health${NC}"
SERVICES_PORTS=("auth:3201" "users:3202" "social:3203" "messaging:3204" "content:3205" "notifications:3206" "gateway:3200")
for sp in "${SERVICES_PORTS[@]}"; do
  SVC=${sp%%:*}
  PORT=${sp##*:}
  RESP=$(kubectl exec -n miamo deployment/gateway -- wget -qO- "http://$SVC:$PORT/health" 2>/dev/null || echo "UNREACHABLE")
  if echo "$RESP" | grep -q '"ok"'; then
    pass "$SVC:$PORT health ok"
  else
    fail "$SVC:$PORT unreachable"
  fi
done

# ─── 3. Gateway Health Aggregation ───────────────────────
echo -e "\n${Y}[3/4] Gateway Service Discovery${NC}"
GW_HEALTH=$(kubectl exec -n miamo deployment/gateway -- wget -qO- http://127.0.0.1:3200/health 2>/dev/null || echo "{}")
for svc in auth users social messaging content notifications; do
  if echo "$GW_HEALTH" | grep -q "\"$svc\":\"ok\""; then
    pass "gateway → $svc: ok"
  else
    fail "gateway → $svc: unreachable"
  fi
done

# ─── 4. Auth Login E2E ───────────────────────────────────
echo -e "\n${Y}[4/4] End-to-End Auth Test${NC}"
LOGIN_RESP=$(kubectl exec -n miamo deployment/gateway -- wget -qO- --post-data='{"email":"miamo1@miamo.test","password":"miamo1"}' --header='Content-Type: application/json' http://127.0.0.1:3200/api/v1/auth/login 2>/dev/null || echo "FAILED")
if echo "$LOGIN_RESP" | grep -q "accessToken"; then
  pass "Login miamo1@miamo.test → token received"
  USERNAME=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user']['displayName'])" 2>/dev/null || echo "?")
  pass "User: $USERNAME"
else
  fail "Login failed"
fi

# ─── Results ─────────────────────────────────────────────
echo -e "\n${B}═══════════════════════════════════════${NC}"
TOTAL=$((PASS + FAIL))
echo -e "  Results: ${G}${PASS} passed${NC}, ${R}${FAIL} failed${NC} / ${TOTAL} total"
echo -e "${B}═══════════════════════════════════════${NC}\n"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
