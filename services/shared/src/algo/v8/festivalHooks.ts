/**
 * v8 festival hooks — pure module, no I/O.
 *
 * Given a date, return (a) the festivals active that day, (b) hook phrases
 * the Move composer can pull from, and (c) a bounded score boost for
 * candidates whose recent posts reference active festival phrases.
 *
 * Use case: India-first context for Discover / Creativity. A candidate who
 * posted "Diwali plans?" on Diwali eve gets a small ranking nudge so the
 * recommender prefers culturally-resonant openers during the few-day window
 * when the festival is salient.
 *
 * Pure: no Date.now(). Caller passes `dateMs`. Calendar is a frozen literal.
 *
 * Spec: DESIGN_SECTION_D §D.7 (culture-aware text) and tier-A India features.
 */

export interface FestivalEvent {
  /** Stable key — used for telemetry, hook-library lookups, AB cohorts. */
  key: string;
  /** Display name, English. */
  name: string;
  /** Region the festival is salient for. 'global' means everyone. */
  region: 'india' | 'global' | 'tamil' | 'bengali' | 'assamese' | 'kerala';
  /** UTC date of festival day-1 in YYYY-MM-DD format. */
  startDateIso: string;
  /** UTC date of the last festival day (inclusive). */
  endDateIso: string;
  /** Phrases the Move composer / boost detector match against (lower-case). */
  hookPhrases: string[];
}

/**
 * 2026 festival calendar. Dates checked against the Hindu/Tamil/Bengali
 * calendar published Jan 2026. Multi-day festivals (Diwali, Onam, Pongal,
 * Bihu) span their full duration so a post on day 3 still scores.
 *
 * NOT internationalised by purpose — the prompts the composer surfaces are
 * intentionally short English fragments designed to be re-typed by the
 * user in their own language. The classifier compares against post text
 * lower-cased; English transliterations dominate the v6 chat corpus.
 */
export const FESTIVAL_CALENDAR_2026: readonly FestivalEvent[] = Object.freeze([
  {
    key: 'pongal_2026',
    name: 'Pongal',
    region: 'tamil',
    startDateIso: '2026-01-14',
    endDateIso: '2026-01-17',
    hookPhrases: ['pongal', 'pongal vibes', 'pongal plans', 'thai pongal'],
  },
  {
    key: 'bihu_2026',
    name: 'Magh Bihu',
    region: 'assamese',
    startDateIso: '2026-01-14',
    endDateIso: '2026-01-15',
    hookPhrases: ['bihu', 'bihu plans', 'magh bihu'],
  },
  {
    key: 'eid_alfitr_2026',
    name: 'Eid al-Fitr',
    region: 'global',
    startDateIso: '2026-03-20',
    endDateIso: '2026-03-22',
    hookPhrases: ['eid', 'eid mubarak', 'eid plans'],
  },
  {
    key: 'holi_2026',
    name: 'Holi',
    region: 'india',
    startDateIso: '2026-03-03',
    endDateIso: '2026-03-04',
    hookPhrases: ['holi', 'holi vibes', 'holi plans', 'rang barse'],
  },
  {
    key: 'ipl_opener_2026',
    name: 'IPL Season Opener',
    region: 'india',
    startDateIso: '2026-03-21',
    endDateIso: '2026-03-21',
    hookPhrases: ['ipl', 'ipl tonight', 'cricket tonight', 'csk', 'rcb', 'mi'],
  },
  {
    key: 'bakr_eid_2026',
    name: 'Bakr Eid',
    region: 'global',
    startDateIso: '2026-05-27',
    endDateIso: '2026-05-28',
    hookPhrases: ['bakr eid', 'eid ul adha', 'bakra eid'],
  },
  {
    key: 'onam_2026',
    name: 'Onam',
    region: 'kerala',
    startDateIso: '2026-08-23',
    endDateIso: '2026-09-02',
    hookPhrases: ['onam', 'onam sadhya', 'pookkalam', 'thiruvonam'],
  },
  {
    key: 'janmashtami_2026',
    name: 'Janmashtami',
    region: 'india',
    startDateIso: '2026-09-04',
    endDateIso: '2026-09-04',
    hookPhrases: ['janmashtami', 'krishna janmashtami', 'dahi handi'],
  },
  {
    key: 'ganesh_chaturthi_2026',
    name: 'Ganesh Chaturthi',
    region: 'india',
    startDateIso: '2026-09-14',
    endDateIso: '2026-09-24',
    hookPhrases: ['ganesh chaturthi', 'ganpati', 'ganpati bappa', 'visarjan'],
  },
  {
    key: 'karva_chauth_2026',
    name: 'Karva Chauth',
    region: 'india',
    startDateIso: '2026-10-30',
    endDateIso: '2026-10-30',
    hookPhrases: ['karva chauth', 'karwa chauth'],
  },
  {
    key: 'diwali_2026',
    name: 'Diwali',
    region: 'india',
    startDateIso: '2026-11-08',
    endDateIso: '2026-11-10',
    hookPhrases: ['diwali', 'diwali plans', 'lakshmi puja', 'deepavali', 'rangoli'],
  },
  {
    key: 'christmas_2026',
    name: 'Christmas',
    region: 'global',
    startDateIso: '2026-12-25',
    endDateIso: '2026-12-25',
    hookPhrases: ['christmas', 'merry christmas', 'xmas', 'christmas plans'],
  },
  {
    key: 'new_year_2026',
    name: 'New Year',
    region: 'global',
    startDateIso: '2026-12-31',
    endDateIso: '2027-01-01',
    hookPhrases: ['new year', 'nye', 'new year plans', 'nye plans'],
  },
]);

