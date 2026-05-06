#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo Dev - STOP all services
# Usage: bash scripts/stop.sh
# ═══════════════════════════════════════════════════════════

cd "$(dirname "$0")/.."
ROOT=$(pwd)
source "$ROOT/scripts/_common.sh"

header "MIAMO — STOP"
kill_all
ok "All services stopped"
echo ""
