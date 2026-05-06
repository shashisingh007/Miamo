#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo — START (Docker Compose)
# Builds images, starts all containers, waits for health
# ═══════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/.."

# Colors
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'

echo -e "\n${B}══════════════════════════════════════${NC}"
echo -e "${B}  MIAMO — DOCKER START${NC}"
echo -e "${B}══════════════════════════════════════${NC}\n"

# ─── Pre-flight checks ───────────────────────────────
if ! command -v docker &>/dev/null; then
  echo -e "${R}✗ Docker not found. Install Docker Desktop first.${NC}"; exit 1
fi
if ! docker info &>/dev/null 2>&1; then
  echo -e "${R}✗ Docker daemon not running. Start Docker Desktop.${NC}"; exit 1
fi

# ─── Clean up any old containers on same ports ────────
echo -e "${Y}[1/4]${NC} Cleaning up..."
docker-compose down --remove-orphans 2>/dev/null || true
echo -e "  ${G}✓${NC} Previous containers removed"

# ─── Build images (with BuildKit cache) ──────────────
echo -e "${Y}[2/4]${NC} Building images (parallel)..."
docker-compose build --parallel 2>&1 | tail -5
echo -e "  ${G}✓${NC} All images built"

# ─── Start everything ────────────────────────────────
echo -e "${Y}[3/4]${NC} Starting services..."
docker-compose up -d
echo -e "  ${G}✓${NC} Containers started"

# ─── Wait for health ─────────────────────────────────
echo -e "${Y}[4/4]${NC} Waiting for services to be healthy..."
SERVICES="postgres redis auth users social messaging content notifications gateway web"
MAX_WAIT=120
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  ALL_HEALTHY=true
  for svc in $SERVICES; do
    STATUS=$(docker-compose ps --format json "$svc" 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('Health',''))" 2>/dev/null || echo "")
    if [ "$STATUS" != "healthy" ] && [ "$STATUS" != "" ]; then
      ALL_HEALTHY=false
      break
    fi
  done

  # Check if all running (even without health = running state)
  RUNNING=$(docker-compose ps --status running --format '{{.Name}}' 2>/dev/null | wc -l | tr -d ' ')
  if [ "$RUNNING" -ge 9 ]; then
    # Give gateway + web extra time for health
    sleep 3
    break
  fi

  sleep 3
  ELAPSED=$((ELAPSED + 3))
  printf "  ⏳ %ds...\r" "$ELAPSED"
done
echo ""

# ─── Status report ───────────────────────────────────
echo -e "\n${B}── Service Status ──────────────────────${NC}"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | head -15

echo -e "\n${B}══════════════════════════════════════${NC}"
echo -e "  Web:       ${G}http://localhost:3100${NC}"
echo -e "  Gateway:   ${G}http://localhost:3200${NC}"
echo -e "  Postgres:  ${G}localhost:5432${NC}"
echo -e "  Redis:     ${G}localhost:6379${NC}"
echo -e "${B}══════════════════════════════════════${NC}"
echo -e ""
echo -e "  ${Y}docker-compose logs -f${NC}         — stream all logs"
echo -e "  ${Y}docker-compose logs -f gateway${NC} — tail one service"
echo -e "  ${Y}bash scripts/stop.sh${NC}           — stop all"
echo -e "  ${Y}bash scripts/restart.sh${NC}        — restart services"
echo -e ""
