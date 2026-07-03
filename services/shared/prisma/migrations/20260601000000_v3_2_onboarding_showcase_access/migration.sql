-- v3.2 — onboarding completion + Showcase + Access Control + DTM extended fields
-- Reversible: drops added columns/tables on rollback.

-- ── Profile: completion + DTM fields ─────────────────────────────────────────
ALTER TABLE "Profile"
  ADD COLUMN IF NOT EXISTS "completionScore"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completionMissing"    TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "familyBackground"     VARCHAR(280),
  ADD COLUMN IF NOT EXISTS "educationLevel"       TEXT,
  ADD COLUMN IF NOT EXISTS "educationInstitution" TEXT,
  ADD COLUMN IF NOT EXISTS "employer"             TEXT,
  ADD COLUMN IF NOT EXISTS "incomeBand"           TEXT,
  ADD COLUMN IF NOT EXISTS "subCommunity"         TEXT,
  ADD COLUMN IF NOT EXISTS "maritalStatus"        TEXT,
  ADD COLUMN IF NOT EXISTS "willingToRelocate"    BOOLEAN,
  ADD COLUMN IF NOT EXISTS "familyInvolved"       BOOLEAN,
  ADD COLUMN IF NOT EXISTS "expectedTimeline"     TEXT,
  ADD COLUMN IF NOT EXISTS "kundliUrl"            TEXT;

-- ── ShowcaseItem (replaces CreativityItem for v3.2 surfaces) ─────────────────
CREATE TABLE IF NOT EXISTS "ShowcaseItem" (
  "id"              TEXT PRIMARY KEY,
  "userId"          TEXT NOT NULL,
  "category"        TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "title"           VARCHAR(120) NOT NULL,
  "body"            VARCHAR(300),
  "url"             TEXT,
  "imageUrl"        TEXT,
  "ogImageCached"   TEXT,
  "voiceUrl"        TEXT,
  "voiceDurationMs" INTEGER,
  "bytes"           INTEGER NOT NULL DEFAULT 0,
  "pinned"          BOOLEAN NOT NULL DEFAULT FALSE,
  "moveCount"       INTEGER NOT NULL DEFAULT 0,
  "matchCount"      INTEGER NOT NULL DEFAULT 0,
  "visibility"      TEXT    NOT NULL DEFAULT 'everyone',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShowcaseItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShowcaseItem_userId_pinned_idx"     ON "ShowcaseItem"("userId","pinned");
CREATE INDEX IF NOT EXISTS "ShowcaseItem_category_createdAt_idx" ON "ShowcaseItem"("category","createdAt");

-- ── AccessRequest ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AccessRequest" (
  "id"          TEXT PRIMARY KEY,
  "fromUserId"  TEXT NOT NULL,
  "toUserId"    TEXT NOT NULL,
  "field"       TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "message"     VARCHAR(500),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"   TIMESTAMP(3),
  "expiresAt"   TIMESTAMP(3),
  CONSTRAINT "AccessRequest_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccessRequest_toUserId_fkey"
    FOREIGN KEY ("toUserId")   REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccessRequest_fromUserId_toUserId_field_key"
  ON "AccessRequest"("fromUserId","toUserId","field");
CREATE INDEX IF NOT EXISTS "AccessRequest_toUserId_status_idx"
  ON "AccessRequest"("toUserId","status");
CREATE INDEX IF NOT EXISTS "AccessRequest_fromUserId_status_idx"
  ON "AccessRequest"("fromUserId","status");
