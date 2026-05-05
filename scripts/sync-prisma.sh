#!/bin/bash
# ─── Miamo: Copy Prisma schema to all microservices ───
# Run this before building Docker images
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SHARED_PRISMA="$ROOT_DIR/services/shared/prisma"
SERVICES=("auth" "users" "social" "messaging" "content" "notifications")

echo "📦 Syncing Prisma schema to all services..."

for svc in "${SERVICES[@]}"; do
  SVC_DIR="$ROOT_DIR/services/$svc"
  mkdir -p "$SVC_DIR/prisma"
  
  # Copy schema
  cp "$SHARED_PRISMA/schema.prisma" "$SVC_DIR/prisma/schema.prisma"
  
  # Copy migrations if they exist
  if [ -d "$ROOT_DIR/api/prisma/migrations" ]; then
    cp -r "$ROOT_DIR/api/prisma/migrations" "$SVC_DIR/prisma/"
  fi
  
  echo "  ✓ $svc"
done

echo ""
echo "✅ Prisma schema synced to all services"
