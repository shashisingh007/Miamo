#!/bin/bash
# ═══ Miamo — Cleanup Docker Resources ═══
# Usage: bash scripts/cleanup.sh [--all]
cd "$(dirname "$0")/.."

docker-compose down -v --remove-orphans 2>/dev/null
if [ "$1" = "--all" ]; then
  docker system prune -af --volumes
else
  docker image prune -f
  docker builder prune -f
fi
echo "✓ Cleaned"
