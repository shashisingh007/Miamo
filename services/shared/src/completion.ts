// ─── v3.2 Onboarding Completion Score ─────────────────────────
// Pure, deterministic, bucket-based scoring. Two completely separate
// profile shapes are scored here:
//
//   • CASUAL (Discover)   → Profile + photos + prompts + interests. Gate: 60%.
//   • DTM    (Matrimony)  → MatrimonialProfile (inherits photos/identity from
//                            casual Profile, one-way). Gate: 75%.
//
// Used by:
//   • gateway requireOnboarded — only `score`/`threshold` matter there
//   • users service /profiles/me/completion endpoint — returns full bucket
//     breakdown so the onboarding UI can render per-step point cards.

import type { PrismaClient } from '@prisma/client';

export const CASUAL_THRESHOLD = 60;
export const DTM_THRESHOLD = 75;

export interface CompletionBucket {
  key: string;            // stable identifier used by the UI to render cards
  label: string;          // human-readable card title
  hint: string;           // short helper line under the title
  pts: number;            // weight contributed by this bucket
  earned: number;         // 0..pts the user has earned in this bucket
  done: boolean;          // earned >= pts
  fields: string[];       // raw field keys the bucket touches (for deep-link)
  visibility: 'PUBLIC' | 'MATCHES_ONLY' | 'REQUEST_ACCESS';
}

export interface CompletionResult {
  score: number;             // 0..100 weighted score
  threshold: number;         // 60 or 75
  dtm: boolean;              // which profile kind this scoring describes
  missing: string[];         // flat list of field keys still owed (UI badges)
  buckets: CompletionBucket[]; // ordered cards for the onboarding screen
}

// ─── helpers ──────────────────────────────────────────────────
const filled = (v: unknown) =>
  v !== null && v !== undefined && v !== '' && v !== 0 && v !== 'Unknown' && v !== 'Not set';

const countFilled = (...vals: unknown[]) => vals.filter(filled).length;

function bucket(b: Omit<CompletionBucket, 'done'>): CompletionBucket {
  return { ...b, done: b.earned >= b.pts };
}

