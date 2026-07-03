-- Schema hardening: add missing hot-query indexes.
-- Idempotent (IF NOT EXISTS) so safe to re-run.

CREATE INDEX IF NOT EXISTS "Match_active_user1Id_idx" ON "Match"("active", "user1Id");
CREATE INDEX IF NOT EXISTS "Match_active_user2Id_idx" ON "Match"("active", "user2Id");
CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "UserActivity_userId_action_createdAt_idx" ON "UserActivity"("userId", "action", "createdAt");
