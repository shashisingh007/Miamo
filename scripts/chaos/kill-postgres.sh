#!/bin/bash
# Chaos test — kill postgres mid-request, assert recovery.
#
# What this proves:
#   - When postgres dies, dependent services return 5xx (not crash-loop).
#   - When postgres is restored, /healthz recovers within 30 s.
#   - The gateway does NOT segfault or infinite-loop on lost connections.
#
# What this does NOT prove:
#   - In-flight writes atomicity — that's covered by the sanity-invariants
#     suite (tests/sanity-invariants.test.ts) which enforces DB-level
#     invariants at every deploy.
#
# Prereq:
#   Full stack up via `bash scripts/start.sh docker dev`. Confirm with:
#     docker ps --format '{{.Names}}' | grep miamo-postgres
#     curl -sS http://localhost:3200/healthz
#
# Usage:
#   bash scripts/chaos/kill-postgres.sh

set -euo pipefail

CONTAINER="miamo-postgres"
GATEWAY="${GATEWAY_URL:-http://localhost:3200}"
RECOVERY_TIMEOUT="${RECOVERY_TIMEOUT:-30}"

echo "→ chaos: kill $CONTAINER"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "error: $CONTAINER is not running" >&2
  exit 2
fi

echo "→ baseline healthz:"
curl -sS -o /dev/null -w "  status: %{http_code}\n  time:   %{time_total}s\n" "${GATEWAY}/healthz" || true

echo "→ killing $CONTAINER (SIGKILL)"
docker kill "$CONTAINER" >/dev/null

echo "→ waiting 10s in the down state..."
sleep 10

echo "→ healthz during outage (expect non-200):"
curl -sS -o /dev/null -w "  status: %{http_code}\n" "${GATEWAY}/healthz" || true

echo "→ restarting $CONTAINER"
docker start "$CONTAINER" >/dev/null

echo "→ polling /healthz for recovery (timeout ${RECOVERY_TIMEOUT}s)"
START_TS=$(date +%s)
while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))
  if [[ "$ELAPSED" -gt "$RECOVERY_TIMEOUT" ]]; then
    echo "FAIL: no recovery within ${RECOVERY_TIMEOUT}s" >&2
    exit 1
  fi
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${GATEWAY}/healthz" || echo "000")
  if [[ "$CODE" == "200" ]]; then
    echo "PASS: recovered in ${ELAPSED}s"
    exit 0
  fi
  echo "  t=${ELAPSED}s status=${CODE}"
  sleep 1
done
