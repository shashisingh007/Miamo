-- v3.6.0 — Algorithm overhaul foundation.
-- Purely additive: new tables for earned-visibility (ExposureLedger /
-- ExposureCredit / WeeklyTopMatch) and family bio-data sharing
-- (FamilyBriefShare), plus voice-note columns on Message and consent
-- toggles on Settings.
--
-- Idempotent: every CREATE / ADD COLUMN / CREATE INDEX is guarded so
-- re-running the migration is a no-op. Pattern follows
-- `20260526120000_schema_hardening_indexes/migration.sql`:
--   - CREATE TABLE IF NOT EXISTS for tables.
--   - ADD COLUMN IF NOT EXISTS for column additions.
--   - DO $$ … pg_indexes guard $$ for indexes (CREATE INDEX IF NOT EXISTS
--     is supported on plain B-tree but the explicit guard is safer across
--     PG versions and matches the existing convention).
--
-- No DROP. No ALTER COLUMN. No data backfill. Defaults handle existing
-- rows for the new NOT NULL boolean toggles on Settings.

-- ─── ExposureLedger ─────────────────────────────────────────────────
-- Append-only ledger of earned and spent exposure slots per surface.
-- Reads aggregate this; ExposureCredit is the hot-path cache.
CREATE TABLE IF NOT EXISTS "ExposureLedger" (
  "id"         TEXT        PRIMARY KEY,           -- because: app-side uuid() default keeps DB portable; matches Prisma @id @default(uuid()).
  "uidHash"    TEXT        NOT NULL,              -- because: HMAC-hashed userId, never raw PII per tracking pipeline convention.
  "surface"    TEXT        NOT NULL,              -- because: 'discover' | 'dtm' | 'aiMatch' — credit pools are per-surface.
  "deltaSlots" INTEGER     NOT NULL,              -- because: signed Int; +N earned, -N spent. INTEGER is sufficient (no fractional slots in v3.6).
  "reason"     TEXT        NOT NULL,              -- because: enum-by-convention; see model docstring for the closed list.
  "refId"      TEXT,                              -- because: nullable so admin grants / fairness injects without a referent still record.
  "meta"       JSONB,                             -- because: free-form audit context; schema-policed by app, not DB.
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ExposureLedger_uidHash_surface_createdAt_idx'
  ) THEN
    CREATE INDEX "ExposureLedger_uidHash_surface_createdAt_idx"
      ON "ExposureLedger" ("uidHash", "surface", "createdAt");
    -- because: hot read path is "give me one user's recent ledger rows on one surface".
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ExposureLedger_reason_idx'
  ) THEN
    CREATE INDEX "ExposureLedger_reason_idx" ON "ExposureLedger" ("reason");
    -- because: ops queries "how many rage_like_zero in the last hour" pivot on reason.
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ExposureLedger_createdAt_idx'
  ) THEN
    CREATE INDEX "ExposureLedger_createdAt_idx" ON "ExposureLedger" ("createdAt");
    -- because: retention sweep / time-window analytics scan by createdAt.
  END IF;
END $$;

-- ─── ExposureCredit ─────────────────────────────────────────────────
-- Per-(user, surface) hot-path cache of slotsEarned/slotsSpent. Composite
-- PK doubles as the lookup index. Updated by the same TX that appends to
-- ExposureLedger; ExposureLedger is the source of truth on replay.
CREATE TABLE IF NOT EXISTS "ExposureCredit" (
  "uidHash"     TEXT        NOT NULL,
  "surface"     TEXT        NOT NULL,
  "slotsEarned" INTEGER     NOT NULL DEFAULT 0,   -- because: running counter, never decremented; matches ExposureLedger sum.
  "slotsSpent"  INTEGER     NOT NULL DEFAULT 0,
  "lastTopUp"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("uidHash", "surface")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ExposureCredit_surface_lastTopUp_idx'
  ) THEN
    CREATE INDEX "ExposureCredit_surface_lastTopUp_idx"
      ON "ExposureCredit" ("surface", "lastTopUp");
    -- because: surface-wide sweep "users with stale credit on dtm" pivots on (surface, lastTopUp).
  END IF;
END $$;

