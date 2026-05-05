#!/bin/bash
# ═══════════════════════════════════════════════════════
# Miamo — Local Microservices Runner
# Starts all services + web app locally (no Docker needed)
# Usage:  bash scripts/run-local.sh [--web-port 3100] [--skip-seed]
# ═══════════════════════════════════════════════════════
set -e

# ─── Colors ───────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ─── Config ──────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/.logs"
PID_FILE="$ROOT_DIR/.miamo-pids"

WEB_PORT=3100
GATEWAY_PORT=3200
AUTH_PORT=3201
USERS_PORT=3202
SOCIAL_PORT=3203
MESSAGING_PORT=3204
CONTENT_PORT=3205
NOTIFICATIONS_PORT=3206

DB_URL="postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev"
REDIS_URL="redis://localhost:6379"
INTERNAL_KEY="miamo-internal-dev-key"
JWT_SECRET="miamo-dev-jwt-secret-change-in-production-2026"
JWT_REFRESH_SECRET="miamo-dev-refresh-secret-change-in-production-2026"
SKIP_SEED=false

# ─── Parse Args ──────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --web-port) WEB_PORT="$2"; shift 2 ;;
    --gateway-port) GATEWAY_PORT="$2"; shift 2 ;;
    --skip-seed) SKIP_SEED=true; shift ;;
    --skip-install) SKIP_INSTALL=true; shift ;;
    --db-url) DB_URL="$2"; shift 2 ;;
    -h|--help)
      echo ""
      echo "  Miamo Local Runner — start all microservices + web"
      echo ""
      echo "  Usage: bash scripts/run-local.sh [options]"
      echo ""
      echo "  Options:"
      echo "    --web-port <port>      Web app port (default: 3100)"
      echo "    --gateway-port <port>  API gateway port (default: 3200)"
      echo "    --skip-seed            Skip database seeding"
      echo "    --skip-install         Skip npm install"
      echo "    --db-url <url>         Custom database URL"
      echo "    -h, --help             Show this help"
      echo ""
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Banner ──────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       🌸 Miamo Microservices Runner      ║"
echo "  ║    Where connections become something    ║"
echo "  ║                  real.                   ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Cleanup function ────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}⏹  Shutting down all services...${NC}"
  if [ -f "$PID_FILE" ]; then
    while IFS='=' read -r name pid; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null && echo -e "  ${RED}■${NC} Stopped $name (PID $pid)"
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
  echo -e "${GREEN}✓ All services stopped.${NC}"
  echo ""
  exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Prerequisites ───────────────────────────────────
echo -e "${BOLD}1/7  Checking prerequisites...${NC}"

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "  ${RED}✗ $1 not found.${NC} $2"
    exit 1
  fi
  echo -e "  ${GREEN}✓${NC} $1 found"
}

check_cmd "node" "Install Node.js 20+: https://nodejs.org"
check_cmd "npm" "Comes with Node.js"
check_cmd "npx" "Comes with Node.js"

# Check Node version >= 18
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "  ${RED}✗ Node.js $NODE_VER is too old. Need 18+.${NC}"
  exit 1
fi

# Check if Postgres is reachable
if command -v pg_isready &>/dev/null; then
  if pg_isready -h localhost -p 5432 &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL reachable on localhost:5432"
  else
    echo -e "  ${YELLOW}⚠${NC} PostgreSQL not reachable — trying Docker..."
    if command -v docker &>/dev/null; then
      docker run -d --name miamo-postgres-local \
        -e POSTGRES_USER=miamo \
        -e POSTGRES_PASSWORD=miamo_dev_pass \
        -e POSTGRES_DB=miamo_dev \
        -p 5432:5432 \
        postgres:16-alpine >/dev/null 2>&1 || true
      echo -e "  ${GREEN}✓${NC} Started PostgreSQL via Docker"
      echo "  Waiting for PostgreSQL to be ready..."
      for i in {1..30}; do
        pg_isready -h localhost -p 5432 &>/dev/null && break
        sleep 1
      done
    else
      echo -e "  ${RED}✗ No PostgreSQL or Docker found.${NC}"
      echo "    Install PostgreSQL or Docker, then re-run."
      exit 1
    fi
  fi
else
  echo -e "  ${YELLOW}⚠${NC} pg_isready not found — assuming PostgreSQL is running"
fi

# Check if Redis is reachable
if command -v redis-cli &>/dev/null; then
  if redis-cli ping &>/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Redis reachable on localhost:6379"
  else
    echo -e "  ${YELLOW}⚠${NC} Redis not reachable — trying Docker..."
    if command -v docker &>/dev/null; then
      docker run -d --name miamo-redis-local -p 6379:6379 redis:7-alpine >/dev/null 2>&1 || true
      echo -e "  ${GREEN}✓${NC} Started Redis via Docker"
    else
      echo -e "  ${YELLOW}⚠${NC} No Redis — services will run without caching"
    fi
  fi
