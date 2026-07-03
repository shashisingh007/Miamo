-- v3.7.0 — Notification preferences + first-match delight flag.
--
-- Purely additive: 6 new boolean columns on Settings. Every column is
-- default TRUE (respect the user's existing enabled state) except
-- `marketingEmailsEnabled` (default FALSE per DPDP consent-first design
-- and GDPR/CCPA-like posture) and `hasSeenFirstMatch` (default FALSE so
-- every existing user still sees the confetti on their next match).
--
-- Idempotent: every ADD COLUMN uses IF NOT EXISTS. Re-running this
-- migration is a no-op. Follows the pattern in
-- `20260625000000_v3_6_overhaul_foundation/migration.sql`.
--
-- Cross-refs:
--   - services/shared/prisma/schema.prisma  (Settings model additions)
--   - services/shared/src/schemas.ts        (settingsUpdateBodySchema whitelist)
--   - services/users/src/server.ts          (PUT /api/v1/settings validator)
--   - services/notifications/src/emails/**  (G.16 templates that respect these flags)

-- ─── Notification-channel per-category toggles ─────────────────────
-- Explicit boolean per (channel × category). We already had
-- notificationsEnabled / messageNotifications / beatReminders /
-- storyNotifications for the push/in-app rail. Adding the *email*
-- equivalents gives Settings → Notifications one row per toggle.
ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "matchEmailsEnabled"          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "messageEmailsEnabled"        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "likeEmailsEnabled"           BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "weeklyDigestEmailsEnabled"   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Marketing is opt-IN, never opt-out. Existing users see it as OFF
  -- until they toggle it on. Aligns with DPDP consent-first.
  ADD COLUMN IF NOT EXISTS "marketingEmailsEnabled"      BOOLEAN NOT NULL DEFAULT FALSE,
  -- First-match delight (G.18) — user has seen the confetti once.
  -- New users default FALSE; every existing user also defaults FALSE so
  -- their next match triggers the animation exactly once.
  ADD COLUMN IF NOT EXISTS "hasSeenFirstMatch"           BOOLEAN NOT NULL DEFAULT FALSE;
