#!/bin/bash
# ─── Miamo: Build & Deploy All Services ──────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Miamo Microservices Build & Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Sync Prisma
echo "1️⃣  Syncing Prisma schema..."
bash "$SCRIPT_DIR/sync-prisma.sh"

# Step 2: Build all Docker images
echo ""
echo "2️⃣  Building Docker images..."
cd "$ROOT_DIR"
docker compose build --parallel

# Step 3: Start services
echo ""
echo "3️⃣  Starting services..."
docker compose up -d

# Step 4: Wait for health
echo ""
echo "4️⃣  Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "5️⃣  Health check..."
services=("gateway:3200" "auth:3201" "users:3202" "social:3203" "messaging:3204" "content:3205" "notifications:3206")
all_healthy=true

for svc in "${services[@]}"; do
  name="${svc%%:*}"
  port="${svc##*:}"
  if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
    echo "  ✅ $name (port $port)"
  else
    echo "  ❌ $name (port $port)"
    all_healthy=false
  fi
done

# Check web
if curl -sf "http://localhost:3100" > /dev/null 2>&1; then
  echo "  ✅ web (port 3100)"
else
  echo "  ⚠️  web (port 3100) - may still be starting"
fi

echo ""
if $all_healthy; then
  echo "🎉 All services healthy!"
else
  echo "⚠️  Some services not yet healthy. Check: docker compose logs"
fi

echo ""
echo "📍 Endpoints:"
echo "   Web:           http://localhost:3100"
echo "   API Gateway:   http://localhost:3200"
echo "   Health:        http://localhost:3200/health"
echo ""
