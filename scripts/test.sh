#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Miamo — Test Suite (Kubernetes)
# ═══════════════════════════════════════════════════════════════════
# Usage: bash scripts/test.sh <env>
# ALL values come from configuration — zero hardcoded ports/hosts.
# ═══════════════════════════════════════════════════════════════════
set -e
source "$(dirname "$0")/_config.sh" "${1:-}"

PASS=0; FAIL=0
pass() { echo -e "  ${G}✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${R}✗${NC} $1"; FAIL=$((FAIL + 1)); }

echo -e "\n${B}═══ MIAMO K8S TEST SUITE [${ENV}] ═══${NC}\n"

# ─── 1. Pod Health ────────────────────────────────────────────────
echo -e "${Y}[1/4] Pod Status${NC}"
EXPECTED_RUNNING=(auth users social messaging content notifications gateway web postgres redis)
for svc in "${EXPECTED_RUNNING[@]}"; do
  STATUS=$(kubectl get pods -n ${NAMESPACE} -l service=$svc --no-headers 2>/dev/null | awk '{print $3}' | head -1)
  if [[ "$STATUS" == "Running" ]]; then
    pass "$svc pod running"
  else
    fail "$svc pod NOT running (status: $STATUS)"
  fi
done

MIGRATE_STATUS=$(kubectl get pods -n ${NAMESPACE} -l service=migrate --no-headers 2>/dev/null | awk '{print $3}' | head -1)
if [[ "$MIGRATE_STATUS" == "Completed" ]]; then
  pass "migrate job completed"
else
  fail "migrate job not completed (status: $MIGRATE_STATUS)"
fi

# ─── 2. Internal Service Health (via k8s Service port) ────────────
echo -e "\n${Y}[2/4] Internal Service Health (port ${SERVICE_PORT})${NC}"
INTERNAL_SERVICES=(auth users social messaging content notifications gateway)
for svc in "${INTERNAL_SERVICES[@]}"; do
  RESP=$(kubectl exec -n ${NAMESPACE} deployment/gateway -- wget -qO- "http://${svc}:${SERVICE_PORT}/health" 2>/dev/null || echo "UNREACHABLE")
  if echo "$RESP" | grep -q '"ok"'; then
    pass "${svc}:${SERVICE_PORT} health ok"
  else
    fail "${svc}:${SERVICE_PORT} unreachable"
  fi
done

# ─── 3. Gateway → Microservices ───────────────────────────────────
echo -e "\n${Y}[3/4] Gateway Service Discovery${NC}"
GW_HEALTH=$(kubectl exec -n ${NAMESPACE} deployment/gateway -- wget -qO- http://127.0.0.1:${GATEWAY_PORT}/health 2>/dev/null || echo "{}")
for svc in auth users social messaging content notifications; do
  if echo "$GW_HEALTH" | grep -q "\"$svc\":\"ok\""; then
    pass "gateway → $svc: ok"
  else
    fail "gateway → $svc: unreachable"
  fi
done

# ─── 4. E2E Auth ──────────────────────────────────────────────────
echo -e "\n${Y}[4/4] End-to-End Auth Test${NC}"
LOGIN_RESP=$(kubectl exec -n ${NAMESPACE} deployment/gateway -- wget -qO- \
  --post-data='{"email":"miamo1@miamo.test","password":"miamo1"}' \
  --header='Content-Type: application/json' \
  http://127.0.0.1:${GATEWAY_PORT}/api/v1/auth/login 2>/dev/null || echo "FAILED")
if echo "$LOGIN_RESP" | grep -q "accessToken"; then
  pass "Login miamo1@miamo.test → token received"
  USERNAME=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user']['displayName'])" 2>/dev/null || echo "?")
  pass "User: $USERNAME"
else
  fail "Login failed"
fi

# ─── Results ──────────────────────────────────────────────────────
echo -e "\n${B}═══════════════════════════════════════${NC}"
TOTAL=$((PASS + FAIL))
echo -e "  Results: ${G}${PASS} passed${NC}, ${R}${FAIL} failed${NC} / ${TOTAL} total"
echo -e "${B}═══════════════════════════════════════${NC}\n"
[[ $FAIL -gt 0 ]] && exit 1 || exit 0
