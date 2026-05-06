#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo Dev Environment - Single Start Script
# Usage: bash scripts/dev.sh
# ═══════════════════════════════════════════════════════════
set -e

cd "$(dirname "$0")/.."
ROOT=$(pwd)

# Colors
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'

echo -e "${B}══════════════════════════════════════${NC}"
echo -e "${B}       MIAMO DEV ENVIRONMENT          ${NC}"
echo -e "${B}══════════════════════════════════════${NC}"
echo ""

# ─── Step 1: Kill ALL previous processes ─────────────────
echo -e "${Y}[1/5] Killing previous processes...${NC}"

# Kill any node/tsx/next processes from previous runs
pkill -9 -f "tsx.*services/" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "tsx.*server.ts" 2>/dev/null || true

# Kill by ports (3100=web, 3200=gateway, 3201=auth, 3202=users, 3203=social, 3205=content)
lsof -ti:3100,3200,3201,3202,3203,3205 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2

# Verify ports are free
BUSY=$(lsof -ti:3100,3200,3201,3202,3203,3205 2>/dev/null || true)
if [ -n "$BUSY" ]; then
  echo -e "${R}  ✗ Some ports still busy, force killing...${NC}"
  echo "$BUSY" | xargs kill -9 2>/dev/null || true
  sleep 1
fi
echo -e "${G}  ✓ All ports free${NC}"

# ─── Step 2: Check & Start PostgreSQL ────────────────────
echo -e "${Y}[2/5] Checking PostgreSQL...${NC}"

if command -v docker &>/dev/null && docker ps 2>/dev/null | grep -q "miamo.*postgres"; then
  echo -e "${G}  ✓ PostgreSQL running (Docker)${NC}"
elif pg_isready -h localhost -p 5432 2>/dev/null | grep -q "accepting"; then
  echo -e "${G}  ✓ PostgreSQL running (local)${NC}"
elif command -v docker &>/dev/null; then
  echo -e "${Y}  Starting PostgreSQL via Docker...${NC}"
  docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres 2>/dev/null || {
    # Fallback: start standalone postgres container
    docker run -d --name miamo-postgres \
      -e POSTGRES_USER=miamo \
      -e POSTGRES_PASSWORD=miamo_dev_pass \
      -e POSTGRES_DB=miamo_dev \
      -p 5432:5432 \
      postgres:16-alpine 2>/dev/null || true
  }
  sleep 3
  echo -e "${G}  ✓ PostgreSQL started${NC}"
elif brew services list 2>/dev/null | grep -q postgresql; then
  brew services start postgresql 2>/dev/null
  sleep 2
  echo -e "${G}  ✓ PostgreSQL started (brew)${NC}"
else
  echo -e "${R}  ✗ Cannot find PostgreSQL. Please start it manually.${NC}"
  echo -e "${R}    Run: docker compose up -d postgres${NC}"
  exit 1
fi

# Verify DB connection
if pg_isready -h localhost -p 5432 2>/dev/null | grep -q "accepting"; then
  echo -e "${G}  ✓ Database connection verified${NC}"
else
  echo -e "${Y}  ⚠ Could not verify DB - services may still connect${NC}"
fi

# ─── Step 3: Set Environment & Install deps if needed ────
echo -e "${Y}[3/5] Setting up environment...${NC}"

export DATABASE_URL="postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev"
export JWT_SECRET="miamo-dev-jwt-secret-change-in-production-2026"
export JWT_REFRESH_SECRET="miamo-dev-refresh-secret-change-in-production-2026"
export INTERNAL_SERVICE_KEY="miamo-internal-dev-key"
export FRONTEND_URL="http://localhost:3100"
export NODE_ENV="development"

# Check if node_modules exist, install if not
if [ ! -d "$ROOT/api/node_modules" ]; then
  echo -e "${Y}  Installing API dependencies...${NC}"
  cd "$ROOT/api" && npm install --silent 2>&1 | tail -3
