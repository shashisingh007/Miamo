#!/bin/bash
# ═══ Miamo — Start All Services ═══
# Builds images and starts containers. Run from project root.
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'
echo -e "\n${B}═══ MIAMO START ═══${NC}\n"

# Pre-flight
command -v docker &>/dev/null || { echo -e "${R}✗ Docker not installed${NC}"; exit 1; }
docker info &>/dev/null 2>&1 || { echo -e "${R}✗ Docker not running${NC}"; exit 1; }

# Build & start
echo -e "${Y}[1/3]${NC} Building images..."
docker-compose build --parallel 2>&1 | tail -5
echo -e "  ${G}✓${NC} Built"

echo -e "${Y}[2/3]${NC} Starting containers..."
docker-compose up -d
echo -e "  ${G}✓${NC} Started"

echo -e "${Y}[3/3]${NC} Waiting for health checks..."
sleep 8

# Status
echo ""
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker-compose ps
echo -e "\n${B}═══════════════════════════════${NC}"
echo -e "  Web:     ${G}http://localhost:3100${NC}"
echo -e "  API:     ${G}http://localhost:3200${NC}"
echo -e "  DB:      ${G}localhost:5432${NC}"
echo -e "${B}═══════════════════════════════${NC}\n"
