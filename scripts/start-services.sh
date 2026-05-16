#!/bin/bash
cd /Users/singhshs/Library/CloudStorage/OneDrive-adidas/Desktop/Miamo

export DATABASE_URL='postgresql://miamo:miamo@localhost:5432/miamo?schema=public'
export JWT_SECRET='miamo-dev-jwt-secret-change-in-production-2026'
export INTERNAL_SERVICE_KEY='miamo-internal-dev-key'
export ENCRYPTION_KEY='miamo-dev-encrypt-key-32-bytes\!\!'
export NODE_ENV='development'

SERVICES="gateway:3200 auth:3201 users:3202 social:3203 messaging:3204 content:3205 notifications:3206"

for entry in $SERVICES; do
  svc=$(echo $entry | cut -d: -f1)
  port=$(echo $entry | cut -d: -f2)
  PORT=$port npx --yes tsx watch services/$svc/src/server.ts > /tmp/miamo-$svc.log 2>&1 &
  echo "Started $svc on port $port (PID $!)"
done

echo "All services started. Waiting 8s for bootup..."
sleep 8

for entry in $SERVICES; do
  svc=$(echo $entry | cut -d: -f1)
  port=$(echo $entry | cut -d: -f2)
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>/dev/null)
  if [ "$status" = "200" ]; then
    echo "✓ $svc:$port OK"
  else
    echo "✗ $svc:$port FAILED (HTTP $status)"
  fi
done
