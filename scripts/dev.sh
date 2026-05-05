#!/bin/bash
# Miamo Dev - Single script to start all services efficiently
# Usage: bash scripts/dev.sh [--web-only | --api-only]

set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)

# Colors
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; NC='\033[0m'

# Kill any existing services
echo -e "${Y}Cleaning up old processes...${NC}"
lsof -ti:3100,3200,3201,3202,3203,3205 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Environment
export DATABASE_URL="postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev"
export JWT_SECRET="miamo-dev-jwt-secret-change-in-production-2026"
export JWT_REFRESH_SECRET="miamo-dev-refresh-secret-change-in-production-2026"
export INTERNAL_SERVICE_KEY="miamo-internal-dev-key"
export FRONTEND_URL="http://localhost:3100"
export NODE_ENV="development"

mkdir -p "$ROOT/.logs"

start_service() {
  local name=$1 dir=$2 port=$3
  echo -e "  Starting ${G}$name${NC} on :$port..."
  cd "$ROOT/$dir"
  npx tsx src/server.ts > "$ROOT/.logs/$name.log" 2>&1 &
  echo $! >> "$ROOT/.miamo-pids"
}

# Clear old PID file
> "$ROOT/.miamo-pids"

if [[ "$1" != "--web-only" ]]; then
  echo -e "${G}Starting API services...${NC}"
  start_service "auth"    "services/auth"    3201
  start_service "users"   "services/users"   3202
  start_service "social"  "services/social"  3203
  start_service "content" "services/content" 3205
  start_service "gateway" "services/gateway" 3200
  
  # Wait for services to be ready
  echo -e "${Y}Waiting for services...${NC}"
  sleep 4
  
  # Health check
  for port in 3201 3202 3203 3205 3200; do
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
      echo -e "  ${G}✓${NC} :$port healthy"
    else
      echo -e "  ${R}✗${NC} :$port not responding (check .logs/)"
    fi
  done
fi

if [[ "$1" != "--api-only" ]]; then
  echo -e "${G}Starting Next.js web...${NC}"
  cd "$ROOT/web"
  npx next dev -p 3100 > "$ROOT/.logs/web.log" 2>&1 &
  echo $! >> "$ROOT/.miamo-pids"
  echo -e "  ${G}✓${NC} Web starting on :3100 (takes ~30s first compile)"
fi

echo ""
echo -e "${G}All services launched!${NC}"
echo -e "  Web:     http://localhost:3100"
echo -e "  Gateway: http://localhost:3200"
echo -e "  Logs:    .logs/ directory"
echo -e "  Stop:    bash scripts/dev-stop.sh"
echo ""
