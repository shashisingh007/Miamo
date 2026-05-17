-- Create missing tables that exist across different service schemas

CREATE TABLE IF NOT EXISTS "MatrimonialProfile" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  gotra TEXT DEFAULT '',
  manglik TEXT DEFAULT 'Unknown',
  nakshatra TEXT DEFAULT '',
  "birthTime" TEXT DEFAULT '',
  "birthPlace" TEXT DEFAULT '',
  dob TEXT DEFAULT '',
  "motherTongue" TEXT DEFAULT '',
  "familyType" TEXT DEFAULT '',
  "familyValues" TEXT DEFAULT '',
  "marriageTimeline" TEXT DEFAULT '',
  "bioDataTemplate" TEXT DEFAULT '',
  "bioDataAccess" TEXT DEFAULT 'public',
  "kundliUrl" TEXT DEFAULT '',
  "kundliData" TEXT DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "BioDataAccessRequest" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "requesterId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "accessType" TEXT NOT NULL DEFAULT 'biodata',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bdaccess_target ON "BioDataAccessRequest"("targetUserId", status);
CREATE INDEX IF NOT EXISTS idx_bdaccess_requester ON "BioDataAccessRequest"("requesterId");

CREATE TABLE IF NOT EXISTS "StoryComment" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "storyId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  content TEXT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_storycomment_story ON "StoryComment"("storyId");

CREATE TABLE IF NOT EXISTS "StoryLike" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "storyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_storylike_unique ON "StoryLike"("storyId", "userId");

CREATE TABLE IF NOT EXISTS "MiamoMove" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  message TEXT DEFAULT '',
  "targetType" TEXT DEFAULT 'profile',
  "targetId" TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_miamomove_unique ON "MiamoMove"("fromUserId", "toUserId", "targetType", "targetId");
CREATE INDEX IF NOT EXISTS idx_miamomove_to ON "MiamoMove"("toUserId", status);

CREATE TABLE IF NOT EXISTS "DiscoverFilter" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL UNIQUE,
  "minAge" INTEGER DEFAULT 18,
  "maxAge" INTEGER DEFAULT 99,
  "minHeight" INTEGER,
  "maxHeight" INTEGER,
  distance INTEGER DEFAULT 50,
  city TEXT DEFAULT '',
  genders TEXT DEFAULT '',
  sexualities TEXT DEFAULT '',
  "lookingFor" TEXT DEFAULT '',
  smoking TEXT DEFAULT '',
  drinking TEXT DEFAULT '',
  exercise TEXT DEFAULT '',
  education TEXT DEFAULT '',
  religion TEXT DEFAULT '',
  zodiac TEXT DEFAULT '',
  pets TEXT DEFAULT '',
  children TEXT DEFAULT '',
  "activeToday" BOOLEAN DEFAULT false,
  "newHere" BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  "hasPhotos" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

SELECT 'All tables created successfully' as status;
