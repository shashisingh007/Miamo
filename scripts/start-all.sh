#!/bin/bash
# Simple Miamo service starter - no fancy output, just works
set -e
ROOT="/Users/singhshs/Library/CloudStorage/OneDrive-adidas/Desktop/Miamo"
LOG="$ROOT/.logs"
mkdir -p "$LOG"

export NODE_ENV=development
export DATABASE_URL="postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="miamo-dev-jwt-secret-change-in-production-2026"
export JWT_REFRESH_SECRET="miamo-dev-refresh-secret-change-in-production-2026"
export INTERNAL_SERVICE_KEY="miamo-internal-dev-key"
export FRONTEND_URL="http://localhost:3100"
export AUTH_SERVICE_URL="http://localhost:3201"
export USER_SERVICE_URL="http://localhost:3202"
export SOCIAL_SERVICE_URL="http://localhost:3203"
export MESSAGING_SERVICE_URL="http://localhost:3204"
export CONTENT_SERVICE_URL="http://localhost:3205"
export NOTIFICATION_SERVICE_URL="http://localhost:3206"

echo "Starting services..."

cd "$ROOT/services/auth" && PORT=3201 npx tsx src/server.ts > "$LOG/auth.log" 2>&1 &
echo "auth PID=$!"

cd "$ROOT/services/users" && PORT=3202 npx tsx src/server.ts > "$LOG/users.log" 2>&1 &
echo "users PID=$!"

cd "$ROOT/services/social" && PORT=3203 npx tsx src/server.ts > "$LOG/social.log" 2>&1 &
echo "social PID=$!"

cd "$ROOT/services/messaging" && PORT=3204 npx tsx src/server.ts > "$LOG/messaging.log" 2>&1 &
echo "messaging PID=$!"

cd "$ROOT/services/content" && PORT=3205 npx tsx src/server.ts > "$LOG/content.log" 2>&1 &
echo "content PID=$!"

cd "$ROOT/services/notifications" && PORT=3206 npx tsx src/server.ts > "$LOG/notifications.log" 2>&1 &
echo "notifications PID=$!"

echo "Waiting for backend services to start..."
sleep 3

cd "$ROOT/services/gateway" && PORT=3200 npx tsx src/server.ts > "$LOG/gateway.log" 2>&1 &
echo "gateway PID=$!"

sleep 2

cd "$ROOT/web" && NEXT_PUBLIC_API_URL=http://localhost:3200 npx next dev -p 3100 > "$LOG/web.log" 2>&1 &
echo "web PID=$!"

sleep 5

echo ""
echo "Checking ports..."
for port in 3201 3202 3203 3204 3205 3206 3200 3100; do
  if lsof -ti :$port > /dev/null 2>&1; then
    echo "  port $port is up"
  else
    echo "  port $port FAILED"
  fi
done

echo ""
echo "Done! Services running in background."
echo "To stop: pkill -f tsx.src.server; pkill -f next.dev"