// ─── CASUAL scoring (gate = 60) ───────────────────────────────
async function scoreCasual(prisma: PrismaClient, userId: string): Promise<CompletionResult> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    return { score: 0, threshold: CASUAL_THRESHOLD, dtm: false, missing: ['profile'], buckets: [] };
  }
  const [photos, prompts, interests, user] = await Promise.all([
    prisma.profilePhoto.count({ where: { userId } }),
    prisma.profilePrompt.count({ where: { userId } }),
    prisma.profileInterest.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { verified: true } }),
  ]);
  const missing: string[] = [];
  const buckets: CompletionBucket[] = [];

  // Identity (age + gender) — 10
  {
    const ok = filled(profile.age) && filled(profile.gender);
    if (!ok) { if (!filled(profile.age)) missing.push('age'); if (!filled(profile.gender)) missing.push('gender'); }
    buckets.push(bucket({ key: 'identity', label: 'Age & gender', hint: 'Required to show you in discover.', pts: 10, earned: ok ? 10 : 0, fields: ['age','gender'], visibility: 'PUBLIC' }));
  }
  // City — 5
  {
    const ok = filled(profile.city);
    if (!ok) missing.push('city');
    buckets.push(bucket({ key: 'city', label: 'City', hint: 'Shown approximately if you enable privacy.', pts: 5, earned: ok ? 5 : 0, fields: ['city'], visibility: 'PUBLIC' }));
  }
  // Photos — 25 (4=18, 5=22, 6=25, fewer = 0..15)
  {
    let earned = 0;
    if (photos >= 6) earned = 25;
    else if (photos === 5) earned = 22;
    else if (photos === 4) earned = 18;
    else earned = photos * 4; // 1=4, 2=8, 3=12
    if (photos < 4) missing.push('photos');
    buckets.push(bucket({ key: 'photos', label: `Photos (${photos}/6)`, hint: 'Upload 4–6 clear photos. First one is your hero.', pts: 25, earned, fields: ['photos'], visibility: 'PUBLIC' }));
  }
  // Bio — 10 (≥40 chars full, ≥15 partial)
  {
    const len = (profile.bio ?? '').length;
    const earned = len >= 40 ? 10 : len >= 15 ? 5 : 0;
    if (len < 40) missing.push('bio');
    buckets.push(bucket({ key: 'bio', label: 'Bio', hint: 'At least 40 characters — give people a reason to swipe right.', pts: 10, earned, fields: ['bio'], visibility: 'PUBLIC' }));
  }
  // Prompts — 15 (3 answered)
  {
    const earned = prompts >= 3 ? 15 : prompts === 2 ? 10 : prompts === 1 ? 5 : 0;
    if (prompts < 3) missing.push('prompts');
    buckets.push(bucket({ key: 'prompts', label: `Prompts (${prompts}/3)`, hint: 'Pick 3 prompts and answer in one line each.', pts: 15, earned, fields: ['prompts'], visibility: 'PUBLIC' }));
  }
  // Interests — 10 (≥5 picked)
  {
    const earned = interests >= 5 ? 10 : interests >= 3 ? 6 : interests >= 1 ? 3 : 0;
    if (interests < 5) missing.push('interests');
    buckets.push(bucket({ key: 'interests', label: `Interests (${interests}/5)`, hint: 'Tap 5+ chips that describe you.', pts: 10, earned, fields: ['interests'], visibility: 'PUBLIC' }));
  }
  // Lifestyle — 10 (≥5 of 10 filled)
  {
    const lifestyleVals = [profile.height, profile.education, profile.languages, profile.diet, profile.drinking, profile.smoking, profile.exercise, profile.religion, profile.pets, profile.children];
    const f = countFilled(...lifestyleVals);
    const earned = Math.min(10, Math.round((f / 5) * 10));
    if (f < 5) missing.push('lifestyle');
    buckets.push(bucket({ key: 'lifestyle', label: `Lifestyle (${f}/10 filled)`, hint: 'Pick chips & dropdowns — no typing needed.', pts: 10, earned, fields: ['height','education','languages','diet','drinking','smoking','exercise','religion','pets','children'], visibility: 'PUBLIC' }));
  }
  // Looking for — 5
  {
    const ok = filled(profile.lookingFor) && profile.lookingFor !== 'open';
    if (!ok) missing.push('lookingFor');
    buckets.push(bucket({ key: 'lookingFor', label: 'Looking for', hint: 'Tell us what kind of connection you want.', pts: 5, earned: ok ? 5 : 0, fields: ['lookingFor'], visibility: 'PUBLIC' }));
  }
  // Profession — 5
  {
    const ok = filled(profile.profession);
    if (!ok) missing.push('profession');
    buckets.push(bucket({ key: 'profession', label: 'Profession', hint: 'What you do day-to-day.', pts: 5, earned: ok ? 5 : 0, fields: ['profession'], visibility: 'PUBLIC' }));
  }
  // Verification — 5
  {
    const ok = !!user?.verified;
    if (!ok) missing.push('verification');
    buckets.push(bucket({ key: 'verification', label: 'Verify email', hint: 'Verified profiles get 3× more matches.', pts: 5, earned: ok ? 5 : 0, fields: ['email'], visibility: 'PUBLIC' }));
  }

  const score = Math.max(0, Math.min(100, buckets.reduce((s, b) => s + b.earned, 0)));
  return { score, threshold: CASUAL_THRESHOLD, dtm: false, missing, buckets };
}

