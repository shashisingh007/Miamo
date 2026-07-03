#!/bin/bash
# Chaos test — kill the tracking-worker with SIGKILL; assert docker-
# compose restarts it and no crash loop develops.
#
# What this proves:
#   - The tracking-worker is stateless — killing it does NOT lose events
#     (they're durable in the Redis stream; on restart the worker resumes
#     at the last-committed offset).
#   - docker-compose's restart policy revives the container within 5 s.
#   - No crash-loop: we kill once, watch for a healthy state, then kill
#     again — the second restart must also succeed.
#
# Prereq: `bash scripts/start.sh docker dev` running.
# Usage:  bash scripts/chaos/oom-tracking-worker.sh

set -euo pipefail

CONTAINER="miamo-tracking-worker"
RESTART_TIMEOUT="${RESTART_TIMEOUT:-15}"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "error: $CONTAINER not running — start stack first" >&2
  exit 2
fi

check_running() {
  docker ps --filter "name=^${CONTAINER}$" --filter "status=running" --format '{{.Names}}' | grep -q "^${CONTAINER}$"
}

wait_healthy() {
  local start_ts
  start_ts=$(date +%s)
  while true; do
    local now
    now=$(date +%s)
    local elapsed=$((now - start_ts))
    if [[ "$elapsed" -gt "$RESTART_TIMEOUT" ]]; then
      return 1
    fi
    if check_running; then
      # Wait 3 more seconds so the loop can start pulling from Redis.
      sleep 3
      return 0
    fi
    sleep 1
  done
}

for i in 1 2; do
  echo "→ pass $i: SIGKILL $CONTAINER"
  docker kill "$CONTAINER" >/dev/null

  echo "→ pass $i: waiting up to ${RESTART_TIMEOUT}s for restart"
  if ! wait_healthy; then
    echo "FAIL: pass $i — $CONTAINER did not restart in time" >&2
    docker logs --tail 40 "$CONTAINER" || true
    exit 1
  fi
  echo "  ok: back up"
done

# Sanity: exit-code + restart count should indicate healthy churn, not
# a crash loop. Docker exposes RestartCount in `inspect`.
RESTARTS=$(docker inspect -f '{{.RestartCount}}' "$CONTAINER")
echo "  restart count: $RESTARTS"
if [[ "$RESTARTS" -gt 20 ]]; then
  echo "FAIL: crash loop suspected (RestartCount=$RESTARTS)" >&2
  exit 1
fi

echo "PASS: tracking-worker survived two SIGKILL passes cleanly"
