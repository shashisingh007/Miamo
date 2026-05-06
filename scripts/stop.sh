#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo — STOP (Docker Compose)
# Stops all containers, optionally removes volumes
# ═══════════════════════════════════════════════════════════
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; B='\033[1;34m'; NC='\033[0m'

echo -e "\n${B}══════════════════════════════════════${NC}"
echo -e "${B}  MIAMO — DOCKER STOP${NC}"
echo -e "${B}══════════════════════════════════════${NC}\n"

if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
  echo -e "${Y}Stopping + removing volumes (fresh DB next start)...${NC}"
  docker-compose down -v --remove-orphans 2>/dev/null
  echo -e "  ${G}✓${NC} All containers + volumes removed"
  echo -e "  Next 'dev.sh' will create a fresh database + seed"
else
  docker-compose down --remove-orphans 2>/dev/null
  echo -e "  ${G}✓${NC} All containers stopped (data preserved)"
  echo -e "  Use ${Y}--clean${NC} to also delete database volumes"
fi

# Also kill any leftover local processes (safety net)
lsof -ti:3100,3200,3201,3202,3203,3204,3205,3206 2>/dev/null | xargs kill -9 2>/dev/null || true

echo ""
