#!/bin/bash
set -e

export DATABASE_URL="postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev"
export JWT_SECRET="miamo-dev-jwt-secret-change-in-production-2026"
export JWT_REFRESH_SECRET="miamo-dev-refresh-secret-change-in-production-2026"
export INTERNAL_SERVICE_KEY="miamo-internal-dev-key"
export FRONTEND_URL="http://localhost:3100"
export NODE_ENV="development"

cd "$(dirname "$0")/.."
ROOT=$(pwd)

echo "Starting services with DATABASE_URL on port 5432..."

# Start each service in background
nohup npx tsx "$ROOT/services/auth/src/server.ts" > /tmp/auth.log 2>&1 &
echo "Auth PID: $!"

nohup npx tsx "$ROOT/services/users/src/server.ts" > /tmp/users.log 2>&1 &
echo "Users PID: $!"

nohup npx tsx "$ROOT/services/social/src/server.ts" > /tmp/social.log 2>&1 &
echo "Social PID: $!"

nohup npx tsx "$ROOT/services/messaging/src/server.ts" > /tmp/messaging.log 2>&1 &
echo "Messaging PID: $!"

nohup npx tsx "$ROOT/services/content/src/server.ts" > /tmp/content.log 2>&1 &
echo "Content PID: $!"

nohup npx tsx "$ROOT/services/notifications/src/server.ts" > /tmp/notifications.log 2>&1 &
echo "Notifications PID: $!"

# Gateway last
nohup npx tsx "$ROOT/services/gateway/src/server.ts" > /tmp/gateway.log 2>&1 &
echo "Gateway PID: $!"

echo "All services starting..."
sleep 8

echo "=== Service Status ==="
for f in /tmp/auth.log /tmp/users.log /tmp/social.log /tmp/messaging.log /tmp/content.log /tmp/notifications.log /tmp/gateway.log; do
  name=$(basename $f .log)
  if grep -q "port\|running\|listening" "$f" 2>/dev/null; then
    echo "  $name: STARTED"
  elif grep -q "error\|Error\|ERROR" "$f" 2>/dev/null; then
    echo "  $name: ERROR - $(grep -i error "$f" | head -1)"
  else
    echo "  $name: UNKNOWN ($(wc -l < "$f") lines in log)"
  fi
done
