-- v3.6.0: User.premium signal for exposure ledger, anti-ghost, Top-10 threshold
-- Idempotent: ALTER TABLE ... ADD COLUMN IF NOT EXISTS
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premium" BOOLEAN NOT NULL DEFAULT FALSE;  -- because: premium gate
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP(3);  -- because: time-boxed premium (renewable)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'User' AND indexname = 'User_premium_premiumUntil_idx') THEN
    CREATE INDEX "User_premium_premiumUntil_idx" ON "User"("premium", "premiumUntil");
  END IF;
END $$;
