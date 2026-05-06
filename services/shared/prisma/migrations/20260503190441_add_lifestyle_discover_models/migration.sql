-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "children" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "drinking" TEXT NOT NULL DEFAULT 'socially',
ADD COLUMN     "education" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "exercise" TEXT NOT NULL DEFAULT 'sometimes',
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "languages" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lookingFor" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN     "pets" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "religion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sexuality" TEXT NOT NULL DEFAULT 'straight',
ADD COLUMN     "smoking" TEXT NOT NULL DEFAULT 'never',
ADD COLUMN     "zodiac" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "MiamoMove" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "targetType" TEXT NOT NULL DEFAULT 'profile',
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiamoMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoverFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minAge" INTEGER NOT NULL DEFAULT 18,
    "maxAge" INTEGER NOT NULL DEFAULT 99,
    "minHeight" INTEGER,
    "maxHeight" INTEGER,
    "distance" INTEGER NOT NULL DEFAULT 50,
    "city" TEXT NOT NULL DEFAULT '',
    "genders" TEXT NOT NULL DEFAULT '',
    "sexualities" TEXT NOT NULL DEFAULT '',
    "lookingFor" TEXT NOT NULL DEFAULT '',
    "smoking" TEXT NOT NULL DEFAULT '',
    "drinking" TEXT NOT NULL DEFAULT '',
    "exercise" TEXT NOT NULL DEFAULT '',
    "education" TEXT NOT NULL DEFAULT '',
    "religion" TEXT NOT NULL DEFAULT '',
    "zodiac" TEXT NOT NULL DEFAULT '',
    "pets" TEXT NOT NULL DEFAULT '',
    "children" TEXT NOT NULL DEFAULT '',
    "activeToday" BOOLEAN NOT NULL DEFAULT false,
    "newHere" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "hasPhotos" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoverFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MiamoMove_toUserId_status_idx" ON "MiamoMove"("toUserId", "status");

-- CreateIndex
CREATE INDEX "MiamoMove_fromUserId_createdAt_idx" ON "MiamoMove"("fromUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MiamoMove_fromUserId_toUserId_targetType_targetId_key" ON "MiamoMove"("fromUserId", "toUserId", "targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoverFilter_userId_key" ON "DiscoverFilter"("userId");

-- CreateIndex
CREATE INDEX "Profile_sexuality_idx" ON "Profile"("sexuality");

-- CreateIndex
CREATE INDEX "Profile_lookingFor_idx" ON "Profile"("lookingFor");

-- CreateIndex
CREATE INDEX "Profile_height_idx" ON "Profile"("height");

-- AddForeignKey
ALTER TABLE "MiamoMove" ADD CONSTRAINT "MiamoMove_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiamoMove" ADD CONSTRAINT "MiamoMove_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoverFilter" ADD CONSTRAINT "DiscoverFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
