#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Miamo Dev - START all services + database + web
# Usage: bash scripts/dev.sh
# ═══════════════════════════════════════════════════════════
set -e

cd "$(dirname "$0")/.."
ROOT=$(pwd)
source "$ROOT/scripts/_common.sh"

header "MIAMO — START"

# ─── Kill previous ───────────────────────────────────────
step "1/5" "Killing previous processes..."
kill_all
ok "All ports free"

# ─── PostgreSQL ──────────────────────────────────────────
step "2/5" "Checking PostgreSQL..."
ensure_postgres

# ─── Environment ─────────────────────────────────────────
step "3/5" "Setting up environment..."
load_env
install_deps
ok "Environment ready"

# ─── Migrations & Seed ───────────────────────────────────
step "4/5" "Database migrations & seed..."
cd "$ROOT/api"
npx prisma migrate deploy 2>&1 | tail -3 || warn "Migration notice"
seed_if_empty
cd "$ROOT"

# ─── Start services ─────────────────────────────────────
step "5/5" "Starting all services..."
start_all_services

footer
