-- Phase 6: Database & Persistence — Sessions, Bookmarks, Block fields, Profile fields

-- ══════════════════════════════════════════════════════
-- AlterTable: Add reason/details/evidence to Block
-- ══════════════════════════════════════════════════════
ALTER TABLE "Block" ADD COLUMN     "reason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "details" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "evidence" TEXT NOT NULL DEFAULT '';

-- ══════════════════════════════════════════════════════
-- AlterTable: Add politicalViews/diet to Profile
-- ══════════════════════════════════════════════════════
ALTER TABLE "Profile" ADD COLUMN     "politicalViews" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "diet" TEXT NOT NULL DEFAULT '';

-- ══════════════════════════════════════════════════════
-- CreateTable: Session (device/IP/UA tracking)
-- ══════════════════════════════════════════════════════
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT '',
    "deviceName" TEXT NOT NULL DEFAULT '',
    "browser" TEXT NOT NULL DEFAULT '',
    "os" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_revoked_idx" ON "Session"("userId", "revoked");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_lastActiveAt_idx" ON "Session"("userId", "lastActiveAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ══════════════════════════════════════════════════════
-- CreateTable: Bookmark (saved profiles/content)
-- ══════════════════════════════════════════════════════
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'profile',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Bookmark_targetId_idx" ON "Bookmark"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_targetId_targetType_key" ON "Bookmark"("userId", "targetId", "targetType");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
