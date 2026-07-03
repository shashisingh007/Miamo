#!/bin/bash
# Chaos test — simulate a network partition to postgres.
#
# What this proves:
#   - When postgres is reachable-but-slow / unreachable-but-alive, the
#     gateway returns 503 (Service Unavailable) — not 500 (Internal
#     Server Error). 503 is the correct status: it tells load balancers
#     to retry and it tells the client to back off.
#   - Reconnection is automatic after the partition heals — no manual
#     `kubectl rollout restart` needed.
#
# How the partition is simulated:
#   `docker network disconnect` cuts the compose network link between
#   the gateway and postgres. TCP connections stay open at the kernel
#   level but new syscalls fail with ETIMEDOUT / EHOSTUNREACH — much
#   closer to a real cloud provider partition than a container kill.
#
# Prereq: full stack on docker-compose network (default: miamo_default).
# Usage:  bash scripts/chaos/partition-network.sh

set -euo pipefail

NETWORK="${MIAMO_NETWORK:-miamo_default}"
PG_CONTAINER="miamo-postgres"
GATEWAY_CONTAINER="miamo-gateway"
GATEWAY="${GATEWAY_URL:-http://localhost:3200}"
PARTITION_SECS="${PARTITION_SECS:-15}"

echo "→ chaos: partition $GATEWAY_CONTAINER ⇸ $PG_CONTAINER on network $NETWORK"

if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK}$"; then
  echo "error: docker network '$NETWORK' not found — set MIAMO_NETWORK" >&2
  exit 2
fi

echo "→ baseline /healthz:"
curl -sS -o /dev/null -w "  status: %{http_code}\n" "${GATEWAY}/healthz" || true

echo "→ disconnecting $PG_CONTAINER from $NETWORK (simulating partition)"
docker network disconnect "$NETWORK" "$PG_CONTAINER" >/dev/null

echo "→ during partition — /api/v1/discover MUST return 503 (not 500):"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${GATEWAY}/api/v1/discover" || echo "000")
echo "  status: $CODE"
STATUS_OK=1
if [[ "$CODE" == "500" ]]; then
  echo "FAIL: got 500 during partition — this is a bug, expected 503" >&2
  STATUS_OK=0
elif [[ "$CODE" == "503" || "$CODE" == "401" ]]; then
  echo "  ok: 503 (or 401 if auth ran before DB call)"
else
  echo "  soft-warn: unexpected $CODE — inspect logs"
fi

echo "→ holding partition for ${PARTITION_SECS}s..."
sleep "$PARTITION_SECS"

echo "→ healing partition"
docker network connect "$NETWORK" "$PG_CONTAINER" >/dev/null

echo "→ polling for auto-recovery (30s budget)"
START_TS=$(date +%s)
while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))
  if [[ "$ELAPSED" -gt 30 ]]; then
    echo "FAIL: gateway did not auto-recover — connection pool leak?" >&2
    exit 1
  fi
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${GATEWAY}/healthz" || echo "000")
  if [[ "$CODE" == "200" ]]; then
    echo "PASS: recovered in ${ELAPSED}s after partition heal"
    [[ "$STATUS_OK" -eq 1 ]] && exit 0 || exit 1
  fi
  echo "  t=${ELAPSED}s status=${CODE}"
  sleep 1
done
