-- v3.1 Tracking pipeline — Phase 1
-- New tables for consent, hourly/daily aggregates, feature snapshots,
-- and pair-compatibility cache. All keyed on uidHash (HMAC of userId)
-- so account-delete breaks the join without rewriting the table.

CREATE TABLE IF NOT EXISTS "ConsentEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT,
  "did"       TEXT NOT NULL,
  "scope"     TEXT NOT NULL,
  "granted"   BOOLEAN NOT NULL,
  "region"    TEXT,
  "source"    TEXT NOT NULL DEFAULT 'banner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ConsentEvent_userId_idx" ON "ConsentEvent"("userId");
CREATE INDEX IF NOT EXISTS "ConsentEvent_did_idx"    ON "ConsentEvent"("did");
CREATE INDEX IF NOT EXISTS "ConsentEvent_userId_scope_createdAt_idx" ON "ConsentEvent"("userId","scope","createdAt");

CREATE TABLE IF NOT EXISTS "EventAggHourly" (
  "uidHash" TEXT NOT NULL,
  "evt"     TEXT NOT NULL,
  "bucket"  TIMESTAMP(3) NOT NULL,
  "count"   INTEGER NOT NULL DEFAULT 0,
  "durSum"  INTEGER NOT NULL DEFAULT 0,
  "durP50"  INTEGER NOT NULL DEFAULT 0,
  "durP95"  INTEGER NOT NULL DEFAULT 0,
  "meta"    JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "EventAggHourly_pkey" PRIMARY KEY ("uidHash","evt","bucket")
);
CREATE INDEX IF NOT EXISTS "EventAggHourly_bucket_idx"          ON "EventAggHourly"("bucket");
CREATE INDEX IF NOT EXISTS "EventAggHourly_uidHash_bucket_idx" ON "EventAggHourly"("uidHash","bucket");

CREATE TABLE IF NOT EXISTS "EventAggDaily" (
  "uidHash"     TEXT NOT NULL,
  "evt"         TEXT NOT NULL,
  "day"         TIMESTAMP(3) NOT NULL,
  "count"       INTEGER NOT NULL DEFAULT 0,
  "durSum"      INTEGER NOT NULL DEFAULT 0,
  "uniqTargets" INTEGER NOT NULL DEFAULT 0,
  "meta"        JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "EventAggDaily_pkey" PRIMARY KEY ("uidHash","evt","day")
);
CREATE INDEX IF NOT EXISTS "EventAggDaily_day_idx"          ON "EventAggDaily"("day");
CREATE INDEX IF NOT EXISTS "EventAggDaily_uidHash_day_idx" ON "EventAggDaily"("uidHash","day");

CREATE TABLE IF NOT EXISTS "FeatureSnapshot" (
  "uidHash"            TEXT NOT NULL,
  "computedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "chronotype"         TEXT,
  "replyPersonaP50Ms"  INTEGER,
  "replyPersonaP90Ms"  INTEGER,
  "responseRate"       DOUBLE PRECISION,
  "rageClickRate"      DOUBLE PRECISION,
  "deadClickRate"      DOUBLE PRECISION,
  "dwellToDecisionP50" DOUBLE PRECISION,
  "swipeRightRatio"    DOUBLE PRECISION,
  "attentionProfile"   TEXT,
  "interestVec"        BYTEA,
  "vibeEmb"            BYTEA,
  "behaviorEmb"        BYTEA,
  "cityCenterLat"      DOUBLE PRECISION,
  "cityCenterLng"      DOUBLE PRECISION,
  "raw"                JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "FeatureSnapshot_pkey" PRIMARY KEY ("uidHash")
);
CREATE INDEX IF NOT EXISTS "FeatureSnapshot_computedAt_idx" ON "FeatureSnapshot"("computedAt");

CREATE TABLE IF NOT EXISTS "PairCompatCache" (
  "aHash"                 TEXT NOT NULL,
  "bHash"                 TEXT NOT NULL,
  "computedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "interestCos"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vibeCos"               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "behaviorCos"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "magnetCos"             DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cityKm"                DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ageDelta"              INTEGER NOT NULL DEFAULT 0,
  "intentMatch"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "chronoOverlap"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cadenceOverlap"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "priorInteractionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "finalScore"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "PairCompatCache_pkey" PRIMARY KEY ("aHash","bHash")
);
CREATE INDEX IF NOT EXISTS "PairCompatCache_aHash_finalScore_idx" ON "PairCompatCache"("aHash","finalScore");
CREATE INDEX IF NOT EXISTS "PairCompatCache_computedAt_idx"        ON "PairCompatCache"("computedAt");
