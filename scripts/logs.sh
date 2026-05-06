#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo — LOGS (Docker Compose)
# Usage: bash scripts/logs.sh [service_name]
# ═══════════════════════════════════════════════════════════
cd "$(dirname "$0")/.."

if [ -n "$1" ]; then
  docker-compose logs -f --tail 50 "$1"
else
  docker-compose logs -f --tail 20
fi