export const FESTIVAL_BOOST_MAX = 0.10;
// because: any boost large enough to flip ranking deserves audit; 0.10
// caps the festival lever so it can nudge but not dominate the v8
// composite score (typical inter-candidate score gap ≈ 0.05–0.15).

export const FESTIVAL_PER_HIT_BOOST = 0.03;
// because: 0.03 × 4 hits saturates at FESTIVAL_BOOST_MAX, matching the
// "a candidate with 3–4 festival posts in the trailing 7 days is clearly
// festival-engaged" empirical threshold from the moves corpus.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Format epoch ms to YYYY-MM-DD UTC for calendar comparison. */
function isoDay(dateMs: number): string {
  if (!Number.isFinite(dateMs)) return '';
  return new Date(dateMs).toISOString().slice(0, 10);
}

function isWithin(festival: FestivalEvent, dateMs: number): boolean {
  const day = isoDay(dateMs);
  if (!day) return false;
  // String compare on YYYY-MM-DD is correct because the format is lexicographic.
  return day >= festival.startDateIso && day <= festival.endDateIso;
}

function regionMatches(festival: FestivalEvent, region: string | undefined): boolean {
  if (festival.region === 'global') return true;        // 'global' fires for any caller region
  if (!region) return true;                              // no region filter → match all (caller can post-filter)
  if (region === festival.region) return true;
  // Sub-region rollups: 'india' viewers see 'tamil'/'bengali'/'assamese'/'kerala'
  // festivals; conversely those sub-regions also see pan-india festivals.
  if (region === 'india' && (festival.region === 'tamil' || festival.region === 'bengali' || festival.region === 'assamese' || festival.region === 'kerala')) {
    return true;
  }
  if (festival.region === 'india' && (region === 'tamil' || region === 'bengali' || region === 'assamese' || region === 'kerala')) {
    return true;
  }
  return false;
}

/**
 * Return the festivals active on the given UTC day, optionally filtered to a
 * region. The result is ordered by the calendar (start-date ascending).
 */
export function activeFestivals(dateMs: number, region?: string): FestivalEvent[] {
  return FESTIVAL_CALENDAR_2026
    .filter((f) => isWithin(f, dateMs))
    .filter((f) => regionMatches(f, region));
}

/**
 * Per-candidate festival boost, in [0, FESTIVAL_BOOST_MAX].
 *
 * Counts UNIQUE phrase matches across the candidate's last-7d posts: one
 * point per distinct hook phrase found. Repeats of the same phrase do not
 * stack — a candidate who tweeted "diwali" ten times is festival-engaged
 * once, not ten times. This bounds the result and avoids spam-pumping.
 */
export function festivalBoostForCandidate(
  dateMs: number,
  candidatePostsLast7d: Array<{ contentLowercase: string }>,
  region?: string,
): number {
  if (!Array.isArray(candidatePostsLast7d) || candidatePostsLast7d.length === 0) return 0;
  const active = activeFestivals(dateMs, region);
  if (active.length === 0) return 0;

  // Collect the set of phrases live today.
  const phrases: string[] = [];
  for (const fest of active) phrases.push(...fest.hookPhrases);
  if (phrases.length === 0) return 0;

  const hit = new Set<string>();
  for (const post of candidatePostsLast7d) {
    const text = post.contentLowercase ?? '';
    if (!text) continue;
    for (const phrase of phrases) {
      if (hit.has(phrase)) continue;
      if (text.includes(phrase)) hit.add(phrase);
    }
  }

  const raw = hit.size * FESTIVAL_PER_HIT_BOOST;
  return Math.min(raw, FESTIVAL_BOOST_MAX);
}

/**
 * Flat list of hook phrases the Move composer can show as openers today.
 * De-duplicated; ordered by the calendar (so older-starting festivals
 * appear first).
 *
 * The composer renders the phrase as-is; localisation is up to the caller's
 * culture renderer (DESIGN §D.7.3).
 */
export function festivalHooksForToday(dateMs: number, region?: string): string[] {
  const active = activeFestivals(dateMs, region);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const fest of active) {
    for (const phrase of fest.hookPhrases) {
      if (seen.has(phrase)) continue;
      seen.add(phrase);
      out.push(phrase);
    }
  }
  return out;
}

/**
 * Days until the next festival start (relative to `dateMs`). Returns null
 * when no upcoming festival is within `lookAheadDays` (default 30).
 *
 * Helper for UI nudges like "Diwali in 5 days — set your plans now."
 */
export function daysUntilNextFestival(
  dateMs: number,
  region?: string,
  lookAheadDays: number = 30,
): { festival: FestivalEvent; days: number } | null {
  if (!Number.isFinite(dateMs)) return null;
  const today = isoDay(dateMs);
  if (!today) return null;
  const horizonMs = dateMs + lookAheadDays * MS_PER_DAY;
  const horizonDay = isoDay(horizonMs);
  let best: { festival: FestivalEvent; days: number } | null = null;
  for (const fest of FESTIVAL_CALENDAR_2026) {
    if (!regionMatches(fest, region)) continue;
    if (fest.startDateIso < today) continue;
    if (fest.startDateIso > horizonDay) continue;
    // Compute integer day delta via UTC midnight epoch.
    const startMs = Date.parse(fest.startDateIso + 'T00:00:00.000Z');
    const todayMs = Date.parse(today + 'T00:00:00.000Z');
    const days = Math.round((startMs - todayMs) / MS_PER_DAY);
    if (best === null || days < best.days) best = { festival: fest, days };
  }
  return best;
}
