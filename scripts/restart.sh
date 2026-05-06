#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo — RESTART (Docker Compose)
# Restarts services without rebuilding (fast)
# Use --build to force rebuild
# ═══════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; B='\033[1;34m'; NC='\033[0m'

echo -e "\n${B}══════════════════════════════════════${NC}"
echo -e "${B}  MIAMO — DOCKER RESTART${NC}"
echo -e "${B}══════════════════════════════════════${NC}\n"

if [ "$1" = "--build" ] || [ "$1" = "-b" ]; then
  echo -e "${Y}[1/3]${NC} Stopping services..."
  docker-compose down --remove-orphans 2>/dev/null
  echo -e "  ${G}✓${NC} Stopped"

  echo -e "${Y}[2/3]${NC} Rebuilding images..."
  docker-compose build --parallel 2>&1 | tail -3
  echo -e "  ${G}✓${NC} Built"

  echo -e "${Y}[3/3]${NC} Starting services..."
  docker-compose up -d
  echo -e "  ${G}✓${NC} Running"
else
  echo -e "${Y}[1/2]${NC} Restarting services..."
  docker-compose restart
  echo -e "  ${G}✓${NC} All services restarted"

  echo -e "${Y}[2/2]${NC} Checking health..."
  sleep 5
fi

# Status
echo -e "\n${B}── Service Status ──────────────────────${NC}"
docker-compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | head -15

echo -e "\n  Web: ${G}http://localhost:3100${NC}  Gateway: ${G}http://localhost:3200${NC}\n"
