// ─── v3.2 Onboarding Completion Score ─────────────────────────
// Pure, deterministic scoring used by both the gateway gate
// (requireOnboarded) and the users service (recompute on profile mutation).
//
// Casual threshold: 60. DTM (Date-to-Marry) threshold: 80.
// Scoring is weighted across 5 buckets that map 1:1 to onboarding wizard steps.

import type { PrismaClient } from '@prisma/client';

export interface CompletionResult {
  score: number;            // 0..100
  missing: string[];        // field keys the user still owes
  threshold: number;        // 60 (casual) or 80 (DTM)
  dtm: boolean;
}

const CASUAL_THRESHOLD = 60;
const DTM_THRESHOLD = 80;

const DTM_REQUIRED_FIELDS = [
  'familyBackground',
  'educationLevel',
  'employer',
  'incomeBand',
  'maritalStatus',
  'expectedTimeline',
];

export async function computeCompletionScore(
  prisma: PrismaClient,
  userId: string,
): Promise<CompletionResult> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    return { score: 0, missing: ['profile'], threshold: CASUAL_THRESHOLD, dtm: false };
  }

  const [photos, prompts, interests, user] = await Promise.all([
    prisma.profilePhoto.count({ where: { userId } }),
    prisma.profilePrompt.count({ where: { userId } }),
    prisma.profileInterest.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { verified: true } }),
  ]);

  const missing: string[] = [];
  let score = 0;

  // ── Step 1: identity basics (20 pts)
  if (profile.age && profile.gender) score += 10; else missing.push('age', 'gender');
  if (profile.city && profile.city !== 'Unknown') score += 5; else missing.push('city');
  if (profile.profession && profile.profession !== 'Not set') score += 5; else missing.push('profession');

  // ── Step 2: bio + voice (15 pts)
  if (profile.bio && profile.bio.length >= 30) score += 15;
  else if (profile.bio && profile.bio.length >= 10) score += 8;
  else missing.push('bio');

  // ── Step 3: photos (20 pts)
  if (photos >= 3) score += 20;
  else if (photos >= 1) score += 10;
  else missing.push('photos');

  // ── Step 4: prompts (15 pts)
  if (prompts >= 3) score += 15;
  else if (prompts >= 1) score += 8;
  else missing.push('prompts');

  // ── Step 5: interests (10 pts)
  if (interests >= 5) score += 10;
  else if (interests >= 1) score += 5;
  else missing.push('interests');

  // ── Step 6: lifestyle (15 pts)
  const lifestyle = [profile.height, profile.education, profile.languages, profile.diet]
    .filter(v => v != null && v !== '').length;
  score += Math.min(lifestyle * 4, 15);
  if (lifestyle < 2) missing.push('lifestyle');

  // ── Verification (5 pts)
  if (user?.verified) score += 5;

  const dtm = !!profile.seriousMode;
  if (dtm) {
    let dtmFilled = 0;
    for (const f of DTM_REQUIRED_FIELDS) {
      const v = (profile as any)[f];
      if (v !== null && v !== undefined && v !== '') dtmFilled++;
      else missing.push(f);
    }
    // DTM users need the extra fields to reach 80
    score = Math.min(100, Math.round(score * 0.75) + Math.round((dtmFilled / DTM_REQUIRED_FIELDS.length) * 25));
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    missing,
    threshold: dtm ? DTM_THRESHOLD : CASUAL_THRESHOLD,
    dtm,
  };
}

export async function recomputeAndPersistCompletion(
  prisma: PrismaClient,
  userId: string,
): Promise<CompletionResult> {
  const result = await computeCompletionScore(prisma, userId);
  await prisma.profile.update({
    where: { userId },
    data: {
      completionScore: result.score,
      completionMissing: result.missing,
    },
  });
  return result;
}
