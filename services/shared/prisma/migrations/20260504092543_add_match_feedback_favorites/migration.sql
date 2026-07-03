-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "favorite1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "favorite2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned2" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MatchFeedback" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchFeedback_matchId_idx" ON "MatchFeedback"("matchId");

-- CreateIndex
CREATE INDEX "MatchFeedback_userId_idx" ON "MatchFeedback"("userId");

-- CreateIndex
CREATE INDEX "MatchFeedback_targetUserId_idx" ON "MatchFeedback"("targetUserId");

-- CreateIndex
CREATE INDEX "MatchFeedback_reason_idx" ON "MatchFeedback"("reason");

-- CreateIndex
CREATE INDEX "MatchFeedback_type_idx" ON "MatchFeedback"("type");

-- AddForeignKey
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchFeedback" ADD CONSTRAINT "MatchFeedback_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