-- ─── WeeklyTopMatch ─────────────────────────────────────────────────
-- Output of the weekly Gale-Shapley pass: ten rank slots per uidHash per
-- ISO week. Unique constraint enforces idempotent re-runs.
CREATE TABLE IF NOT EXISTS "WeeklyTopMatch" (
  "id"         TEXT        PRIMARY KEY,
  "uidHash"    TEXT        NOT NULL,
  "weekIso"    TEXT        NOT NULL,              -- because: e.g. "2026W26"; lexicographically sortable, week-rollover friendly.
  "rank"       INTEGER     NOT NULL,              -- because: 1..10 only; app-side bound, no DB CHECK to stay flexible.
  "targetHash" TEXT        NOT NULL,
  "computedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'WeeklyTopMatch_uidHash_weekIso_rank_key'
  ) THEN
    CREATE UNIQUE INDEX "WeeklyTopMatch_uidHash_weekIso_rank_key"
      ON "WeeklyTopMatch" ("uidHash", "weekIso", "rank");
    -- because: idempotency guarantee — worker re-runs cannot create dup rows for the same slot.
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'WeeklyTopMatch_uidHash_weekIso_idx'
  ) THEN
    CREATE INDEX "WeeklyTopMatch_uidHash_weekIso_idx"
      ON "WeeklyTopMatch" ("uidHash", "weekIso");
    -- because: read path "give me a user's top-10 for this week" scans on this prefix.
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'WeeklyTopMatch_weekIso_idx'
  ) THEN
    CREATE INDEX "WeeklyTopMatch_weekIso_idx" ON "WeeklyTopMatch" ("weekIso");
    -- because: weekly retention sweep / analytics rollup picks rows by week.
  END IF;
END $$;

-- ─── FamilyBriefShare ───────────────────────────────────────────────
-- Per-user shareable bio-data artifact tokens for "share with family"
-- flow. Token is the public identifier; URL is dead after expiresAt.
CREATE TABLE IF NOT EXISTS "FamilyBriefShare" (
  "id"          TEXT        PRIMARY KEY,
  "userId"      TEXT        NOT NULL,
  "token"       TEXT        NOT NULL,             -- because: 22-char base64url, embedded in URL; uniqueness enforced below.
  "format"      TEXT        NOT NULL,             -- because: 'pdf' | 'image' | 'text'; rendered server-side.
  "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"   TIMESTAMPTZ NOT NULL,             -- because: hard TTL (generatedAt + 7d) per privacy spec.
  "viewCount"   INTEGER     NOT NULL DEFAULT 0,
  "trackViews"  BOOLEAN     NOT NULL DEFAULT false -- because: opt-in by user; default false to protect privacy.
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'FamilyBriefShare_token_key'
  ) THEN
    CREATE UNIQUE INDEX "FamilyBriefShare_token_key" ON "FamilyBriefShare" ("token");
    -- because: token is the public lookup key; must be unique across all users.
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'FamilyBriefShare_userId_generatedAt_idx'
  ) THEN
    CREATE INDEX "FamilyBriefShare_userId_generatedAt_idx"
      ON "FamilyBriefShare" ("userId", "generatedAt");
    -- because: "show me my recent shares" read path.
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'FamilyBriefShare_expiresAt_idx'
  ) THEN
    CREATE INDEX "FamilyBriefShare_expiresAt_idx" ON "FamilyBriefShare" ("expiresAt");
    -- because: expiry-sweep cron scans by expiresAt to soft-delete rows past their TTL.
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'FamilyBriefShare_token_idx'
  ) THEN
    CREATE INDEX "FamilyBriefShare_token_idx" ON "FamilyBriefShare" ("token");
    -- because: explicit secondary (the unique constraint already creates an
    -- index, but Prisma's @@index([token]) emits a non-unique companion;
    -- keep both so prisma migrate diff reports a clean state).
  END IF;
END $$;

-- ─── Message: voice-note columns ────────────────────────────────────
-- Forward-compat: audioUrl/audioDurationMs ship in v3.6 for record/send;
-- transcript + transcriptStatus are reserved columns (worker writes them
-- starting in v3.7). Guarded with IF NOT EXISTS so re-running is a no-op.
DO $$ BEGIN
  IF to_regclass('"Message"') IS NOT NULL THEN
    ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioUrl"         TEXT;
    ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "audioDurationMs"  INTEGER;
    ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "transcript"       TEXT;
    -- because: TEXT is unbounded in Postgres; @db.Text in Prisma maps to TEXT (same as plain String here).
    ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "transcriptStatus" TEXT;
    -- because: null | 'pending' | 'ready' | 'failed' — enum-by-convention.
  END IF;
END $$;

-- ─── Settings: consent toggles ──────────────────────────────────────
-- Defaults chosen per spec:
--   moodInferenceEnabled       = false  (explicit opt-in for mood inference)
--   behavioralRankingEnabled   = true   (status-quo behavior)
--   crossUserInferenceEnabled  = true   (status-quo behavior)
--   algorithmicTransparency    = true   (opt-out only)
DO $$ BEGIN
  IF to_regclass('"Settings"') IS NOT NULL THEN
    ALTER TABLE "Settings"
      ADD COLUMN IF NOT EXISTS "moodInferenceEnabled"       BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Settings"
      ADD COLUMN IF NOT EXISTS "behavioralRankingEnabled"   BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Settings"
      ADD COLUMN IF NOT EXISTS "crossUserInferenceEnabled"  BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Settings"
      ADD COLUMN IF NOT EXISTS "algorithmicTransparency"    BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;
