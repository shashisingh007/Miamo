#!/bin/bash
# ═══ Miamo — Stop All Services ═══
# Usage: bash scripts/stop.sh [--clean]
cd "$(dirname "$0")/.."

if [ "$1" = "--clean" ]; then
  echo "Stopping + wiping volumes..."
  docker-compose down -v --remove-orphans
else
  docker-compose down --remove-orphans
fi
echo "✓ Stopped"
