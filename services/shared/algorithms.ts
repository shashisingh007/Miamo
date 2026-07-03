// ─── Miamo Algorithm Engine ──────────────────────────
// Each discover filter tab, search mode, feed ranking, and DTM filter
// uses a DISTINCT data-driven algorithm. No two filters score the same way.
//
// Architecture:
//   scoreForYou()    → cosine-similarity preference vector + dwell-time boost
//   scoreNew()       → recency-weighted + completeness + photo quality proxy
//   scoreActive()    → responsiveness + activity frequency + conversation rate
//   scoreVerified()  → trust-weighted compatibility (verified pool only)
//   scoreSerious()   → values + lifestyle + age proximity + long-term intent
//   scoreAiPicks()   → multi-signal ensemble: collaborative filtering + behavior
//   scoreFeedItem()  → engagement + recency + relationship + content preference
//   scoreDtm()       → values_match + family_goals + education + location + kundli
//   fuzzySearch()    → Levenshtein distance + token matching
//   geoProximity()   → Haversine distance approximation

// ═══════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════

export interface CandidateProfile {
  id: string;
  age: number;
  city?: string;
  gender?: string;
  datingIntent?: string;
  lookingFor?: string;
  seriousMode?: boolean;
  profileScore: number;
  online?: boolean;
  lastActive?: Date | string | null;
  smoking?: string;
  drinking?: string;
  exercise?: string;
  education?: string;
  religion?: string;
  zodiac?: string;
  children?: string;
  pets?: string;
  height?: number;
  bio?: string;
  profession?: string;
  languages?: string;
}

export interface CandidateUser {
  id: string;
  verified: boolean;
  createdAt: Date | string;
  profile: CandidateProfile | null;
  interests: { name: string }[];
  photos: any[];
  prompts: any[];
}

export interface UserProfile extends CandidateProfile {
  // caller's own profile
}

export interface BehaviorVector {
  likedProfiles: Set<string>;
  passedProfiles: Set<string>;
  viewedProfiles: Map<string, number>; // id → dwell time ms
  preferredAge: { min: number; max: number } | null;
  preferredCities: string[];
  preferredIntents: string[];
  engagementLevel: number; // 0-100
  interactionPatterns: Record<string, number>;
}

export interface VibeData {
  mood?: string;
  intent?: string;
  topics?: string[];
}

export interface MatchHistoryInsights {
  avgMatchDuration: number;
  commonTraitsInSuccessful: string[];
  unmatchReasons: Record<string, number>;
}

export interface FeedItem {
  id: string;
  authorId: string;
  authorVerified: boolean;
  authorFollowedByUser: boolean;
  categoryName: string;
  trendScore: number;
  views: number;
  reactionCount: number;
  commentCount: number;
  createdAt: Date | string;
  alreadyViewed: boolean;
}

export interface FeedUserProfile {
  interestNames: string[];
  categoryEngagement: Record<string, number>;
  followedAuthors: Set<string>;
  activitySignals: { viewedCategories: Record<string, number>; searchTerms: string[]; dwellPatterns: Record<string, number> };
}

export interface DtmCandidate {
  religion?: string;
  caste?: string;
  gotra?: string;
  manglik?: string;
  motherTongue?: string;
  diet?: string;
  education?: string;
  annualIncome?: string;
  workingCity?: string;
  height?: string;
  bodyType?: string;
  familyType?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: string;
  familyValues?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  partnerAgeMin?: number;
  partnerAgeMax?: number;
  partnerReligion?: string;
  partnerCaste?: string;
  userAge?: number;
}

export interface DtmUser extends DtmCandidate {
  // own profile
}

// ═══════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════

/** Clamp a number between min and max */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Hours since a date */
function hoursSince(date: Date | string | null | undefined): number {
  if (!date) return 9999;
  return (Date.now() - new Date(date).getTime()) / 3600000;
}

/** Days since a date */
function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 9999;
  return (Date.now() - new Date(date).getTime()) / 86400000;
}

/**
 * Deterministic 0..1 jitter that is stable for a given (viewer, candidate)
 * pair within a rotation window (default 5 minutes). Replaces `Math.random()`
 * in ranker score adjustments so back-to-back /discover requests in the same
 * window produce the same ordering — the variety still rotates between
 * windows, but the user never sees their top-5 shuffle on a single refresh.
 */
