#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo Dev - Shared functions for dev/stop/restart scripts
# ═══════════════════════════════════════════════════════════

# Colors
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'

# ─── All microservices: name:directory:port ───────────────
SERVICES=(
  "auth:services/auth:3201"
  "users:services/users:3202"
  "social:services/social:3203"
  "messaging:services/messaging:3204"
  "content:services/content:3205"
  "notifications:services/notifications:3206"
  "gateway:services/gateway:3200"
)
ALL_PORTS="3100,3200,3201,3202,3203,3204,3205,3206"

# ─── Helpers ─────────────────────────────────────────────
header() { echo -e "\n${B}══════════════════════════════════════${NC}"; echo -e "${B}  $1${NC}"; echo -e "${B}══════════════════════════════════════${NC}\n"; }
step()   { echo -e "${Y}[$1] $2${NC}"; }
ok()     { echo -e "  ${G}✓${NC} $1"; }
warn()   { echo -e "  ${Y}⚠${NC} $1"; }
fail()   { echo -e "  ${R}✗${NC} $1"; }

# ─── Kill all processes on Miamo ports ───────────────────
kill_all() {
  pkill -9 -f "tsx.*services/" 2>/dev/null || true
  pkill -9 -f "tsx.*server.ts" 2>/dev/null || true
  pkill -9 -f "next dev.*3100" 2>/dev/null || true
  lsof -ti:${ALL_PORTS} 2>/dev/null | xargs kill -9 2>/dev/null || true
  sleep 2
  # Double-check
  local busy=$(lsof -ti:${ALL_PORTS} 2>/dev/null || true)
  if [ -n "$busy" ]; then
    echo "$busy" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  rm -f "$ROOT/.miamo-pids"
}

# ─── Load environment variables ──────────────────────────
load_env() {
  export DATABASE_URL="postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev"
  export JWT_SECRET="miamo-dev-jwt-secret-change-in-production-2026"
  export JWT_REFRESH_SECRET="miamo-dev-refresh-secret-change-in-production-2026"
  export INTERNAL_SERVICE_KEY="miamo-internal-dev-key"
  export FRONTEND_URL="http://localhost:3100"
  export NODE_ENV="development"
}

# ─── Ensure PostgreSQL is running ────────────────────────
ensure_postgres() {
  if command -v docker &>/dev/null && docker ps 2>/dev/null | grep -q "postgres"; then
    ok "PostgreSQL running (Docker)"
  elif pg_isready -h localhost -p 5432 2>/dev/null | grep -q "accepting"; then
    ok "PostgreSQL running (local)"
  elif command -v docker &>/dev/null; then
    echo -e "  ${Y}Starting PostgreSQL...${NC}"
    docker compose up -d postgres 2>/dev/null || \
    docker-compose up -d postgres 2>/dev/null || \
    docker run -d --name miamo-postgres \
      -e POSTGRES_USER=miamo -e POSTGRES_PASSWORD=miamo_dev_pass \
      -e POSTGRES_DB=miamo_dev -p 5432:5432 postgres:16-alpine 2>/dev/null || true
    sleep 3
    ok "PostgreSQL started"
  else
    fail "PostgreSQL not found. Run: docker compose up -d postgres"
    exit 1
  fi
}

# ─── Install dependencies if missing ────────────────────
install_deps() {
  for svc in "${SERVICES[@]}"; do
    local dir=$(echo "$svc" | cut -d: -f2)
    local name=$(echo "$svc" | cut -d: -f1)
    if [ ! -d "$ROOT/$dir/node_modules" ]; then
      echo -e "  ${Y}Installing $name deps...${NC}"
      (cd "$ROOT/$dir" && npm install --silent 2>&1 | tail -2)
    fi
  done
  if [ ! -d "$ROOT/web/node_modules" ]; then
    (cd "$ROOT/web" && npm install --silent 2>&1 | tail -2)
  fi
  if [ ! -d "$ROOT/api/node_modules/.prisma" ]; then
    (cd "$ROOT/api" && npx prisma generate 2>&1 | tail -2)
  fi
}

# ─── Seed database if empty (deterministic data) ────────
seed_if_empty() {
  local count=$(cd "$ROOT/api" && npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
  if [ "$count" = "0" ] || [ -z "$count" ]; then
    echo -e "  ${Y}Seeding database (deterministic test data)...${NC}"
    (cd "$ROOT/api" && npx tsx prisma/seed.ts 2>&1 | tail -3)
    ok "Database seeded"
  else
    ok "Database has $count users (skip seed)"
  fi
}

# ─── Start all services + web ────────────────────────────
start_all_services() {
  mkdir -p "$ROOT/.logs"
  > "$ROOT/.miamo-pids"

  # Start microservices
  for svc in "${SERVICES[@]}"; do
    local name=$(echo "$svc" | cut -d: -f1)
    local dir=$(echo "$svc" | cut -d: -f2)
    local port=$(echo "$svc" | cut -d: -f3)
    (cd "$ROOT/$dir" && npx tsx src/server.ts > "$ROOT/.logs/$name.log" 2>&1 &)
    echo $! >> "$ROOT/.miamo-pids"
    echo -e "  ${G}●${NC} $name → :$port"
  done

  # Start web
  (cd "$ROOT/web" && npx next dev -p 3100 > "$ROOT/.logs/web.log" 2>&1 &)
  echo $! >> "$ROOT/.miamo-pids"
  echo -e "  ${G}●${NC} web → :3100"

  # Health checks
  echo -e "\n${Y}  Waiting for services...${NC}"
  sleep 5

  local all_ok=true
  for svc in "${SERVICES[@]}"; do
    local name=$(echo "$svc" | cut -d: -f1)
    local port=$(echo "$svc" | cut -d: -f3)
    if curl -s "http://localhost:$port/health" --max-time 3 >/dev/null 2>&1; then
      ok "$name (:$port)"
    else
      fail "$name (:$port) — check .logs/$name.log"
      all_ok=false
    fi
  done

  echo ""
  [ "$all_ok" = true ] && ok "ALL SERVICES HEALTHY" || warn "Some services need attention"
}

# ─── Footer ─────────────────────────────────────────────
footer() {
  echo ""
  echo -e "${B}══════════════════════════════════════${NC}"
  echo -e "  Web:      ${G}http://localhost:3100${NC}"
  echo -e "  Gateway:  ${G}http://localhost:3200${NC}"
  echo -e "  Logs:     .logs/"
  echo -e "${B}══════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${Y}bash scripts/dev.sh${NC}      — start all (+ DB + seed)"
  echo -e "  ${Y}bash scripts/restart.sh${NC}  — restart services only"
  echo -e "  ${Y}bash scripts/stop.sh${NC}     — stop all"
  echo ""
}
