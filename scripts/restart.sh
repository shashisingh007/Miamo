#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo Dev - RESTART all services (no DB re-seed)
# Usage: bash scripts/restart.sh
# ═══════════════════════════════════════════════════════════
set -e

cd "$(dirname "$0")/.."
ROOT=$(pwd)
source "$ROOT/scripts/_common.sh"

header "MIAMO — RESTART"

# ─── Kill ────────────────────────────────────────────────
step "1/3" "Stopping all services..."
kill_all
ok "All stopped"

# ─── Environment ─────────────────────────────────────────
step "2/3" "Loading environment..."
load_env
ok "Environment set"

# ─── Start ───────────────────────────────────────────────
step "3/3" "Starting all services..."
start_all_services

footer