const JITTER_WINDOW_MS = 5 * 60 * 1000;
export function stableJitter(viewerId: string | null | undefined, candidateId: string | null | undefined, windowMs: number = JITTER_WINDOW_MS): number {
  const win = Math.floor(Date.now() / Math.max(1, windowMs));
  const s = `${viewerId || ''}|${candidateId || ''}|${win}`;
  // FNV-1a 32-bit hash → [0, 1)
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Cosine similarity between two vectors (Maps) */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0, magA = 0, magB = 0;
  for (const [key, valA] of a) {
    magA += valA * valA;
    const valB = b.get(key) || 0;
    dotProduct += valA * valB;
  }
  for (const [, valB] of b) magB += valB * valB;
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Levenshtein edit distance (for fuzzy search) */
/**
 * Compute Levenshtein (edit) distance between two strings.
 * Returns the minimum number of single-character edits (insertions, deletions,
 * substitutions) required to transform string `a` into string `b`.
 *
 * Complexity: O(m × n) time and space, where m and n are string lengths.
 *
 * @param a - Source string
 * @param b - Target string
 * @returns The edit distance (0 = identical)
 */
export function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const matrix: number[][] = [];
  for (let i = 0; i <= la; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= lb; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return matrix[la][lb];
}

/** Normalized fuzzy similarity (0-1, 1 = exact match) */
/**
 * Normalized fuzzy similarity between two strings on a 0–1 scale.
 * Uses Levenshtein distance internally: `1 - (editDistance / maxLength)`.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (1.0 = identical, 0.0 = completely different)
 */
export function fuzzySimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

/** Haversine approximation for distance between two city strings (simplified) */
// In production this would use geocoded lat/lng; here we use string matching
/**
 * Approximate geographic proximity between two city names.
 *
 * In production this would use geocoded lat/lng with Haversine;
 * here it uses string matching as a simplified proxy.
 *
 * @param cityA - First city name
 * @param cityB - Second city name
 * @returns Proximity score (10 = exact match, 7 = partial, 3 = prefix, 0 = no match)
 */
export function cityProximityScore(cityA?: string, cityB?: string): number {
  if (!cityA || !cityB) return 0;
  const a = cityA.toLowerCase().trim();
  const b = cityB.toLowerCase().trim();
  if (a === b) return 10;
  // Partial match (e.g., "New Delhi" contains "Delhi")
  if (a.includes(b) || b.includes(a)) return 7;
  // Same first 3 chars (rough geographic proxy)
  if (a.slice(0, 3) === b.slice(0, 3)) return 3;
  return 0;
}

// Zodiac compatibility lookup
const ZODIAC_COMPAT: Record<string, string[]> = {
  Aries: ['Leo', 'Sagittarius', 'Gemini', 'Aquarius'],
  Taurus: ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
  Gemini: ['Libra', 'Aquarius', 'Aries', 'Leo'],
  Cancer: ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
  Leo: ['Aries', 'Sagittarius', 'Gemini', 'Libra'],
  Virgo: ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
  Libra: ['Gemini', 'Aquarius', 'Leo', 'Sagittarius'],
  Scorpio: ['Cancer', 'Pisces', 'Virgo', 'Capricorn'],
  Sagittarius: ['Aries', 'Leo', 'Libra', 'Aquarius'],
  Capricorn: ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
  Aquarius: ['Gemini', 'Libra', 'Aries', 'Sagittarius'],
  Pisces: ['Cancer', 'Scorpio', 'Taurus', 'Capricorn'],
};

// ═══════════════════════════════════════════════════════
// 1. DISCOVER: "FOR YOU" — Preference Vector Cosine Similarity
// ═══════════════════════════════════════════════════════
// Algorithm: Builds a preference vector from user's behavior history
// (liked profiles, dwell time, city prefs, intent prefs) and computes
// cosine similarity with each candidate's feature vector.
// Heavy weight on learned preferences over static profile matching.

/**
 * Discover "For You" algorithm — cosine-similarity preference matching.
 *
 * Builds a preference vector from the user's behavioral history (liked profiles,
 * dwell time, city/intent preferences) and computes cosine similarity against
 * each candidate's feature vector. Applies modifiers for dwell-time, vibe compatibility,
 * profile quality, activity recency, and intent alignment.
 *
 * Complexity: O(d) per candidate where d = feature dimensions.
 *
 * @param myProfile - The current user's profile
 * @param candidate - A candidate user to score
 * @param myInterests - Current user's interest tags
 * @param behavior - Learned behavioral signals (likes, passes, dwell times, preferences)
 * @param myVibe - Current user's vibe check data (optional)
 * @param candidateVibe - Candidate's vibe check data (optional)
 * @returns Compatibility score 0–100
 */
export function scoreForYou(
  myProfile: UserProfile | null,
  candidate: CandidateUser,
  myInterests: string[],
  behavior: BehaviorVector,
  myVibe?: VibeData | null,
  candidateVibe?: VibeData | null,
): number {
  const cp = candidate.profile;
  if (!cp) return 0;

  // ── Build user preference vector (from behavior) ──
  const prefVector = new Map<string, number>();
  // City preferences (learned from likes)
  for (const city of behavior.preferredCities) prefVector.set(`city:${city}`, 3);
  // Intent preferences
  for (const intent of behavior.preferredIntents) prefVector.set(`intent:${intent}`, 4);
  // Age range preference
  if (behavior.preferredAge) {
    const midAge = (behavior.preferredAge.min + behavior.preferredAge.max) / 2;
    prefVector.set('age:center', midAge);
    prefVector.set('age:range', behavior.preferredAge.max - behavior.preferredAge.min);
  }
  // Interest preferences (from profile)
  for (const interest of myInterests) prefVector.set(`interest:${interest.toLowerCase()}`, 2);
  // Engagement level as signal strength
  prefVector.set('engagement', behavior.engagementLevel / 100);

  // ── Build candidate feature vector ──
  const candVector = new Map<string, number>();
  if (cp.city) candVector.set(`city:${cp.city.toLowerCase()}`, 3);
  if (cp.datingIntent) candVector.set(`intent:${cp.datingIntent}`, 4);
  candVector.set('age:center', cp.age);
  candVector.set('age:range', 10); // assumed range
  for (const i of candidate.interests) candVector.set(`interest:${i.name.toLowerCase()}`, 2);
  candVector.set('engagement', cp.online ? 1 : 0.3);

  // ── Cosine similarity (0-1) mapped to 0-40 ──
  // Cosine similarity gives a 0-1 value indicating how aligned the user's
  // learned preferences are with this candidate's features. Scaled to 0-40
  // because it's the dominant signal (40% of max score) for personalized results.
  const similarity = cosineSimilarity(prefVector, candVector);
  let score = similarity * 40;

  // ── Interest overlap bonus (0-15) ──
  const candInterests = candidate.interests.map(i => i.name);
  const common = candInterests.filter(i => myInterests.includes(i));
  score += Math.min(common.length * 3, 15);

  // ── Dwell-time boost: users who spent time viewing similar profiles get related candidates boosted ──
  // >15s dwell = genuine interest (+8), >8s = moderate interest (+4), <2s = quick skip (-5 penalty)
  // This is a key behavioral signal — actions speak louder than stated preferences.
  const dwellTime = behavior.viewedProfiles.get(candidate.id);
  if (dwellTime && dwellTime > 15000) score += 8;
  else if (dwellTime && dwellTime > 8000) score += 4;
  else if (dwellTime && dwellTime < 2000) score -= 5; // quick skip

  // ── Behavioral penalties ──
  if (behavior.passedProfiles.has(candidate.id)) score -= 25;

  // ── Vibe compatibility bonus (0-8) ──
  if (myVibe && candidateVibe) {
    if (candidateVibe.mood === myVibe.mood) score += 3;
    if (candidateVibe.intent === myVibe.intent) score += 2;
    const myTopics = myVibe.topics || [];
    const theirTopics = candidateVibe.topics || [];
    score += Math.min(myTopics.filter(t => theirTopics.includes(t)).length * 1.5, 3);
  }

  // ── Profile quality floor (0-5) ──
  if (cp.profileScore >= 80) score += 5;
  else if (cp.profileScore >= 60) score += 3;

  // ── Activity recency (0-5) ──
  const hrs = hoursSince(cp.lastActive);
  if (cp.online) score += 5;
  else if (hrs < 1) score += 4;
  else if (hrs < 24) score += 2;

  // ── Intent alignment supplemental (0-8) ──
  if (myProfile?.datingIntent === cp.datingIntent) score += 8;
  else if (myProfile?.seriousMode === cp.seriousMode) score += 4;

  // ── Diversity jitter (0-3, stable per (viewer, candidate) within window) ──
  score += stableJitter(myProfile?.id, candidate.id) * 3;

  return clamp(Math.round(score), 0, 100);
}

// ═══════════════════════════════════════════════════════
// 2. DISCOVER: "NEW" — Freshness-First Algorithm
// ═══════════════════════════════════════════════════════
// Algorithm: Exponential-decay recency function.
// Score = recency_weight * e^(-decay * days_old) + completeness + photo_quality
// Completely ignores behavioral signals — pure discovery of newcomers.

/**
 * Discover "New" algorithm — freshness-first exponential decay.
 *
 * Scores newcomers using: `45 × e^(-0.15 × days)` for recency,
 * plus profile completeness, photo quality proxy, interest overlap,
 * and early activity signal. Ignores behavioral history entirely.
 *
 * @param candidate - A candidate user to score
 * @param myInterests - Current user's interest tags
 * @returns Freshness score 0–100
 */
export function scoreNew(
  candidate: CandidateUser,
  myInterests: string[],
): number {
  const cp = candidate.profile;
  if (!cp) return 0;

  // ── Recency (0-45): exponential decay from join date ──
  // Uses e^(-0.15d) which halves roughly every 4.6 days.
  // This aggressive decay ensures only truly new users appear in the "New" tab.
  // After ~3 weeks, the recency score approaches zero.
  const daysOld = daysSince(candidate.createdAt);
  const recencyScore = 45 * Math.exp(-0.15 * daysOld); // halves every ~4.6 days

  // ── Profile completeness (0-20) ──
  let completeness = 0;
  if (cp.bio && cp.bio.length > 20) completeness += 4;
  if (cp.profession) completeness += 3;
  if (cp.datingIntent) completeness += 3;
  if (cp.city) completeness += 2;
  if (candidate.photos.length >= 3) completeness += 4;
  else if (candidate.photos.length >= 1) completeness += 2;
  if (candidate.prompts.length >= 2) completeness += 4;
  else if (candidate.prompts.length >= 1) completeness += 2;

  // ── Photo quality proxy (0-15): more photos + verified = trustworthy ──
  let photoQuality = 0;
  photoQuality += Math.min(candidate.photos.length * 3, 9);
  if (candidate.verified) photoQuality += 6;

  // ── Interest overlap (0-10): light weight for serendipity ──
  const candInterests = candidate.interests.map(i => i.name);
  const common = candInterests.filter(i => myInterests.includes(i));
  const interestScore = Math.min(common.length * 2, 10);

  // ── Activity signal (0-10): new users who are active = engaged ──
  let activityBonus = 0;
  if (cp.online) activityBonus = 10;
  else if (hoursSince(cp.lastActive) < 6) activityBonus = 7;
  else if (hoursSince(cp.lastActive) < 24) activityBonus = 3;

  return clamp(Math.round(recencyScore + completeness + photoQuality + interestScore + activityBonus), 0, 100);
}

// ═══════════════════════════════════════════════════════
// 3. DISCOVER: "ACTIVE" — Responsiveness Algorithm
// ═══════════════════════════════════════════════════════
// Algorithm: Weighted scoring based on online status, login recency,
// response rate from messaging activity, content creation frequency,
// and conversation initiation rate. Prioritizes users who actually
// engage, not just exist.

/**
 * Discover "Active" algorithm — responsiveness-weighted ranking.
 *
 * Prioritizes users who actively engage: online status, response rate,
 * average response time, content creation frequency, and conversation
 * initiation rate. Includes light compatibility to keep results relevant.
 *
 * @param myProfile - The current user's profile
 * @param candidate - A candidate user to score
 * @param myInterests - Current user's interest tags
 * @param candidateActivity - Optional activity metrics for the candidate
 * @returns Activity score 0–100
 */
export function scoreActive(
  myProfile: UserProfile | null,
  candidate: CandidateUser,
  myInterests: string[],
  candidateActivity?: { responseRate: number; avgResponseTimeHrs: number; contentCreated: number; conversationsStarted: number },
): number {
  const cp = candidate.profile;
  if (!cp) return 0;

  // ── Online / recency (0-30) ──
  let onlineScore = 0;
  if (cp.online) onlineScore = 30;
  else {
    const hrs = hoursSince(cp.lastActive);
    if (hrs < 0.5) onlineScore = 25;
    else if (hrs < 1) onlineScore = 20;
    else if (hrs < 3) onlineScore = 15;
    else if (hrs < 6) onlineScore = 10;
    else if (hrs < 12) onlineScore = 5;
    else if (hrs < 24) onlineScore = 2;
  }

  // ── Response rate / engagement (0-25) ──
  let responseScore = 10; // default for unknown
  if (candidateActivity) {
    responseScore = candidateActivity.responseRate * 15; // 0-1 → 0-15
    // Fast responders get a bonus
    if (candidateActivity.avgResponseTimeHrs < 1) responseScore += 10;
    else if (candidateActivity.avgResponseTimeHrs < 6) responseScore += 5;
  }
  responseScore = Math.min(responseScore, 25);

  // ── Content creation frequency (0-15) ──
  let contentScore = 0;
  if (candidateActivity) {
    contentScore = Math.min(candidateActivity.contentCreated * 3, 10);
    contentScore += Math.min(candidateActivity.conversationsStarted * 2, 5);
  }

  // ── Light compatibility (0-20) — still want relevant active people ──
  let compatScore = 0;
  const candInterests = candidate.interests.map(i => i.name);
  const common = candInterests.filter(i => myInterests.includes(i));
  compatScore += Math.min(common.length * 3, 12);
  if (myProfile?.datingIntent === cp.datingIntent) compatScore += 5;
  if (myProfile?.city?.toLowerCase() === cp.city?.toLowerCase()) compatScore += 3;
  compatScore = Math.min(compatScore, 20);

  // ── Profile minimum quality (0-10) ──
  let quality = 0;
  if (candidate.photos.length >= 2) quality += 4;
  if (candidate.prompts.length >= 1) quality += 3;
  if (candidate.verified) quality += 3;

  return clamp(Math.round(onlineScore + responseScore + contentScore + compatScore + quality), 0, 100);
}

// ═══════════════════════════════════════════════════════
// 4. DISCOVER: "VERIFIED" — Trust-Weighted Compatibility
// ═══════════════════════════════════════════════════════
// Algorithm: Among verified-only pool, uses deeper compatibility:
// mutual interests weighted by rarity, profile depth comparison,
// lifestyle alignment, and communication style matching.
// More emphasis on profile substance than behavioral signals.

/**
 * Discover "Verified" algorithm — trust-weighted compatibility for verified users.
 *
 * Uses rare-interest inverse document frequency weighting, profile depth comparison,
 * lifestyle alignment, age compatibility (Gaussian σ=5), and zodiac matching.
 * Only scores verified candidates; returns 0 for unverified.
 *
 * @param myProfile - The current user's profile
 * @param candidate - A candidate user to score (must be verified)
 * @param myInterests - Current user's interest tags
 * @param interestPopularity - Optional map of interest name → user count (for IDF weighting)
 * @returns Trust-weighted compatibility score 0–100
 */
export function scoreVerified(
  myProfile: UserProfile | null,
  candidate: CandidateUser,
  myInterests: string[],
  interestPopularity?: Map<string, number>, // interest → how many users have it (lower = rarer = more meaningful)
): number {
  const cp = candidate.profile;
  if (!cp || !candidate.verified) return 0;

  // ── Rare-interest overlap (0-25) ──
  // Common interests that fewer people have are weighted more heavily (inverse frequency).
  // Rationale: Sharing "Travel" (everyone has it) is less meaningful than sharing
  // "Bouldering" or "Vinyl Records". The log2 scale compresses popularity differences.
  const candInterests = candidate.interests.map(i => i.name);
  const common = candInterests.filter(i => myInterests.includes(i));
  let interestScore = 0;
  for (const interest of common) {
    const popularity = interestPopularity?.get(interest) || 50;
    // Inverse frequency weighting: rare interests = higher score
    const weight = Math.max(1, 10 - Math.log2(popularity + 1));
    interestScore += weight;
  }
  interestScore = Math.min(interestScore, 25);

  // ── Profile depth comparison (0-15) ──
  // Both having detailed profiles = better signal of genuine intent
  let depthScore = 0;
  const myDepth = myProfile?.profileScore || 0;
  const theirDepth = cp.profileScore;
  // Similar depth = aligned effort
  if (Math.abs(myDepth - theirDepth) <= 15) depthScore += 8;
  else if (Math.abs(myDepth - theirDepth) <= 30) depthScore += 4;
  // High absolute depth
  if (theirDepth >= 80) depthScore += 7;
  else if (theirDepth >= 60) depthScore += 4;

  // ── Lifestyle alignment (0-20) — weighted deeper for verified pool ──
  let lifestyleScore = 0;
  if (myProfile) {
    if (myProfile.smoking === cp.smoking) lifestyleScore += 4;
    if (myProfile.drinking === cp.drinking) lifestyleScore += 4;
    if (myProfile.exercise === cp.exercise) lifestyleScore += 4;
    if (myProfile.children && cp.children && myProfile.children === cp.children) lifestyleScore += 4;
    if (myProfile.religion && cp.religion && myProfile.religion === cp.religion) lifestyleScore += 4;
  }
  lifestyleScore = Math.min(lifestyleScore, 20);

  // ── Intent & city match (0-15) ──
  let intentScore = 0;
  if (myProfile?.datingIntent === cp.datingIntent) intentScore += 10;
  if (myProfile?.city?.toLowerCase() === cp.city?.toLowerCase()) intentScore += 5;

  // ── Age compatibility curve (0-10) — bell curve around preference ──
  let ageScore = 0;
  if (myProfile) {
    const ageDiff = Math.abs(myProfile.age - cp.age);
    // Gaussian-like: score = 10 * e^(-(diff^2)/(2*sigma^2)), sigma=5
    ageScore = 10 * Math.exp(-(ageDiff * ageDiff) / 50);
  }

  // ── Photo quality (0-8) ──
  let photoScore = Math.min(candidate.photos.length * 2, 6);
  if (candidate.prompts.length >= 2) photoScore += 2;

  // ── Zodiac bonus (0-5) ──
  let zodiacBonus = 0;
  if (myProfile?.zodiac && cp.zodiac && ZODIAC_COMPAT[myProfile.zodiac]?.includes(cp.zodiac)) {
    zodiacBonus = 5;
  }

  // ── Diversity noise (0-2, stable per (viewer, candidate) within window) ──
  const jitter = stableJitter(myProfile?.id, candidate.id) * 2;

  return clamp(Math.round(interestScore + depthScore + lifestyleScore + intentScore + ageScore + photoScore + zodiacBonus + jitter), 0, 100);
}

// ═══════════════════════════════════════════════════════
// 5. DISCOVER: "SERIOUS" — Long-Term Compatibility Algorithm
// ═══════════════════════════════════════════════════════
// Algorithm: Multi-dimensional compatibility scoring focused on
// long-term relationship success factors: values alignment,
// lifestyle fit, family goals, age proximity, location feasibility,
// education level, and religious/cultural compatibility.
// Ignores short-term attractiveness signals like photos/online.

/**
 * Discover "Serious" algorithm — long-term compatibility scoring.
 *
 * Multi-dimensional scoring focused on relationship success factors:
 * values/beliefs (20pt), lifestyle (20pt), family goals (15pt),
 * age proximity with narrow Gaussian σ=3 (15pt), location (10pt),
 * interest depth (10pt), profile substance (8pt), verified bonus (2pt).
 * Ignores short-term attractiveness signals like photos or online status.
 *
 * @param myProfile - The current user's profile
 * @param candidate - A candidate user to score
 * @param myInterests - Current user's interest tags
 * @returns Long-term compatibility score 0–100
 */
export function scoreSerious(
  myProfile: UserProfile | null,
  candidate: CandidateUser,
  myInterests: string[],
): number {
  const cp = candidate.profile;
  if (!cp) return 0;

  // ── Values & beliefs alignment (0-20) ──
  let valuesScore = 0;
  if (myProfile) {
    if (myProfile.religion && cp.religion && myProfile.religion.toLowerCase() === cp.religion.toLowerCase()) valuesScore += 10;
    if (myProfile.children && cp.children && myProfile.children === cp.children) valuesScore += 5;
    // Zodiac compatibility
    if (myProfile.zodiac && cp.zodiac && ZODIAC_COMPAT[myProfile.zodiac]?.includes(cp.zodiac)) valuesScore += 5;
  }

  // ── Lifestyle compatibility (0-20) — weighted heavily ──
  let lifestyleScore = 0;
  if (myProfile) {
    if (myProfile.smoking === cp.smoking) lifestyleScore += 5;
    if (myProfile.drinking === cp.drinking) lifestyleScore += 5;
    if (myProfile.exercise === cp.exercise) lifestyleScore += 5;
    // Education level compatibility
    const eduLevels: Record<string, number> = { 'high-school': 1, 'bachelors': 2, 'masters': 3, 'phd': 4 };
    const myEdu = eduLevels[myProfile.education || ''] || 0;
    const theirEdu = eduLevels[cp.education || ''] || 0;
    if (myEdu > 0 && theirEdu > 0 && Math.abs(myEdu - theirEdu) <= 1) lifestyleScore += 5;
  }

  // ── Family goals alignment (0-15) ──
  let familyScore = 0;
  if (myProfile?.datingIntent === cp.datingIntent) familyScore += 10;
  if (myProfile?.seriousMode && cp.seriousMode) familyScore += 5;

  // ── Age proximity (0-15) — tighter curve for serious relationships ──
  // Uses a narrower Gaussian (σ=3) compared to the Verified tab (σ=5).
  // For serious mode, age proximity matters more because life-stage alignment
  // is a stronger predictor of long-term relationship success.
  let ageScore = 0;
  if (myProfile) {
    const ageDiff = Math.abs(myProfile.age - cp.age);
    // Narrower Gaussian: sigma=3 means 1 std dev = 3 years, drops rapidly beyond that
    ageScore = 15 * Math.exp(-(ageDiff * ageDiff) / 18);
  }

  // ── Location feasibility (0-10) ──
  const locationScore = cityProximityScore(myProfile?.city, cp.city);

  // ── Interest depth (0-10) — quality > quantity ──
  const candInterests = candidate.interests.map(i => i.name);
  const common = candInterests.filter(i => myInterests.includes(i));
  const interestScore = common.length >= 5 ? 10 : common.length >= 3 ? 7 : common.length >= 1 ? 4 : 0;

  // ── Profile substance (0-8) — bio length, prompts, as indicators of effort ──
  let substanceScore = 0;
  if (cp.bio && cp.bio.length > 50) substanceScore += 3;
  if (candidate.prompts.length >= 3) substanceScore += 3;
  else if (candidate.prompts.length >= 1) substanceScore += 1;
  if (cp.profileScore >= 70) substanceScore += 2;

  // ── Verified bonus for trust (0-2) ──
  const verifiedBonus = candidate.verified ? 2 : 0;

  return clamp(Math.round(valuesScore + lifestyleScore + familyScore + ageScore + locationScore + interestScore + substanceScore + verifiedBonus), 0, 100);
}

// ═══════════════════════════════════════════════════════
// 6. DISCOVER: "AI PICKS" — Full Ensemble Multi-Signal
// ═══════════════════════════════════════════════════════
// Algorithm: Ensemble scoring that combines:
//   - Collaborative filtering from successful match history
//   - Response time pattern matching (response_time_correlation)
//   - Content taste overlap from creativity engagement
//   - Beat engagement pattern similarity
//   - Time-of-day activity correlation
//   - Behavioral vector signal with sigmoid gating

/**
 * Discover "AI Picks" algorithm — full ensemble multi-signal scoring.
 *
 * Combines 6 weighted sub-models:
 * - Collaborative filtering (20%) — traits from successful match history
 * - Behavioral sigmoid (20%) — learned preferences gated by data confidence
 * - Deep compatibility (25%) — interests, intent, age, lifestyle, location
 * - Engagement patterns (15%) — response time, content taste, beat genre overlap
 * - Temporal correlation (10%) — active-hour overlap
 * - Vibe compatibility (10%) — mood/energy/topic alignment
 *
 * Applies feedback penalty for past negative interactions (passes/blocks/reports).
 *
 * @param myProfile - The current user's profile
 * @param candidate - A candidate user to score
 * @param myInterests - Current user's interest tags
 * @param behavior - Learned behavioral signals
 * @param matchHistory - Insights from past match success/failure
 * @param myVibe - Current user's vibe data (optional)
 * @param candidateVibe - Candidate's vibe data (optional)
 * @param feedbackPenalty - Score reduction from negative feedback (default: 0)
 * @param candidateEngagementData - Candidate's engagement metrics (optional)
 * @param myEngagementData - Current user's engagement metrics (optional)
 * @returns Ensemble AI score 0–100
 */
export function scoreAiPicks(
  myProfile: UserProfile | null,
  candidate: CandidateUser,
  myInterests: string[],
  behavior: BehaviorVector,
  matchHistory: MatchHistoryInsights,
  myVibe?: VibeData | null,
  candidateVibe?: VibeData | null,
  feedbackPenalty?: number,
  candidateEngagementData?: {
    responseTimeHrs: number;
    contentCategories: string[];
    beatGenres: string[];
    activeHours: number[]; // hour of day they're most active (0-23)
  },
  myEngagementData?: {
    responseTimeHrs: number;
    contentCategories: string[];
    beatGenres: string[];
    activeHours: number[];
  },
): number {
  const cp = candidate.profile;
  if (!cp) return 0;
  let score = 0;
  const weights = { collaborative: 0.20, behavioral: 0.20, compatibility: 0.25, engagement: 0.15, temporal: 0.10, vibe: 0.10 };

  // ── A) Collaborative filtering from match history (max 20) ──
  let collabScore = 0;
  const candInterests = candidate.interests.map(i => i.name);
  for (const trait of matchHistory.commonTraitsInSuccessful) {
    if (trait.startsWith('intent:') && `intent:${cp.datingIntent}` === trait) collabScore += 6;
    else if (trait.startsWith('city:') && `city:${cp.city?.toLowerCase()}` === trait) collabScore += 4;
    else if (candInterests.includes(trait)) collabScore += 3;
  }
  collabScore = Math.min(collabScore, 20);

  // ── B) Behavioral signal with sigmoid gating (max 20) ──
  // The sigmoid gate prevents the behavioral model from dominating when there's
  // insufficient data. Centered at engagementLevel=20: below that, behavioral
  // scores are dampened. This prevents cold-start users from getting random results.
  let behavScore = 0;
  const dataGate = 1 / (1 + Math.exp(-(behavior.engagementLevel - 20) / 10)); // sigmoid centered at 20
  if (behavior.preferredAge && cp.age >= behavior.preferredAge.min && cp.age <= behavior.preferredAge.max) behavScore += 6;
  if (behavior.preferredCities.includes(cp.city?.toLowerCase?.() || '')) behavScore += 5;
  if (behavior.preferredIntents.includes(cp.datingIntent || '')) behavScore += 5;
  // Dwell time intelligence
  const dwellTime = behavior.viewedProfiles.get(candidate.id);
  if (dwellTime && dwellTime > 12000) behavScore += 4;
  else if (dwellTime && dwellTime < 2000) behavScore -= 4;
  if (behavior.passedProfiles.has(candidate.id)) behavScore -= 15;
  behavScore = clamp(Math.round(behavScore * dataGate), -15, 20);

  // ── C) Deep compatibility (max 25) ──
  let compatScore = 0;
  const common = candInterests.filter(i => myInterests.includes(i));
  compatScore += common.length >= 5 ? 8 : common.length >= 3 ? 5 : common.length >= 1 ? 2 : 0;
  if (myProfile) {
    if (myProfile.datingIntent === cp.datingIntent) compatScore += 6;
    const ageDiff = Math.abs(myProfile.age - cp.age);
    compatScore += ageDiff <= 3 ? 4 : ageDiff <= 6 ? 2 : 0;
    if (myProfile.city?.toLowerCase() === cp.city?.toLowerCase()) compatScore += 3;
    // Lifestyle
    let lm = 0;
    if (myProfile.smoking === cp.smoking) lm++;
    if (myProfile.drinking === cp.drinking) lm++;
    if (myProfile.exercise === cp.exercise) lm++;
    if (myProfile.religion && cp.religion && myProfile.religion === cp.religion) lm++;
    compatScore += Math.min(lm, 4);
  }
  compatScore = Math.min(compatScore, 25);

  // ── D) Engagement pattern similarity (max 15) ──
  let engagementScore = 0;
  if (candidateEngagementData && myEngagementData) {
    // Response time correlation: similar response times = similar communication style
    const responseTimeDiff = Math.abs(candidateEngagementData.responseTimeHrs - myEngagementData.responseTimeHrs);
    if (responseTimeDiff < 1) engagementScore += 5;
    else if (responseTimeDiff < 3) engagementScore += 3;

    // Content taste overlap
    const myCategories = new Set(myEngagementData.contentCategories);
    const sharedCategories = candidateEngagementData.contentCategories.filter(c => myCategories.has(c));
    engagementScore += Math.min(sharedCategories.length * 2, 5);

    // Beat genre overlap
    const myGenres = new Set(myEngagementData.beatGenres);
    const sharedGenres = candidateEngagementData.beatGenres.filter(g => myGenres.has(g));
    engagementScore += Math.min(sharedGenres.length * 2, 5);
  }
  engagementScore = Math.min(engagementScore, 15);

  // ── E) Temporal correlation (max 10) ──
  let temporalScore = 0;
  if (candidateEngagementData?.activeHours && myEngagementData?.activeHours) {
    // Overlap in active hours (set intersection)
    const myHours = new Set(myEngagementData.activeHours);
    const sharedHours = candidateEngagementData.activeHours.filter(h => myHours.has(h));
    temporalScore = Math.min(sharedHours.length * 2, 10);
  } else if (cp.online) {
    temporalScore = 5; // currently online = same time pattern
  }

  // ── F) Vibe compatibility (max 10) ──
  let vibeScore = 0;
  if (myVibe && candidateVibe) {
    if (candidateVibe.mood === myVibe.mood) vibeScore += 4;
    if (candidateVibe.intent === myVibe.intent) vibeScore += 3;
    const myTopics = myVibe.topics || [];
    const theirTopics = candidateVibe.topics || [];
    vibeScore += Math.min(myTopics.filter(t => theirTopics.includes(t)).length * 1.5, 3);
  }

  // ── Weighted ensemble ──
  score = (
    collabScore * (weights.collaborative / 0.20) +
    behavScore * (weights.behavioral / 0.20) +
    compatScore * (weights.compatibility / 0.25) +
    engagementScore * (weights.engagement / 0.15) +
    temporalScore * (weights.temporal / 0.10) +
    vibeScore * (weights.vibe / 0.10)
  );

  // ── Quality floor ──
  if (candidate.verified) score += 3;
  if (cp.profileScore >= 80) score += 3;
  if (candidate.photos.length >= 3) score += 2;

  // ── Feedback penalty ──
  if (feedbackPenalty) score -= feedbackPenalty;

  return clamp(Math.round(score), 0, 100);
}

// ═══════════════════════════════════════════════════════
// 7. FEED RANKING — Engagement-Weighted Content Algorithm
// ═══════════════════════════════════════════════════════
// Algorithm: Combines 6 signals:
//   A) Trend momentum (velocity of engagement)
//   B) Engagement quality ratio (comments weigh 3x likes)
//   C) Category affinity (from user's interaction history)
//   D) Interest match (user profile → content category)
//   E) Recency decay (exponential, halves every 20 hours)
//   F) Relationship signal (content from people user knows)

/**
 * Creativity/Feed ranking algorithm — engagement-weighted content scoring.
 *
 * Combines trend momentum (engagement velocity), quality ratio (comments×3),
 * category affinity (personalized), interest match, recency decay (e^(-0.035h)),
 * relationship signal, verified author boost, and diversity penalization.
 *
 * @param item - The feed/creativity item to score
 * @param userProfile - The viewing user's profile with engagement history
 * @returns Content relevance score 0–100
 */
export function scoreFeedItem(
  item: FeedItem,
  userProfile: FeedUserProfile,
): number {
  let score = 0;

  // A) Trend momentum (0-25) — velocity matters more than absolute numbers.
  // A post with 10 reactions in 1 hour is more interesting than one with 50 in 3 days.
  // Comments are weighted 3x because they indicate deeper engagement than reactions.
  const ageHrs = hoursSince(item.createdAt);
  const engagementVelocity = ageHrs > 0
    ? (item.reactionCount + item.commentCount * 3) / ageHrs
    : item.reactionCount + item.commentCount * 3;
  score += Math.min(engagementVelocity * 5, 25);

  // B) Engagement quality (0-20) — comments weigh more than likes
  const totalInteractions = item.views || 1;
  const qualityRatio = (item.reactionCount + item.commentCount * 3) / totalInteractions;
  score += qualityRatio * 40; // amplify, cap at 20
  score = Math.min(score, 45); // soft cap on A+B combined

  // C) Category affinity (0-20) — personalized to user
  const catAffinity = userProfile.categoryEngagement[item.categoryName] || 0;
  score += Math.min(catAffinity * 4, 20);

  // D) Interest match (0-12)
  const interestMatch = userProfile.interestNames.some(
    i => item.categoryName.toLowerCase().includes(i) || i.includes(item.categoryName.toLowerCase()),
  );
  if (interestMatch) score += 12;

  // E) Recency decay (0-18) — exponential, halves every 20 hrs
  score += 18 * Math.exp(-0.035 * ageHrs);

  // F) Relationship signal (0-10) — from followed/matched users
  if (userProfile.followedAuthors.has(item.authorId)) score += 10;
  else if (item.authorFollowedByUser) score += 6;

  // G) Verified author (0-4)
  if (item.authorVerified) score += 4;

  // H) Already-viewed penalty
  if (item.alreadyViewed) score -= 30;

  // I) Content type diversity boost from behavioral data
  const catWeight = userProfile.activitySignals.viewedCategories[item.categoryName] || 0;
  score += Math.min(catWeight * 0.5, 5);

  return clamp(Math.round(score), 0, 100);
}

// ═══════════════════════════════════════════════════════
// 8. DTM COMPATIBILITY — Marriage Readiness Score
// ═══════════════════════════════════════════════════════
// Algorithm: Weighted multi-factor scoring focused on
// matrimonial compatibility factors:
//   - Religion & values (25%)
//   - Family compatibility (20%)
//   - Education & career (15%)
//   - Location proximity (10%)
//   - Age compatibility (10%)
//   - Lifestyle match (10%)
//   - Partner preference match (10%)

/**
 * Date-to-Marry (DTM) matrimonial compatibility scoring.
 *
 * Weighted multi-factor scoring across 7 dimensions:
 * - Religion & values (25pt) — religion, caste, gotra conflict, manglik
 * - Family compatibility (20pt) — family type, values, mother tongue
 * - Education & career (15pt) — education level proximity, income
 * - Location proximity (10pt) — working city match
 * - Age compatibility (10pt) — with partner preference bounds
 * - Lifestyle match (10pt) — diet, body type, marital status
 * - Partner preference match (10pt) — explicit criteria alignment
 *
 * @param myProfile - The current user's matrimonial profile
 * @param candidate - A candidate's matrimonial profile
 * @returns Marriage compatibility score 0–100
 */
export function scoreDtm(
  myProfile: DtmUser,
  candidate: DtmCandidate,
): number {
  let score = 0;

  // ── Religion & values (0-25) ──
  // Heavy weight because religion is a top deal-breaker in matrimonial matching.
  // Gotra conflict is a NEGATIVE signal: same gotra marriages are traditionally avoided
  // in Hindu culture. Manglik matching matters for astrological compatibility beliefs.
  let religionScore = 0;
  if (myProfile.religion && candidate.religion) {
    if (myProfile.religion.toLowerCase() === candidate.religion.toLowerCase()) religionScore += 15;
    // Check if my partner preference matches
    if (myProfile.partnerReligion && candidate.religion.toLowerCase() === myProfile.partnerReligion.toLowerCase()) religionScore += 5;
  }
  if (myProfile.caste && candidate.caste) {
    if (myProfile.caste.toLowerCase() === candidate.caste.toLowerCase()) religionScore += 3;
    if (myProfile.partnerCaste && candidate.caste.toLowerCase() === myProfile.partnerCaste.toLowerCase()) religionScore += 2;
  }
  // Gotra conflict check — In Hindu tradition, same gotra (paternal lineage)
  // marriages are considered consanguineous and are culturally prohibited.
  // This is the ONLY negative scoring rule in DTM matching.
  if (myProfile.gotra && candidate.gotra && myProfile.gotra.toLowerCase() === candidate.gotra.toLowerCase()) {
    religionScore -= 5;
  }
  // Manglik compatibility
  if (myProfile.manglik && candidate.manglik) {
    if (myProfile.manglik === candidate.manglik) religionScore += 3;
    else if (myProfile.manglik === 'Yes' && candidate.manglik === 'No') religionScore -= 2;
  }
  score += clamp(religionScore, 0, 25);

  // ── Family compatibility (0-20) ──
  let familyScore = 0;
  if (myProfile.familyType && candidate.familyType) {
    if (myProfile.familyType === candidate.familyType) familyScore += 5;
  }
  if (myProfile.familyValues && candidate.familyValues) {
    if (myProfile.familyValues.toLowerCase() === candidate.familyValues.toLowerCase()) familyScore += 8;
  }
  if (myProfile.motherTongue && candidate.motherTongue) {
    if (myProfile.motherTongue.toLowerCase() === candidate.motherTongue.toLowerCase()) familyScore += 7;
  }
  score += Math.min(familyScore, 20);

  // ── Education & career (0-15) ──
  let eduScore = 0;
  const eduLevels: Record<string, number> = {
    'high school': 1, '10th': 1, '12th': 2, 'diploma': 2, 'graduate': 3, 'bachelors': 3,
    'post-graduate': 4, 'masters': 4, 'phd': 5, 'doctorate': 5, 'md': 5, 'mba': 4,
  };
  const myEdu = eduLevels[myProfile.education?.toLowerCase() || ''] || 0;
  const theirEdu = eduLevels[candidate.education?.toLowerCase() || ''] || 0;
  if (myEdu > 0 && theirEdu > 0) {
    if (Math.abs(myEdu - theirEdu) <= 1) eduScore += 10;
    else if (Math.abs(myEdu - theirEdu) <= 2) eduScore += 5;
  }
  // Income as proxy for career stability
  if (candidate.annualIncome && candidate.annualIncome !== '') eduScore += 5;
  score += Math.min(eduScore, 15);

  // ── Location proximity (0-10) ──
  score += cityProximityScore(myProfile.workingCity, candidate.workingCity);

  // ── Age compatibility (0-10) ──
  let ageScore = 0;
  if (myProfile.userAge && candidate.userAge) {
    const ageDiff = Math.abs(myProfile.userAge - candidate.userAge);
    if (ageDiff <= 3) ageScore = 10;
    else if (ageDiff <= 5) ageScore = 7;
    else if (ageDiff <= 8) ageScore = 4;
    else if (ageDiff <= 12) ageScore = 1;
  }
  // Check partner age preferences if available
  if (myProfile.partnerAgeMin && candidate.userAge && candidate.userAge < myProfile.partnerAgeMin) ageScore = Math.max(0, ageScore - 3);
  if (myProfile.partnerAgeMax && candidate.userAge && candidate.userAge > myProfile.partnerAgeMax) ageScore = Math.max(0, ageScore - 3);
  score += ageScore;

  // ── Lifestyle match (0-10) ──
  let lifestyleScore = 0;
  if (myProfile.diet && candidate.diet) {
    if (myProfile.diet === candidate.diet) lifestyleScore += 5;
  }
  if (myProfile.bodyType && candidate.bodyType) {
    if (myProfile.bodyType === candidate.bodyType) lifestyleScore += 2;
  }
  if (myProfile.maritalStatus && candidate.maritalStatus) {
    if (myProfile.maritalStatus === candidate.maritalStatus) lifestyleScore += 3;
  }
  score += Math.min(lifestyleScore, 10);

  // ── Partner preference match (0-10) ──
  let prefScore = 0;
  if (myProfile.partnerReligion && candidate.religion && candidate.religion.toLowerCase() === myProfile.partnerReligion.toLowerCase()) prefScore += 3;
  if (myProfile.partnerCaste && candidate.caste && candidate.caste.toLowerCase() === myProfile.partnerCaste.toLowerCase()) prefScore += 3;
  if (myProfile.partnerAgeMin && myProfile.partnerAgeMax && candidate.userAge) {
    if (candidate.userAge >= myProfile.partnerAgeMin && candidate.userAge <= myProfile.partnerAgeMax) prefScore += 4;
  }
  score += Math.min(prefScore, 10);

  return clamp(score, 0, 100);
}

// ═══════════════════════════════════════════════════════
// 9. SEARCH ALGORITHMS
// ═══════════════════════════════════════════════════════

/**
 * Search by display name — fuzzy matching + token matching + prefix boost.
 *
 * Scoring tiers: exact match (100), prefix (90), contains (70),
 * token overlap (40+15×matches), fuzzy similarity fallback (0.6+ threshold).
 *
 * @param query - The search query string
 * @param displayName - User's display name to match against
 * @param username - Optional username to also match against
 * @returns Relevance score 0–100
 */
export function scoreNameSearch(query: string, displayName: string, username?: string): number {
  const q = query.toLowerCase().trim();
  const dn = (displayName || '').toLowerCase();
  const un = (username || '').toLowerCase();

  let score = 0;

  // Exact match (highest)
  if (dn === q || un === q) return 100;

  // Prefix match (very high)
  if (dn.startsWith(q)) score = Math.max(score, 90);
  if (un.startsWith(q)) score = Math.max(score, 85);

  // Contains match
  if (dn.includes(q)) score = Math.max(score, 70);
  if (un.includes(q)) score = Math.max(score, 65);

  // Token matching: split both query and name into words, check overlap
  const queryTokens = q.split(/\s+/);
  const nameTokens = dn.split(/\s+/);
  let tokenMatches = 0;
  for (const qt of queryTokens) {
    for (const nt of nameTokens) {
      if (nt.startsWith(qt)) tokenMatches++;
      else if (fuzzySimilarity(qt, nt) > 0.7) tokenMatches += 0.5;
    }
  }
  if (tokenMatches > 0) {
    score = Math.max(score, 40 + tokenMatches * 15);
  }

  // Fuzzy match (fallback for typos)
  const nameSim = fuzzySimilarity(q, dn);
  const userSim = fuzzySimilarity(q, un);
  const bestFuzzy = Math.max(nameSim, userSim);
  if (bestFuzzy > 0.6) {
    score = Math.max(score, bestFuzzy * 60);
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Search by city — exact, prefix, contains, and fuzzy matching.
 *
 * @param query - The city search query
 * @param city - User's city to match against
 * @returns Relevance score 0–100 (0 if no city or no match)
 */
export function scoreCitySearch(query: string, city?: string): number {
  if (!city) return 0;
  const q = query.toLowerCase().trim();
  const c = city.toLowerCase().trim();

  if (c === q) return 100;
  if (c.startsWith(q)) return 90;
  if (c.includes(q)) return 75;
  if (q.includes(c)) return 70;

  // Fuzzy fallback
  const sim = fuzzySimilarity(q, c);
  if (sim > 0.7) return Math.round(sim * 80);
  if (sim > 0.5) return Math.round(sim * 50);
  return 0;
}

/**
 * Search by Miamo ID — exact match with prefix and contains fallback.
 * Strips leading '@' from the query before matching.
 *
 * @param query - The ID search query (with or without leading @)
 * @param miamoId - User's Miamo ID to match against
 * @returns Relevance score 0–100 (0 if no ID or no match)
 */
export function scoreIdSearch(query: string, miamoId?: string): number {
  if (!miamoId) return 0;
  const q = query.toLowerCase().trim().replace(/^@/, '');
  const id = miamoId.toLowerCase().trim();

  if (id === q) return 100;
  if (id.startsWith(q)) return 80;
  if (id.includes(q)) return 60;
  return 0;
}

/**
 * Combined multi-strategy search scoring.
 *
 * Routes to the appropriate search function based on `searchType`.
 * When `searchType` is 'all', returns the maximum score across name, city, and ID searches.
 *
 * @param query - The search query string
 * @param searchType - Which search strategy to use ('name' | 'city' | 'id' | 'all')
 * @param displayName - User's display name
 * @param username - Optional username
 * @param miamoId - Optional Miamo ID
 * @param city - Optional city
 * @returns Best relevance score 0–100
 */
export function scoreSearch(
  query: string,
  searchType: 'name' | 'city' | 'id' | 'all',
  displayName: string,
  username?: string,
  miamoId?: string,
  city?: string,
): number {
  if (searchType === 'name') return scoreNameSearch(query, displayName, username);
  if (searchType === 'city') return scoreCitySearch(query, city);
  if (searchType === 'id') return scoreIdSearch(query, miamoId);

  // 'all' — best of all
  return Math.max(
    scoreNameSearch(query, displayName, username),
    scoreCitySearch(query, city),
    scoreIdSearch(query, miamoId),
  );
}

// ═══════════════════════════════════════════════════════
// 10. DEEP COMPATIBILITY — Behavioral + Communication Style Matching
// ═══════════════════════════════════════════════════════

/** Communication style metrics extracted from messaging patterns */
export interface CommStyleVector {
  avgWordCount: number;          // average words per message
  emojiPerMessage: number;       // avg emoji count per message
  questionRatio: number;         // fraction of messages containing questions (0-1)
  exclamationRatio: number;      // fraction with ! (0-1)
  avgResponseTimeMins: number;   // avg reply speed in minutes
  initiationRate: number;        // fraction of convos they start (0-1)
  flirtIndicator: number;       // 0-1 how flirty their messages are
  humorIndicator: number;       // 0-1 presence of humor markers
  lengthVariance: number;       // how much length varies (0=uniform, 1=high variance)
  lowercaseRatio: number;       // fraction of messages starting lowercase (casualness indicator)
  fillerWords: string[];        // common fillers: "lol", "haha", "ngl", "honestly"
}

/** Personality archetype derived from behavioral patterns */
export type PersonalityArchetype =
  | 'Explorer'       // high travel content, many diverse interests, fast swiping
  | 'Homebody'       // cozy content, few interests but deep engagement
  | 'Socialite'      // many chats, high initiation, fast responses
  | 'Deep-Thinker'   // long messages, question-heavy, serious intent
  | 'Creative'       // content creation, art/music engagement
  | 'Ambitious'      // career-focused prompts, serious mode, structured comms
  | 'Caretaker'      // empathetic responses, relationship-focused
  | 'Adventurer';    // spontaneous, high activity variance, outdoors interests

/** Full deep compatibility result */
export interface DeepCompatibilityResult {
  overallScore: number; // 0-100
  breakdown: {
    interestOverlap: number;      // 0-25
    behavioralSync: number;       // 0-20
    communicationStyle: number;   // 0-20
    intentAlignment: number;      // 0-15
    lifestyleMatch: number;       // 0-10
    temporalHarmony: number;      // 0-10
  };
  myPersonality: PersonalityArchetype;
  theirPersonality: PersonalityArchetype;
  compatibilityInsight: string;
}

/** Inputs for deep compatibility computation */
export interface DeepCompatibilityInput {
  myProfile: UserProfile | null;
  myInterests: string[];
  myCommStyle: CommStyleVector | null;
  myCluster: { type: string; activeHours: number[]; preferredContentTypes: string[] } | null;
  myTemporal: { hourlyDistribution: number[] } | null;
  candidateProfile: CandidateProfile | null;
  candidateInterests: string[];
  candidateCommStyle: CommStyleVector | null;
  candidateCluster: { type: string; activeHours: number[]; preferredContentTypes: string[] } | null;
  candidateTemporal: { hourlyDistribution: number[] } | null;
  behavior: BehaviorVector;
  myVibe?: VibeData | null;
  candidateVibe?: VibeData | null;
}

/**
 * Derive personality archetype from behavioral signals.
 */
export function computePersonalityArchetype(
  cluster: { type: string; preferredContentTypes: string[] } | null,
  commStyle: CommStyleVector | null,
  interests: string[],
  profile: CandidateProfile | UserProfile | null,
): PersonalityArchetype {
  // Score each archetype based on available signals
  const scores: Record<PersonalityArchetype, number> = {
    Explorer: 0, Homebody: 0, Socialite: 0, 'Deep-Thinker': 0,
    Creative: 0, Ambitious: 0, Caretaker: 0, Adventurer: 0,
  };

  const lowerInterests = interests.map(i => i.toLowerCase());

  // Interest-based signals
  const travelWords = ['travel', 'adventure', 'hiking', 'explore', 'wanderlust', 'backpacking'];
  const homeWords = ['cooking', 'reading', 'gaming', 'netflix', 'baking', 'gardening', 'cozy'];
  const socialWords = ['parties', 'networking', 'socializing', 'nightlife', 'clubbing', 'events'];
  const creativeWords = ['art', 'music', 'photography', 'writing', 'design', 'painting', 'singing'];
  const ambitiousWords = ['startup', 'finance', 'entrepreneurship', 'investing', 'career', 'leadership'];
  const caretakerWords = ['volunteering', 'animals', 'family', 'mental health', 'teaching', 'nurturing'];
  const adventureWords = ['skydiving', 'rock climbing', 'surfing', 'camping', 'motorcycling', 'scuba'];

  for (const i of lowerInterests) {
    if (travelWords.some(w => i.includes(w))) scores.Explorer += 3;
    if (homeWords.some(w => i.includes(w))) scores.Homebody += 3;
    if (socialWords.some(w => i.includes(w))) scores.Socialite += 3;
    if (creativeWords.some(w => i.includes(w))) scores.Creative += 3;
    if (ambitiousWords.some(w => i.includes(w))) scores.Ambitious += 3;
    if (caretakerWords.some(w => i.includes(w))) scores.Caretaker += 3;
    if (adventureWords.some(w => i.includes(w))) scores.Adventurer += 3;
  }

  // Communication style signals
  if (commStyle) {
    if (commStyle.avgWordCount > 40) scores['Deep-Thinker'] += 4;
    if (commStyle.avgWordCount < 10) scores.Socialite += 2; // quick short msgs = chatty
    if (commStyle.questionRatio > 0.4) scores['Deep-Thinker'] += 3;
    if (commStyle.flirtIndicator > 0.4) scores.Socialite += 2;
    if (commStyle.humorIndicator > 0.4) scores.Adventurer += 2;
    if (commStyle.initiationRate > 0.6) scores.Socialite += 3;
    if (commStyle.initiationRate < 0.2) scores.Homebody += 2;
    if (commStyle.emojiPerMessage > 2) scores.Creative += 2;
    if (commStyle.lowercaseRatio > 0.7) scores.Adventurer += 1;
  }

  // Cluster signals
  if (cluster) {
    if (cluster.type === 'communicator') scores.Socialite += 4;
    if (cluster.type === 'creator') scores.Creative += 4;
    if (cluster.type === 'browser') scores.Explorer += 2;
    if (cluster.type === 'lurker') scores.Homebody += 3;
    if (cluster.type === 'engager') scores.Caretaker += 2;
    if (cluster.type === 'power-user') scores.Ambitious += 3;
  }

  // Profile signals
  if (profile) {
    if (profile.seriousMode) scores.Ambitious += 2;
    if (profile.datingIntent === 'long-term') { scores['Deep-Thinker'] += 2; scores.Caretaker += 2; }
    if (profile.datingIntent === 'casual') scores.Adventurer += 2;
    if (profile.exercise === 'daily') scores.Adventurer += 2;
  }

  // Find dominant archetype
  let best: PersonalityArchetype = 'Explorer';
  let bestScore = 0;
  for (const [arch, s] of Object.entries(scores)) {
    if (s > bestScore) { bestScore = s; best = arch as PersonalityArchetype; }
  }
  return best;
}

/** Compatibility map — which archetypes pair well */
const ARCHETYPE_COMPAT: Record<PersonalityArchetype, PersonalityArchetype[]> = {
  Explorer: ['Adventurer', 'Socialite', 'Creative'],
  Homebody: ['Caretaker', 'Deep-Thinker', 'Creative'],
  Socialite: ['Adventurer', 'Explorer', 'Ambitious'],
  'Deep-Thinker': ['Caretaker', 'Homebody', 'Creative'],
  Creative: ['Deep-Thinker', 'Explorer', 'Adventurer'],
  Ambitious: ['Socialite', 'Deep-Thinker', 'Caretaker'],
  Caretaker: ['Deep-Thinker', 'Homebody', 'Ambitious'],
  Adventurer: ['Explorer', 'Socialite', 'Creative'],
};

/**
 * Deep Compatibility Algorithm — master scoring function.
 *
 * Combines 6 sub-models: interest overlap (IDF-weighted), behavioral sync,
 * communication style similarity, intent alignment, lifestyle match, and temporal harmony.
 * Also produces personality archetypes and human-readable insight.
 */
export function computeDeepCompatibility(input: DeepCompatibilityInput): DeepCompatibilityResult {
  const { myProfile, myInterests, myCommStyle, myCluster, myTemporal,
          candidateProfile, candidateInterests, candidateCommStyle, candidateCluster,
          candidateTemporal, behavior, myVibe, candidateVibe } = input;

  if (!candidateProfile) {
    return { overallScore: 0, breakdown: { interestOverlap: 0, behavioralSync: 0, communicationStyle: 0, intentAlignment: 0, lifestyleMatch: 0, temporalHarmony: 0 },
      myPersonality: 'Explorer', theirPersonality: 'Explorer', compatibilityInsight: '' };
  }

  // ── 1) Interest Overlap with IDF weighting (0-25) ──
  // Rare shared interests score higher than common ones
  const allInterests = [...myInterests, ...candidateInterests];
  const idfMap = new Map<string, number>();
  const totalDocs = 2;
  for (const interest of new Set(allInterests)) {
    const docFreq = (myInterests.includes(interest) ? 1 : 0) + (candidateInterests.includes(interest) ? 1 : 0);
    idfMap.set(interest, Math.log(totalDocs / docFreq + 1));
  }
  let interestScore = 0;
  const sharedInterests = myInterests.filter(i => candidateInterests.includes(i));
  for (const interest of sharedInterests) {
    interestScore += (idfMap.get(interest) || 1) * 4; // rare = higher IDF = more points
  }
  interestScore = Math.min(Math.round(interestScore), 25);

  // ── 2) Behavioral Sync (0-20) ──
  let behavioralSync = 0;
  if (myCluster && candidateCluster) {
    // Same cluster type
    if (myCluster.type === candidateCluster.type) behavioralSync += 8;
    // Active hours overlap
    const myHoursSet = new Set(myCluster.activeHours);
    const sharedHours = candidateCluster.activeHours.filter(h => myHoursSet.has(h));
    behavioralSync += Math.min(Math.round(sharedHours.length * 2.5), 7);
    // Content type overlap
    const myTypes = new Set(myCluster.preferredContentTypes);
    const sharedTypes = candidateCluster.preferredContentTypes.filter(t => myTypes.has(t));
    behavioralSync += Math.min(sharedTypes.length * 2, 5);
  }
  behavioralSync = Math.min(behavioralSync, 20);

  // ── 3) Communication Style Similarity (0-20) ──
  let commScore = 0;
  if (myCommStyle && candidateCommStyle) {
    // Word count similarity (within 50% = good)
    const wcRatio = Math.min(myCommStyle.avgWordCount, candidateCommStyle.avgWordCount) /
                    Math.max(myCommStyle.avgWordCount, candidateCommStyle.avgWordCount, 1);
    commScore += Math.round(wcRatio * 6);

    // Emoji usage similarity
    const emojiDiff = Math.abs(myCommStyle.emojiPerMessage - candidateCommStyle.emojiPerMessage);
    if (emojiDiff < 0.5) commScore += 4;
    else if (emojiDiff < 1.5) commScore += 2;

    // Question asking style
    const qDiff = Math.abs(myCommStyle.questionRatio - candidateCommStyle.questionRatio);
    if (qDiff < 0.15) commScore += 4;
    else if (qDiff < 0.3) commScore += 2;

    // Response speed similarity (within 2x = good)
    const rMin = Math.min(myCommStyle.avgResponseTimeMins, candidateCommStyle.avgResponseTimeMins);
    const rMax = Math.max(myCommStyle.avgResponseTimeMins, candidateCommStyle.avgResponseTimeMins, 1);
    if (rMax / rMin < 2) commScore += 4;
    else if (rMax / rMin < 4) commScore += 2;

    // Casualness alignment (both casual or both formal)
    const casualDiff = Math.abs(myCommStyle.lowercaseRatio - candidateCommStyle.lowercaseRatio);
    if (casualDiff < 0.2) commScore += 2;
  }
  commScore = Math.min(commScore, 20);

  // ── 4) Intent Alignment (0-15) ──
  let intentScore = 0;
  if (myProfile && candidateProfile) {
    if (myProfile.datingIntent === candidateProfile.datingIntent) intentScore += 7;
    if (myProfile.seriousMode === candidateProfile.seriousMode) intentScore += 3;
    if (myProfile.lookingFor === candidateProfile.lookingFor) intentScore += 3;
  }
  if (myVibe && candidateVibe) {
    if (myVibe.intent === candidateVibe.intent) intentScore += 2;
  }
  intentScore = Math.min(intentScore, 15);

  // ── 5) Lifestyle Match (0-10) ──
  let lifestyleScore = 0;
  if (myProfile && candidateProfile) {
    if (myProfile.smoking === candidateProfile.smoking) lifestyleScore += 2;
    if (myProfile.drinking === candidateProfile.drinking) lifestyleScore += 2;
    if (myProfile.exercise === candidateProfile.exercise) lifestyleScore += 2;
    if (myProfile.religion === candidateProfile.religion) lifestyleScore += 2;
    if (myProfile.pets === candidateProfile.pets) lifestyleScore += 1;
    if (myProfile.children === candidateProfile.children) lifestyleScore += 1;
  }
  lifestyleScore = Math.min(lifestyleScore, 10);

  // ── 6) Temporal Harmony (0-10) ──
  let temporalScore = 0;
  if (myTemporal && candidateTemporal) {
    // Cosine similarity on hourly distributions
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < 24; i++) {
      const a = myTemporal.hourlyDistribution[i] || 0;
      const b = candidateTemporal.hourlyDistribution[i] || 0;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    }
    const cosSim = (magA > 0 && magB > 0) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
    temporalScore = Math.round(cosSim * 10);
  }
  temporalScore = Math.min(temporalScore, 10);

  // ── Personality archetypes ──
  const myPersonality = computePersonalityArchetype(myCluster, myCommStyle, myInterests, myProfile);
  const theirPersonality = computePersonalityArchetype(candidateCluster, candidateCommStyle, candidateInterests, candidateProfile);

  // ── Archetype compatibility bonus ──
  const compatArchetypes = ARCHETYPE_COMPAT[myPersonality] || [];
  let archetypeBonus = 0;
  if (compatArchetypes.includes(theirPersonality)) archetypeBonus = 5;
  else if (myPersonality === theirPersonality) archetypeBonus = 3; // same type = decent too

  // ── Total score ──
  const rawScore = interestScore + behavioralSync + commScore + intentScore + lifestyleScore + temporalScore + archetypeBonus;
  const overallScore = clamp(rawScore, 0, 100);

  // ── Generate human-readable insight ──
  const compatibilityInsight = generateCompatInsight(
    myPersonality, theirPersonality, sharedInterests, commScore, intentScore, lifestyleScore, candidateProfile
  );

  return {
    overallScore,
    breakdown: { interestOverlap: interestScore, behavioralSync, communicationStyle: commScore, intentAlignment: intentScore, lifestyleMatch: lifestyleScore, temporalHarmony: temporalScore },
    myPersonality,
    theirPersonality,
    compatibilityInsight,
  };
}

/** Generate a human-readable compatibility insight */
function generateCompatInsight(
  myArch: PersonalityArchetype, theirArch: PersonalityArchetype,
  shared: string[], commScore: number, intentScore: number, lifestyleScore: number,
  profile: CandidateProfile | null,
): string {
  const pieces: string[] = [];

  if (shared.length >= 3) pieces.push(`You share ${shared.length} interests including ${shared.slice(0, 2).join(' and ')}`);
  else if (shared.length > 0) pieces.push(`You both enjoy ${shared[0]}`);

  if (commScore >= 14) pieces.push('your communication styles are very aligned');
  else if (commScore >= 8) pieces.push('you communicate in compatible ways');

  if (intentScore >= 10) pieces.push('you want the same things from dating');
  if (lifestyleScore >= 7) pieces.push('your lifestyles are well-matched');

  const archetypeDesc: Record<PersonalityArchetype, string> = {
    Explorer: 'curious and worldly', Homebody: 'cozy and grounded',
    Socialite: 'outgoing and energetic', 'Deep-Thinker': 'thoughtful and introspective',
    Creative: 'artistic and expressive', Ambitious: 'driven and focused',
    Caretaker: 'nurturing and empathetic', Adventurer: 'spontaneous and bold',
  };

  if (myArch !== theirArch) {
    pieces.push(`they're ${archetypeDesc[theirArch]} which complements your ${archetypeDesc[myArch]} nature`);
  }

  if (pieces.length === 0) return 'You might discover shared perspectives through conversation';
  return pieces.slice(0, 3).join(', ') + '.';
}

// ═══════════════════════════════════════════════════════
// 11. SMART MOVE SUGGESTIONS — Style-Mirrored Openers
// ═══════════════════════════════════════════════════════

/** Input for generating personalized move suggestions */
export interface SmartMoveInput {
  myLastMessages: string[];              // user's last 10 sent messages (raw text)
  myProfile: { city?: string; profession?: string; bio?: string } | null;
  myInterests: string[];
  targetProfile: { city?: string; profession?: string; bio?: string; age?: number } | null;
  targetInterests: string[];
  targetPrompts: { question: string; answer: string }[];
  commonInterests: string[];
  targetRecentTopics: string[];          // topics extracted from their recent activity
}

/** A generated move suggestion */
export interface MoveSuggestion {
  text: string;
  reasoning: string;
  matchBackProbability: number;
}

/**
 * Generate 5 personalized Miamo Move suggestions that mirror the user's writing style
 * and reference specific details about the target.
 */
export function generateSmartMoves(input: SmartMoveInput): MoveSuggestion[] {
  const { myLastMessages, myProfile, myInterests, targetProfile, targetInterests,
          targetPrompts, commonInterests, targetRecentTopics } = input;

  // ── Extract user's messaging style ──
  const style = extractWritingStyle(myLastMessages);
  const suggestions: MoveSuggestion[] = [];

  // ── Strategy 1: Prompt-based (highest success rate) ──
  if (targetPrompts.length > 0) {
    const prompt = targetPrompts[0];
    const answer = prompt.answer.length > 60 ? prompt.answer.substring(0, 57) + '...' : prompt.answer;
    let text = '';
    if (style.casual) {
      text = `${style.usesLol ? 'ok but ' : ''}${answer.toLowerCase()} is such a good answer${style.usesExcl ? '!' : ''} ${style.commonOpener}what made you think of that${style.usesQuestion ? '?' : ''}`;
    } else {
      text = `Your answer "${answer}" really resonated with me. I'd love to hear the story behind it.`;
    }
    text = applyStyleCaps(text, style);
    suggestions.push({ text, reasoning: 'Prompt responses show personality — referencing one signals genuine interest', matchBackProbability: 0.85 });
  }

  // ── Strategy 2: Shared interest deep-dive ──
  if (commonInterests.length > 0) {
    const interest = commonInterests[0];
    let text = '';
    if (style.casual) {
      text = `${style.commonOpener}so you're into ${interest} too${style.usesQuestion ? '?' : ''} ${style.usesLol ? 'lol' : ''} what got you started${style.usesQuestion ? '?' : ''}`.trim();
    } else {
      text = `I'm curious about your ${interest} journey — what's the most unexpected thing you've discovered through it?`;
    }
    text = applyStyleCaps(text, style);
    suggestions.push({ text, reasoning: 'Shared interests create instant common ground without feeling generic', matchBackProbability: 0.82 });
  }

  // ── Strategy 3: Opinion/statement (not a question) ──
  if (targetRecentTopics.length > 0) {
    const topic = targetRecentTopics[0];
    let text = '';
    if (style.casual) {
      text = `${style.usesLol ? 'ngl ' : ''}I have some strong opinions about ${topic}${style.usesExcl ? '!' : ''} ${style.commonOpener}bet we'd either totally agree or have the most fun debate`;
    } else {
      text = `I have a feeling we'd have really interesting conversations about ${topic}. I have some takes that might surprise you.`;
    }
    text = applyStyleCaps(text, style);
    suggestions.push({ text, reasoning: 'Statements signal confidence and create intrigue — invites response without demanding one', matchBackProbability: 0.78 });
  } else if (targetProfile?.profession) {
    let text = '';
    if (style.casual) {
      text = `${style.commonOpener}${targetProfile.profession} sounds like it comes with some wild stories${style.usesExcl ? '!' : ''} what's the most unexpected part`;
    } else {
      text = `There's something about ${targetProfile.profession} that I find genuinely fascinating. I bet you have stories.`;
    }
    text = applyStyleCaps(text, style);
    suggestions.push({ text, reasoning: 'Career reference shows you paid attention to their profile without being generic', matchBackProbability: 0.75 });
  }

  // ── Strategy 4: Playful/humorous ──
  {
    const hooks: string[] = [];
    if (commonInterests.includes('coffee') || commonInterests.includes('Coffee')) hooks.push('coffee order');
    if (commonInterests.includes('travel') || commonInterests.includes('Travel')) hooks.push('most chaotic travel story');
    if (commonInterests.includes('music') || commonInterests.includes('Music')) hooks.push('controversial music take');
    if (commonInterests.includes('food') || commonInterests.includes('Food')) hooks.push(`food hill you'd die on`);
    const hook = hooks[0] || 'hot take on pineapple pizza';

    let text = '';
    if (style.casual) {
      text = `${style.commonOpener}important question${style.usesExcl ? '!' : ''} what's your ${hook}${style.usesQuestion ? '?' : ''} ${style.usesLol ? 'mine might be controversial lol' : 'mine is probably concerning'}`;
    } else {
      text = `Alright, critical compatibility question: what's your ${hook}? Mine is... let's just say divisive.`;
    }
    text = applyStyleCaps(text, style);
    suggestions.push({ text, reasoning: 'Humor + low-stakes question reduces pressure and shows personality', matchBackProbability: 0.80 });
  }

  // ── Strategy 5: Location/experience based ──
  if (targetProfile?.city && myProfile?.city) {
    let text = '';
    if (targetProfile.city.toLowerCase() === myProfile.city?.toLowerCase()) {
      if (style.casual) {
        text = `${style.commonOpener}fellow ${targetProfile.city} person${style.usesExcl ? '!' : ''} what's a spot you'd take someone to that's not the obvious tourist places`;
      } else {
        text = `As a fellow ${targetProfile.city} person, I'm always looking for hidden spots. What's somewhere that actually surprised you?`;
      }
    } else {
      if (style.casual) {
        text = `${style.commonOpener}${targetProfile.city}${style.usesExcl ? '!' : ''} I've always been curious about that city. sell me on it in one sentence`;
      } else {
        text = `I've been meaning to explore ${targetProfile.city}. What's the one thing about it that you think people completely overlook?`;
      }
    }
    text = applyStyleCaps(text, style);
    suggestions.push({ text, reasoning: 'Location-based messages feel personal while opening door to meet-up conversation', matchBackProbability: 0.73 });
  } else if (targetPrompts.length > 1) {
    const prompt = targetPrompts[1];
    let text = '';
    if (style.casual) {
      text = `${style.commonOpener}${prompt.answer.substring(0, 40)}${style.usesExcl ? '!' : ''} I relate to this way more than I expected`;
    } else {
      text = `"${prompt.answer.substring(0, 45)}" — this hit different. I think we might be on the same wavelength.`;
    }
    text = applyStyleCaps(text, style);
    suggestions.push({ text, reasoning: 'Second prompt reference shows thorough profile reading', matchBackProbability: 0.76 });
  }

  // Ensure we always have 5 suggestions by filling fallbacks
  while (suggestions.length < 5) {
    const idx = suggestions.length;
    const fallbacks = [
      { text: style.casual ? `${style.commonOpener}your vibe is honestly refreshing from the usual profiles on here` : `Something about your profile genuinely stood out to me — it's refreshingly real.`, reasoning: 'Authentic compliment about overall vibe', matchBackProbability: 0.65 },
      { text: style.casual ? `${style.usesLol ? 'ok ' : ''}this might be random but you seem like someone who'd have really good music taste` : `I have a theory that you have excellent music taste. Am I right?`, reasoning: 'Playful assumption invites correction or validation', matchBackProbability: 0.68 },
    ];
    const fb = fallbacks[idx - suggestions.length] || fallbacks[0];
    suggestions.push({ text: applyStyleCaps(fb.text, style), reasoning: fb.reasoning, matchBackProbability: fb.matchBackProbability });
  }

  return suggestions.slice(0, 5).sort((a, b) => b.matchBackProbability - a.matchBackProbability);
}

/** Extract writing style metrics from user's recent messages */
function extractWritingStyle(messages: string[]): {
  casual: boolean; usesLol: boolean; usesExcl: boolean; usesQuestion: boolean;
  commonOpener: string; avgLen: number;
} {
  if (!messages.length) return { casual: true, usesLol: false, usesExcl: true, usesQuestion: true, commonOpener: '', avgLen: 20 };

  const totalLen = messages.reduce((s, m) => s + m.length, 0);
  const avgLen = totalLen / messages.length;
  const lolCount = messages.filter(m => /\b(lol|lmao|haha|hehe|😂|💀)\b/i.test(m)).length;
  const exclCount = messages.filter(m => m.includes('!')).length;
  const qCount = messages.filter(m => m.includes('?')).length;
  const lowercaseStarts = messages.filter(m => m[0] && m[0] === m[0].toLowerCase() && /[a-z]/.test(m[0])).length;

  const casual = avgLen < 80 || lowercaseStarts > messages.length * 0.5;
  const usesLol = lolCount > messages.length * 0.3;
  const usesExcl = exclCount > messages.length * 0.4;
  const usesQuestion = qCount > messages.length * 0.3;

  // Find common openers
  const openers = messages.map(m => m.split(/[,.!?]/)[0]?.trim().toLowerCase() || '');
  const commonWords = ['hey', 'so', 'honestly', 'ngl', 'ok but', 'wait', 'omg', 'yo', 'bruh'];
  let commonOpener = '';
  for (const word of commonWords) {
    if (openers.filter(o => o.startsWith(word)).length >= 2) { commonOpener = word + ' '; break; }
  }

  return { casual, usesLol, usesExcl, usesQuestion, commonOpener, avgLen };
}

/** Apply capitalization style to generated text */
function applyStyleCaps(text: string, style: { casual: boolean }): string {
  if (style.casual) {
    // Casual → lowercase first char unless it's a name/place
    return text.charAt(0).toLowerCase() + text.slice(1);
  }
  // Formal → ensure first char uppercase
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ═══════════════════════════════════════════════════════
// 12. FILTER RELEVANCE BONUS — Post-filter ranking enhancement
// ═══════════════════════════════════════════════════════

/**
 * After SQL filtering, this function adds a relevance bonus based on
 * how well the candidate exceeds the filter minimum criteria.
 *
 * @param candidate - The candidate profile
 * @param behavior - User's behavioral vector
 * @param filterParams - Active filter parameters
 * @returns Bonus score 0-15 to add on top of compatibility score
 */
export function computeFilterRelevanceBonus(
  candidate: CandidateProfile,
  behavior: BehaviorVector,
  filterParams: { city?: string; intent?: string; ageMin?: number; ageMax?: number; serious?: boolean },
): number {
  let bonus = 0;

  // Age preference from behavior vs filter range
  if (behavior.preferredAge && candidate.age) {
    const center = (behavior.preferredAge.min + behavior.preferredAge.max) / 2;
    const dist = Math.abs(candidate.age - center);
    if (dist <= 2) bonus += 5;
    else if (dist <= 4) bonus += 3;
  }

  // City is user's top preferred city (from behavioral data)
  if (candidate.city && behavior.preferredCities.includes(candidate.city.toLowerCase())) {
    bonus += 3;
  }

  // Intent matches user's behavioral preference
  if (candidate.datingIntent && behavior.preferredIntents.includes(candidate.datingIntent)) {
    bonus += 3;
  }

  // Profile quality (high-quality within filtered set ranks higher)
  if (candidate.profileScore >= 80) bonus += 2;
  if (candidate.online) bonus += 2;

  return Math.min(bonus, 15);
}

// ═══════════════════════════════════════════════════════
// 13. ENHANCED DTM SCORING — Behavioral + Static Hybrid
// ═══════════════════════════════════════════════════════

/**
 * Enhanced DTM score that combines static profile matching with behavioral signals.
 * @param staticScore - Score from scoreDtm() (0-100)
 * @param dtmBehavior - DTM-specific behavioral signals
 * @returns Combined score 0-100
 */
export function scoreDtmEnhanced(
  staticScore: number,
  dtmBehavior: {
    profileCompleteness: number;          // 0-1 how complete their DTM profile is
    responseRateToRequests: number;       // 0-1 how often they respond to access requests
    avgResponseTimeHrs: number;           // avg time to respond to requests
    browseOverlap: number;               // 0-1 similarity in browse patterns
    activeDaysLast14: number;            // days active on DTM in last 2 weeks
  },
): number {
  // Static score dominates (70%) but behavioral adds ranking intelligence
  let behavioral = 0;

  // Profile completeness (users who filled 80%+ = serious)
  if (dtmBehavior.profileCompleteness >= 0.8) behavioral += 10;
  else if (dtmBehavior.profileCompleteness >= 0.5) behavioral += 5;

  // Response rate (responsive users = more likely to engage)
  behavioral += Math.round(dtmBehavior.responseRateToRequests * 8);

  // Fast responders get bonus
  if (dtmBehavior.avgResponseTimeHrs < 24) behavioral += 5;
  else if (dtmBehavior.avgResponseTimeHrs < 72) behavioral += 2;

  // Browse pattern similarity (collaborative signal)
  behavioral += Math.round(dtmBehavior.browseOverlap * 5);

  // Recency/activity (active users first)
  if (dtmBehavior.activeDaysLast14 >= 7) behavioral += 2;

  behavioral = Math.min(behavioral, 30);

  // Weighted combination
  return clamp(Math.round(staticScore * 0.7 + behavioral), 0, 100);
}

/**
 * Extract communication style vector from message metrics.
 * Called from messaging service to provide style data without exposing content.
 */
export function computeCommStyleVector(metrics: {
  messages: Array<{ wordCount: number; hasEmoji: boolean; emojiCount: number; hasQuestion: boolean; hasExclamation: boolean; startsLowercase: boolean; responseTimeMs: number | null; isInitiation: boolean; hasFlirtWords: boolean; hasHumorWords: boolean }>;
}): CommStyleVector {
  const msgs = metrics.messages;
  if (msgs.length === 0) {
    return { avgWordCount: 15, emojiPerMessage: 0.5, questionRatio: 0.3, exclamationRatio: 0.3, avgResponseTimeMins: 30, initiationRate: 0.3, flirtIndicator: 0, humorIndicator: 0, lengthVariance: 0.3, lowercaseRatio: 0.3, fillerWords: [] };
  }

  const avgWordCount = msgs.reduce((s, m) => s + m.wordCount, 0) / msgs.length;
  const emojiPerMessage = msgs.reduce((s, m) => s + m.emojiCount, 0) / msgs.length;
  const questionRatio = msgs.filter(m => m.hasQuestion).length / msgs.length;
  const exclamationRatio = msgs.filter(m => m.hasExclamation).length / msgs.length;
  const responseTimes = msgs.filter(m => m.responseTimeMs !== null).map(m => m.responseTimeMs!);
  const avgResponseTimeMins = responseTimes.length > 0 ? (responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length) / 60000 : 30;
  const initiationRate = msgs.filter(m => m.isInitiation).length / msgs.length;
  const flirtIndicator = msgs.filter(m => m.hasFlirtWords).length / msgs.length;
  const humorIndicator = msgs.filter(m => m.hasHumorWords).length / msgs.length;
  const lengths = msgs.map(m => m.wordCount);
  const meanLen = avgWordCount;
  const variance = lengths.reduce((s, l) => s + Math.pow(l - meanLen, 2), 0) / lengths.length;
  const lengthVariance = Math.min(Math.sqrt(variance) / meanLen, 1);
  const lowercaseRatio = msgs.filter(m => m.startsLowercase).length / msgs.length;

  return { avgWordCount, emojiPerMessage, questionRatio, exclamationRatio, avgResponseTimeMins, initiationRate, flirtIndicator, humorIndicator, lengthVariance, lowercaseRatio, fillerWords: [] };
}
