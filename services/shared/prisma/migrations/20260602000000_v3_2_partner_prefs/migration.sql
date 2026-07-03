-- v3.2 — extended partner preferences for compatibility scoring
ALTER TABLE "MatrimonialProfile"
  ADD COLUMN IF NOT EXISTS "partnerSmoking"      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "partnerDrinking"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "partnerFamilyType"   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "partnerFamilyValues" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "partnerLocations"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "partnerRelocate"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "partnerChildren"     TEXT NOT NULL DEFAULT '';
