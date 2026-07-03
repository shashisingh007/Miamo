-- v3.7.0 — Temporal Learning v2 foundation.
-- Adds one new tracking table: UserPreferenceHistory.
--
-- Purely additive. Follows the idempotent guard pattern established by
-- `20260625000000_v3_6_overhaul_foundation/migration.sql` and
-- `20260526120000_schema_hardening_indexes/migration.sql`:
--   - CREATE TABLE IF NOT EXISTS for the table.
--   - DO $$ … pg_indexes guard $$ for every index / unique constraint so
--     the migration can be re-run without error.
--
-- No DROP. No ALTER COLUMN. No data backfill. The table starts empty; the
-- v3.7 tracking-worker preferenceWindows loop populates it while
-- ALGO_V9_TEMPORAL_LEARNING_ENABLED=1.
--
-- Rollback: DROP TABLE "UserPreferenceHistory". Rows are recomputed from
-- UserActivity, so a drop-and-rebuild is safe as long as the worker is
-- allowed a full lifetime window (~15min for right_now/session, longer
-- for week/month/lifetime).

-- ─── UserPreferenceHistory ─────────────────────────────────────────
-- One row per (uidHash, dimension, window). Written by the
-- preferenceWindows worker every 90s for active users; read by the
-- v9 ranker recipes. All timescale bookkeeping lives in one table so
-- drift detection is a single-key sweep per user.
CREATE TABLE IF NOT EXISTS "UserPreferenceHistory" (
  "id"          TEXT        PRIMARY KEY,           -- because: app-side uuid() default; keeps DB portable, matches Prisma @id @default(uuid()).
  "uidHash"     TEXT        NOT NULL,              -- because: HMAC-hashed userId; never raw PII per tracking pipeline convention.
  "dimension"   TEXT        NOT NULL,              -- because: stable namespaced string, e.g. 'category:reels_spicy'.
  "window"      TEXT        NOT NULL,              -- because: closed set { right_now | session | week | month | lifetime }.
  "score"       DOUBLE PRECISION NOT NULL,         -- because: 0..1 preference intensity; DOUBLE PRECISION matches Prisma Float.
  "sampleCount" INTEGER     NOT NULL,              -- because: how many events fed this window; drift-confidence input.
  "computedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'UserPreferenceHistory_uidHash_dimension_window_key'
  ) THEN
    CREATE UNIQUE INDEX "UserPreferenceHistory_uidHash_dimension_window_key"
      ON "UserPreferenceHistory" ("uidHash", "dimension", "window");
    -- because: uniqueness constraint from the Prisma model; also the hot
    -- upsert path used by preferenceWindows.tick() for the ON CONFLICT
    -- target.
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'UserPreferenceHistory_uidHash_computedAt_idx'
  ) THEN
    CREATE INDEX "UserPreferenceHistory_uidHash_computedAt_idx"
      ON "UserPreferenceHistory" ("uidHash", "computedAt");
    -- because: hot read path is "give me one user's most-recent rows".
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'UserPreferenceHistory_dimension_window_idx'
  ) THEN
    CREATE INDEX "UserPreferenceHistory_dimension_window_idx"
      ON "UserPreferenceHistory" ("dimension", "window");
    -- because: cross-user analytics — "who has warmed to category X this week".
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'UserPreferenceHistory_computedAt_idx'
  ) THEN
    CREATE INDEX "UserPreferenceHistory_computedAt_idx"
      ON "UserPreferenceHistory" ("computedAt");
    -- because: retention sweep / time-window cleanup jobs scan by computedAt.
  END IF;
END $$;
