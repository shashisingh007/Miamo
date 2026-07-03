-- v1.2 (session 13) — admin + DTM match + right-now intent visibility.
--
-- Purely additive. Every ALTER uses IF NOT EXISTS + every CREATE uses
-- IF NOT EXISTS so re-running the migration is a no-op. Follows the
-- pattern in `20260702000000_notification_prefs/migration.sql`.
--
-- Cross-refs:
--   - services/shared/prisma/schema.prisma  (User.isAdmin, Settings.manualIntentOverride, DtmInterest, DtmMatch)
--   - services/content/src/server.ts        (POST /api/v1/dtm/mutual-interest, GET /api/v1/admin/fairness-gini)
--   - services/users/src/server.ts          (GET /api/v1/settings/intent-status, PUT .../intent-override)

-- ─── User.isAdmin ─────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Settings.manualIntentOverride ────────────────────────────────
ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "manualIntentOverride" TEXT;

-- ─── DtmInterest (one-sided expression of interest) ───────────────
CREATE TABLE IF NOT EXISTS "DtmInterest" (
  "id"         TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId"   TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DtmInterest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DtmInterest_fromUserId_toUserId_key"
  ON "DtmInterest" ("fromUserId", "toUserId");
CREATE INDEX IF NOT EXISTS "DtmInterest_toUserId_idx"
  ON "DtmInterest" ("toUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'DtmInterest_fromUserId_fkey'
  ) THEN
    ALTER TABLE "DtmInterest"
      ADD CONSTRAINT "DtmInterest_fromUserId_fkey"
      FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'DtmInterest_toUserId_fkey'
  ) THEN
    ALTER TABLE "DtmInterest"
      ADD CONSTRAINT "DtmInterest_toUserId_fkey"
      FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── DtmMatch (mutual DTM match) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "DtmMatch" (
  "id"        TEXT NOT NULL,
  "user1Id"   TEXT NOT NULL,
  "user2Id"   TEXT NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DtmMatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DtmMatch_user1Id_user2Id_key"
  ON "DtmMatch" ("user1Id", "user2Id");
CREATE INDEX IF NOT EXISTS "DtmMatch_user2Id_idx"
  ON "DtmMatch" ("user2Id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'DtmMatch_user1Id_fkey'
  ) THEN
    ALTER TABLE "DtmMatch"
      ADD CONSTRAINT "DtmMatch_user1Id_fkey"
      FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'DtmMatch_user2Id_fkey'
  ) THEN
    ALTER TABLE "DtmMatch"
      ADD CONSTRAINT "DtmMatch_user2Id_fkey"
      FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
