#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo — CLEANUP (Docker system prune)
# Removes: stopped containers, unused images, build cache
# Frees disk space significantly
# ═══════════════════════════════════════════════════════════
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'

echo -e "\n${B}══════════════════════════════════════${NC}"
echo -e "${B}  MIAMO — DOCKER CLEANUP${NC}"
echo -e "${B}══════════════════════════════════════${NC}\n"

# Space before
echo -e "${Y}Current Docker disk usage:${NC}"
docker system df 2>/dev/null
echo ""

if [ "$1" = "--all" ] || [ "$1" = "-a" ]; then
  echo -e "${R}⚠ Full cleanup (removes ALL unused images + volumes)${NC}"
  docker-compose down -v --remove-orphans 2>/dev/null
  docker system prune -af --volumes 2>/dev/null
  echo -e "\n  ${G}✓${NC} Full cleanup complete"
else
  echo -e "${Y}Cleaning stopped containers + dangling images...${NC}"
  docker-compose down --remove-orphans 2>/dev/null
  docker image prune -f 2>/dev/null
  docker builder prune -f 2>/dev/null
  echo -e "\n  ${G}✓${NC} Cleanup complete (volumes preserved)"
  echo -e "  Use ${Y}--all${NC} for full cleanup including volumes"
fi

echo -e "\n${Y}Docker disk usage after cleanup:${NC}"
docker system df 2>/dev/null
echo ""