// ─── DTM scoring (gate = 75) ──────────────────────────────────
async function scoreDtm(prisma: PrismaClient, userId: string): Promise<CompletionResult> {
  // DTM inherits the casual profile (one-way) — we read both.
  const [profile, mp, photos, user] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    (prisma as any).matrimonialProfile.findUnique({ where: { userId } }),
    prisma.profilePhoto.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { verified: true } }),
  ]);
  if (!profile) {
    return { score: 0, threshold: DTM_THRESHOLD, dtm: true, missing: ['profile'], buckets: [] };
  }
  const m = mp ?? {};
  const missing: string[] = [];
  const buckets: CompletionBucket[] = [];

  // Inherited basics — 10
  {
    const ok = filled(profile.age) && filled(profile.gender) && filled(profile.city) && photos >= 1;
    if (!ok) {
      if (!filled(profile.age)) missing.push('age');
      if (!filled(profile.gender)) missing.push('gender');
      if (!filled(profile.city)) missing.push('city');
      if (photos < 1) missing.push('photos');
    }
    buckets.push(bucket({ key: 'inherited', label: 'Basics (from Discover)', hint: 'Age, gender, city and at least 1 photo — already on your Discover profile.', pts: 10, earned: ok ? 10 : 0, fields: ['age','gender','city','photos'], visibility: 'PUBLIC' }));
  }
  // ≥4 photos — 5
  {
    const earned = photos >= 4 ? 5 : photos >= 2 ? 2 : 0;
    if (photos < 4) missing.push('dtm-photos');
    buckets.push(bucket({ key: 'dtm-photos', label: `DTM photos (${photos}/4+)`, hint: 'Shared with your Discover gallery.', pts: 5, earned, fields: ['photos'], visibility: 'PUBLIC' }));
  }
  // Marital status — 5
  {
    const ok = filled(m.maritalStatus) && m.maritalStatus !== 'Never Married' ? true : filled(m.maritalStatus);
    if (!filled(m.maritalStatus)) missing.push('maritalStatus');
    buckets.push(bucket({ key: 'maritalStatus', label: 'Marital status', hint: 'Pick from the dropdown.', pts: 5, earned: filled(m.maritalStatus) ? 5 : 0, fields: ['maritalStatus'], visibility: 'PUBLIC' }));
  }
  // DOB + height + motherTongue — 10
  {
    const f = countFilled(m.dateOfBirth, m.height, m.motherTongue);
    const earned = Math.round((f / 3) * 10);
    if (f < 3) { if (!filled(m.dateOfBirth)) missing.push('dateOfBirth'); if (!filled(m.height)) missing.push('height'); if (!filled(m.motherTongue)) missing.push('motherTongue'); }
    buckets.push(bucket({ key: 'dtm-basics', label: 'Date of birth · height · mother tongue', hint: 'All dropdowns / pickers.', pts: 10, earned, fields: ['dateOfBirth','height','motherTongue'], visibility: 'PUBLIC' }));
  }
  // Religion + caste + manglik — 10
  {
    const f = countFilled(m.religion, m.caste, m.manglik);
    const earned = Math.round((f / 3) * 10);
    if (!filled(m.religion)) missing.push('religion');
    if (!filled(m.caste)) missing.push('caste');
    buckets.push(bucket({ key: 'community', label: 'Religion · caste · manglik', hint: 'Pick from lists — typing optional.', pts: 10, earned, fields: ['religion','caste','manglik','subCaste'], visibility: 'PUBLIC' }));
  }
  // Education — 10 (level public, college matches-only)
  {
    const f = countFilled(m.education, m.educationDetail, m.college);
    const earned = Math.round((f / 3) * 10);
    if (!filled(m.education)) missing.push('education');
    buckets.push(bucket({ key: 'education', label: 'Education', hint: 'Highest degree, field, and institution.', pts: 10, earned, fields: ['education','educationDetail','college'], visibility: 'PUBLIC' }));
  }
  // Career — 10 (occupation public; company/income matches-only)
  {
    const f = countFilled(m.occupation, m.company, m.annualIncome);
    const earned = Math.round((f / 3) * 10);
    if (!filled(m.occupation)) missing.push('occupation');
    if (!filled(m.annualIncome)) missing.push('annualIncome');
    buckets.push(bucket({ key: 'career', label: 'Career & income', hint: 'Company & income visible only to matches.', pts: 10, earned, fields: ['occupation','company','annualIncome','workingCity'], visibility: 'MATCHES_ONLY' }));
  }
  // Family — 10 (matches only)
  {
    const f = countFilled(m.fatherOccupation, m.familyType, m.familyValues) + ((m.brothers ?? 0) + (m.sisters ?? 0) > 0 ? 1 : 0);
    const earned = Math.round((Math.min(f, 4) / 4) * 10);
    if (!filled(m.fatherOccupation)) missing.push('fatherOccupation');
    buckets.push(bucket({ key: 'family', label: 'Family', hint: 'Father\'s occupation, family type/values, siblings.', pts: 10, earned, fields: ['fatherOccupation','familyType','familyValues','brothers','sisters'], visibility: 'MATCHES_ONLY' }));
  }
  // About me — 10 (≥120 chars)
  {
    const len = (m.aboutMe ?? '').length;
    const earned = len >= 120 ? 10 : len >= 50 ? 5 : 0;
    if (len < 120) missing.push('aboutMe');
    buckets.push(bucket({ key: 'aboutMe', label: 'About me', hint: 'Write 2–3 honest lines about who you are.', pts: 10, earned, fields: ['aboutMe'], visibility: 'PUBLIC' }));
  }
  // About family — 5 (≥80 chars, matches only)
  {
    const len = (m.aboutFamily ?? '').length;
    const earned = len >= 80 ? 5 : len >= 30 ? 2 : 0;
    if (len < 80) missing.push('aboutFamily');
    buckets.push(bucket({ key: 'aboutFamily', label: 'About family', hint: '80+ chars; visible only to matches.', pts: 5, earned, fields: ['aboutFamily'], visibility: 'MATCHES_ONLY' }));
  }
  // Partner preferences — 10 (age range + 3 of community/edu/occ/income/diet)
  {
    const ageOk = (m.partnerAgeMin ?? 0) < (m.partnerAgeMax ?? 0);
    const optional = countFilled(m.partnerReligion, m.partnerCaste, m.partnerEducation, m.partnerOccupation, m.partnerIncome, m.partnerDiet);
    const earned = (ageOk ? 4 : 0) + Math.min(6, optional * 2);
    if (!ageOk || optional < 3) missing.push('partnerPrefs');
    buckets.push(bucket({ key: 'partnerPrefs', label: 'Partner preferences', hint: 'Age range + at least 3 deal-breakers.', pts: 10, earned: Math.min(10, earned), fields: ['partnerAgeMin','partnerAgeMax','partnerReligion','partnerCaste','partnerEducation','partnerOccupation','partnerIncome','partnerDiet'], visibility: 'MATCHES_ONLY' }));
  }
  // Kundli / horoscope — 5 (kundliUrl OR star+raasi+nakshatra)
  {
    const ok = filled(m.kundliUrl) || (filled(m.star) && filled(m.raasi) && filled(m.nakshatra));
    if (!ok) missing.push('kundli');
    buckets.push(bucket({ key: 'kundli', label: 'Horoscope / kundli', hint: 'Upload kundli OR fill star + raasi + nakshatra. Released on access request.', pts: 5, earned: ok ? 5 : 0, fields: ['kundliUrl','star','raasi','nakshatra'], visibility: 'REQUEST_ACCESS' }));
  }
  // Verification — visibility booster, not scored separately; the user is expected
  // to already be verified before unlocking DTM.

  const score = Math.max(0, Math.min(100, buckets.reduce((s, b) => s + b.earned, 0)));
  return { score, threshold: DTM_THRESHOLD, dtm: true, missing, buckets };
}

// ─── public API ───────────────────────────────────────────────
export async function computeCompletionScore(
  prisma: PrismaClient,
  userId: string,
): Promise<CompletionResult> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { seriousMode: true } });
  if (!profile) {
    return { score: 0, threshold: CASUAL_THRESHOLD, dtm: false, missing: ['profile'], buckets: [] };
  }
  return profile.seriousMode ? scoreDtm(prisma, userId) : scoreCasual(prisma, userId);
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
  }).catch(() => { /* profile may not exist yet */ });
  return result;
}