else
  echo -e "  ${YELLOW}⚠${NC} redis-cli not found — assuming Redis is running"
fi

echo ""

# ─── Create log dir ──────────────────────────────────
mkdir -p "$LOG_DIR"

# ─── Step 2: Sync Prisma Schema ─────────────────────
echo -e "${BOLD}2/7  Syncing Prisma schema to all services...${NC}"
bash "$SCRIPT_DIR/sync-prisma.sh"
echo ""

# ─── Step 3: Install Dependencies ───────────────────
echo -e "${BOLD}3/7  Installing dependencies...${NC}"
if [ "$SKIP_INSTALL" = true ]; then
  echo -e "  ${YELLOW}⏭  Skipped (--skip-install)${NC}"
else
  # Root
  cd "$ROOT_DIR"
  npm install --silent 2>/dev/null && echo -e "  ${GREEN}✓${NC} root"

  # Each microservice
  SERVICES=("gateway" "auth" "users" "social" "messaging" "content" "notifications")
  for svc in "${SERVICES[@]}"; do
    cd "$ROOT_DIR/services/$svc"
    npm install --silent 2>/dev/null && echo -e "  ${GREEN}✓${NC} services/$svc"
  done

  # Web
  cd "$ROOT_DIR/web"
  npm install --silent 2>/dev/null && echo -e "  ${GREEN}✓${NC} web"
fi
cd "$ROOT_DIR"
echo ""

# ─── Step 4: Prisma Generate + Migrate ──────────────
echo -e "${BOLD}4/7  Database setup (generate + migrate)...${NC}"

# Generate Prisma client for each service that has prisma
PRISMA_SERVICES=("auth" "users" "social" "messaging" "content" "notifications")
for svc in "${PRISMA_SERVICES[@]}"; do
  cd "$ROOT_DIR/services/$svc"
  npx prisma generate --schema=prisma/schema.prisma 2>/dev/null && echo -e "  ${GREEN}✓${NC} $svc prisma generate"
done

# Run migrate from auth service (any service works — same schema)
cd "$ROOT_DIR/services/auth"
DATABASE_URL="$DB_URL" npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null && echo -e "  ${GREEN}✓${NC} migrations applied" || echo -e "  ${YELLOW}⚠${NC} migration may have failed — check DB connection"

cd "$ROOT_DIR"
echo ""

# ─── Step 5: Seed Database ──────────────────────────
echo -e "${BOLD}5/7  Seeding database...${NC}"
if [ "$SKIP_SEED" = true ]; then
  echo -e "  ${YELLOW}⏭  Skipped (--skip-seed)${NC}"
else
  cd "$ROOT_DIR/api"
  DATABASE_URL="$DB_URL" npx tsx prisma/seed.ts 2>/dev/null && echo -e "  ${GREEN}✓${NC} seed data loaded" || echo -e "  ${YELLOW}⚠${NC} seed may have already been applied"
  cd "$ROOT_DIR"
fi
echo ""

# ─── Step 6: Start All Services ─────────────────────
echo -e "${BOLD}6/7  Starting all services...${NC}"
echo ""

# Clear old PIDs
rm -f "$PID_FILE"

# Common env for backend services
export NODE_ENV=development
export DATABASE_URL="$DB_URL"
export REDIS_URL="$REDIS_URL"
export INTERNAL_SERVICE_KEY="$INTERNAL_KEY"
export JWT_SECRET="$JWT_SECRET"
export JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
export FRONTEND_URL="http://localhost:$WEB_PORT"

# Service URLs (for gateway)
export AUTH_SERVICE_URL="http://localhost:$AUTH_PORT"
export USER_SERVICE_URL="http://localhost:$USERS_PORT"
export SOCIAL_SERVICE_URL="http://localhost:$SOCIAL_PORT"
export MESSAGING_SERVICE_URL="http://localhost:$MESSAGING_PORT"
export CONTENT_SERVICE_URL="http://localhost:$CONTENT_PORT"
export NOTIFICATION_SERVICE_URL="http://localhost:$NOTIFICATIONS_PORT"

start_service() {
  local name="$1"
  local dir="$2"
  local port="$3"
  local log="$LOG_DIR/$name.log"

  cd "$ROOT_DIR/$dir"
  PORT="$port" npx tsx src/server.ts > "$log" 2>&1 &
  local pid=$!
  echo "$name=$pid" >> "$PID_FILE"
  echo -e "  ${GREEN}▶${NC} $name → http://localhost:$port  ${CYAN}(PID $pid)${NC}"
  cd "$ROOT_DIR"
}

