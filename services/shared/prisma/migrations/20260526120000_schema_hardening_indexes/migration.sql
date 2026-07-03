-- Schema hardening: add missing hot-query indexes.
-- Idempotent (IF NOT EXISTS) AND tolerant of tables that don't exist yet,
-- because some target tables (e.g. UserActivity) are introduced via
-- `prisma db push` on fresh installs rather than a creating migration.

DO $$ BEGIN
  IF to_regclass('"Match"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "Match_active_user1Id_idx" ON "Match"("active", "user1Id");
    CREATE INDEX IF NOT EXISTS "Match_active_user2Id_idx" ON "Match"("active", "user2Id");
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('"Message"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('"Notification"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('"UserActivity"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "UserActivity_userId_action_createdAt_idx" ON "UserActivity"("userId", "action", "createdAt");
  END IF;
END $$;
