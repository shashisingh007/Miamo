#!/bin/bash
# ═══ Miamo — Stream Logs ═══
# Usage: bash scripts/logs.sh [service]
cd "$(dirname "$0")/.."
docker-compose logs -f --tail 50 ${1:+"$1"}
