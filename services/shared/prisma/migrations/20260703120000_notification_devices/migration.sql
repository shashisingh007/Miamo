-- Miamo v3.6.1 — NotificationDevice model.
-- Introduced by the mobile app (Expo SDK 52). The mobile client posts its
-- Expo push token to POST /api/v1/notifications/register-device; the
-- notifications worker then fans out through Expo's push service to `token`.
--
-- Fully idempotent — safe to re-run on partially-applied environments and on
-- environments where the table was manually pre-created (dev seeds).

-- 1. Table.
CREATE TABLE IF NOT EXISTS "NotificationDevice" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "platform"    TEXT NOT NULL,
    "token"       TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked"     BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "NotificationDevice_pkey" PRIMARY KEY ("id")
);

-- 2. Indexes / unique constraints. Kept as separate statements so a partial
-- prior state doesn't abort the whole file.
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationDevice_token_key"
    ON "NotificationDevice"("token");

CREATE INDEX IF NOT EXISTS "NotificationDevice_userId_idx"
    ON "NotificationDevice"("userId");

CREATE INDEX IF NOT EXISTS "NotificationDevice_platform_revoked_idx"
    ON "NotificationDevice"("platform", "revoked");

-- 3. FK to User with ON DELETE CASCADE. Guarded so re-running doesn't crash.
DO $$
BEGIN
    ALTER TABLE "NotificationDevice"
        ADD CONSTRAINT "NotificationDevice_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;
