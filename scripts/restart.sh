#!/bin/bash
# ═══ Miamo — Restart Services ═══
# Usage: bash scripts/restart.sh [--build]
set -e
cd "$(dirname "$0")/.."

if [ "$1" = "--build" ]; then
  docker-compose down --remove-orphans
  docker-compose build --parallel 2>&1 | tail -3
  docker-compose up -d
else
  docker-compose restart
fi
sleep 5
docker-compose ps
echo "✓ Restarted"
