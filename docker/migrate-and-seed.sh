#!/bin/sh
# ─── Miamo DB Migration & Seed Entrypoint ─────────────
set -e

echo "═══ Running Prisma migrations..."
npx prisma migrate deploy

echo "═══ Checking if seed needed..."
USER_COUNT=$(echo "SELECT COUNT(*)::int FROM \"User\";" | npx prisma db execute --stdin 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo "═══ Seeding database (deterministic test data)..."
  npx tsx prisma/seed.ts
  echo "═══ Seed complete ✓"
else
  echo "═══ Database already seeded ($USER_COUNT users) — skipping"
fi

echo "═══ Migration container done ✓"