fi

if [ ! -d "$ROOT/web/node_modules" ]; then
  echo -e "${Y}  Installing Web dependencies...${NC}"
  cd "$ROOT/web" && npm install --silent 2>&1 | tail -3
fi

# Check services node_modules
for svc in auth users social content gateway; do
  if [ ! -d "$ROOT/services/$svc/node_modules" ]; then
    echo -e "${Y}  Installing $svc dependencies...${NC}"
    cd "$ROOT/services/$svc" && npm install --silent 2>&1 | tail -2
  fi
done

# Generate Prisma client if needed
if [ ! -d "$ROOT/api/node_modules/.prisma" ]; then
  echo -e "${Y}  Generating Prisma client...${NC}"
  cd "$ROOT/api" && npx prisma generate 2>&1 | tail -2
fi

echo -e "${G}  ✓ Environment ready${NC}"

# ─── Step 4: Run Prisma migrations ──────────────────────
echo -e "${Y}[4/5] Running database migrations...${NC}"
cd "$ROOT/api"
npx prisma migrate deploy 2>&1 | tail -3 || echo -e "${Y}  ⚠ Migration warning (may already be applied)${NC}"

# Seed if DB is empty
USER_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo -e "${Y}  Seeding database...${NC}"
  npx tsx prisma/seed.ts 2>&1 | tail -3
  echo -e "${G}  ✓ Database seeded${NC}"
else
  echo -e "${G}  ✓ Database has $USER_COUNT users (skipping seed)${NC}"
fi

# ─── Step 5: Start all services ─────────────────────────
echo -e "${Y}[5/5] Starting services...${NC}"
mkdir -p "$ROOT/.logs"

start_service() {
  local name=$1 dir=$2 port=$3
  cd "$ROOT/$dir"
  npx tsx src/server.ts > "$ROOT/.logs/$name.log" 2>&1 &
  echo $! >> "$ROOT/.miamo-pids"
  echo -e "  ${G}●${NC} $name → :$port"
}

# Clear PID file
> "$ROOT/.miamo-pids"

start_service "auth"    "services/auth"    3201
start_service "users"   "services/users"   3202
start_service "social"  "services/social"  3203
start_service "content" "services/content" 3205
start_service "gateway" "services/gateway" 3200

# Wait for backend services
echo -e "${Y}  Waiting for services to initialize...${NC}"
sleep 5

# Health checks
ALL_HEALTHY=true
for pair in "auth:3201" "users:3202" "social:3203" "content:3205" "gateway:3200"; do
  name="${pair%%:*}"
  port="${pair##*:}"
  if curl -s "http://localhost:$port/health" --max-time 3 > /dev/null 2>&1; then
    echo -e "  ${G}✓${NC} $name (:$port) healthy"
  else
    echo -e "  ${R}✗${NC} $name (:$port) not responding - check .logs/$name.log"
    ALL_HEALTHY=false
  fi
done

# Start Next.js web
echo -e "  ${G}●${NC} web → :3100"
cd "$ROOT/web"
npx next dev -p 3100 > "$ROOT/.logs/web.log" 2>&1 &
echo $! >> "$ROOT/.miamo-pids"

echo ""
echo -e "${B}══════════════════════════════════════${NC}"
if [ "$ALL_HEALTHY" = true ]; then
  echo -e "${G}  ✓ ALL SERVICES RUNNING${NC}"
else
  echo -e "${Y}  ⚠ Some services need attention${NC}"
fi
echo -e "${B}══════════════════════════════════════${NC}"
echo ""
echo -e "  Web App:  ${G}http://localhost:3100${NC}"
echo -e "  Gateway:  ${G}http://localhost:3200${NC}"
echo -e "  Logs:     .logs/ directory"
echo ""
echo -e "  Stop all: ${Y}bash scripts/stop.sh${NC}"
echo ""
