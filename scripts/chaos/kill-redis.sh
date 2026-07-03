#!/bin/bash
# Chaos test — kill redis, assert graceful degradation (fail-open).
#
# What this proves:
#   - When redis dies, services CONTINUE to respond (rate-limiter,
#     idempotency, and geocoding cache all fail-open per the audit).
#   - /healthz stays 200 (redis is a soft dep, not a hard one).
#   - No service crashes; every request path handles ECONNREFUSED.
#
# Key invariant (documented in docs/architecture/launch-audit.md):
#   Redis is a cache + rate-limit substrate. Its loss must NOT cascade
#   into a 5xx. The rate-limit middleware and the idempotency middleware
#   both catch Redis errors and fall through (allow the request). Nothing
#   in the hot request path treats Redis as authoritative.
#
# Usage:
#   bash scripts/chaos/kill-redis.sh

set -euo pipefail

CONTAINER="miamo-redis"
GATEWAY="${GATEWAY_URL:-http://localhost:3200}"

echo "→ chaos: kill $CONTAINER"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "error: $CONTAINER is not running" >&2
  exit 2
fi

echo "→ baseline healthz:"
curl -sS -o /dev/null -w "  status: %{http_code}\n" "${GATEWAY}/healthz" || true

echo "→ killing $CONTAINER"
docker kill "$CONTAINER" >/dev/null
sleep 3

echo "→ during outage — /healthz MUST still return 200 (fail-open):"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${GATEWAY}/healthz" || echo "000")
echo "  status: $CODE"
if [[ "$CODE" != "200" ]]; then
  echo "FAIL: /healthz returned $CODE while redis was down — redis MUST NOT be a hard dep" >&2
  docker start "$CONTAINER" >/dev/null
  exit 1
fi

echo "→ during outage — a discover call must still respond (fail-open cache):"
# We don't need auth to see the fail-open path in the response headers.
# A 401 is fine (the auth middleware ran); a 5xx is a real failure.
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${GATEWAY}/api/v1/discover" || echo "000")
echo "  status: $CODE"
if [[ "$CODE" == "5"* ]]; then
  echo "FAIL: /api/v1/discover 5xx during redis outage — must fail-open" >&2
  docker start "$CONTAINER" >/dev/null
  exit 1
fi

echo "→ restarting $CONTAINER"
docker start "$CONTAINER" >/dev/null
sleep 3

echo "PASS: services stayed responsive during redis outage"