start_web() {
  local log="$LOG_DIR/web.log"
  cd "$ROOT_DIR/web"
  NEXT_PUBLIC_API_URL="http://localhost:$GATEWAY_PORT" npx next dev -p "$WEB_PORT" > "$log" 2>&1 &
  local pid=$!
  echo "web=$pid" >> "$PID_FILE"
  echo -e "  ${GREEN}▶${NC} web     → http://localhost:$WEB_PORT  ${CYAN}(PID $pid)${NC}"
  cd "$ROOT_DIR"
}

# Start backend services first
start_service "auth"          "services/auth"          "$AUTH_PORT"
start_service "users"         "services/users"         "$USERS_PORT"
start_service "social"        "services/social"        "$SOCIAL_PORT"
start_service "messaging"     "services/messaging"     "$MESSAGING_PORT"
start_service "content"       "services/content"       "$CONTENT_PORT"
start_service "notifications" "services/notifications" "$NOTIFICATIONS_PORT"

# Small delay for backend services to bind ports
sleep 2

# Start gateway (needs backend services)
start_service "gateway" "services/gateway" "$GATEWAY_PORT"

# Start web frontend
start_web

echo ""

# ─── Step 7: Health Checks ──────────────────────────
echo -e "${BOLD}7/7  Running health checks...${NC}"
echo "  Waiting 5s for services to initialize..."
sleep 5

ALL_HEALTHY=true
declare -a SVC_CHECKS=(
  "auth:$AUTH_PORT"
  "users:$USERS_PORT"
  "social:$SOCIAL_PORT"
  "messaging:$MESSAGING_PORT"
  "content:$CONTENT_PORT"
  "notifications:$NOTIFICATIONS_PORT"
  "gateway:$GATEWAY_PORT"
)

for entry in "${SVC_CHECKS[@]}"; do
  svc_name="${entry%%:*}"
  svc_port="${entry##*:}"
  
  healthy=false
  for attempt in {1..5}; do
    if curl -sf "http://localhost:$svc_port/health" >/dev/null 2>&1; then
      healthy=true
      break
    fi
    sleep 1
  done
  
  if $healthy; then
    echo -e "  ${GREEN}✓${NC} $svc_name (port $svc_port)"
  else
    echo -e "  ${RED}✗${NC} $svc_name (port $svc_port) — check $LOG_DIR/$svc_name.log"
    ALL_HEALTHY=false
  fi
done

# Web check (hits the page, not /health)
web_healthy=false
for attempt in {1..10}; do
  if curl -sf "http://localhost:$WEB_PORT" >/dev/null 2>&1; then
    web_healthy=true
    break
  fi
  sleep 2
done

if $web_healthy; then
  echo -e "  ${GREEN}✓${NC} web (port $WEB_PORT)"
else
  echo -e "  ${YELLOW}⚠${NC} web (port $WEB_PORT) — still starting, check $LOG_DIR/web.log"
fi

# ─── Summary ─────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if $ALL_HEALTHY; then
  echo -e "${GREEN}${BOLD}  🎉 All microservices are running!${NC}"
else
  echo -e "${YELLOW}${BOLD}  ⚠  Some services need attention. Check logs:${NC}"
  echo -e "     ls $LOG_DIR/"
fi
echo ""
echo -e "  ${BOLD}📍 Endpoints:${NC}"
echo -e "     ${BOLD}Web App:${NC}      ${GREEN}http://localhost:$WEB_PORT${NC}"
echo -e "     ${BOLD}API Gateway:${NC}  ${GREEN}http://localhost:$GATEWAY_PORT${NC}"
echo -e "     ${BOLD}API Health:${NC}   http://localhost:$GATEWAY_PORT/health"
echo ""
echo -e "  ${BOLD}🔌 Services:${NC}"
echo -e "     Auth:          http://localhost:$AUTH_PORT"
echo -e "     Users:         http://localhost:$USERS_PORT"
echo -e "     Social:        http://localhost:$SOCIAL_PORT"
echo -e "     Messaging:     http://localhost:$MESSAGING_PORT"
echo -e "     Content:       http://localhost:$CONTENT_PORT"
echo -e "     Notifications: http://localhost:$NOTIFICATIONS_PORT"
echo ""
echo -e "  ${BOLD}📋 Logs:${NC}        $LOG_DIR/<service>.log"
echo -e "  ${BOLD}🛑 Stop:${NC}        Press ${RED}Ctrl+C${NC} to stop all services"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─── Keep alive — wait for Ctrl+C ────────────────────
echo -e "${YELLOW}Watching services... (Ctrl+C to stop all)${NC}"
echo ""

# Monitor PIDs — restart if crashed
while true; do
  if [ -f "$PID_FILE" ]; then
    while IFS='=' read -r name pid; do
      if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "  ${RED}✗${NC} $name (PID $pid) crashed — check $LOG_DIR/$name.log"
      fi
    done < "$PID_FILE"
  fi
  sleep 10
done
