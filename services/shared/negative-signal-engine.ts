// ─── Negative Signal Engine ────────────────────────────
// Turns a user's history of blocks, reports, unmatches, and
// pass-with-feedback into a TRAIT-PENALTY function applied at
// rank-time. This is the user's revealed *anti-preference*.
//
// Why this matters: a user who's blocked 3 smokers from city X is
// signaling they don't want more of the same — far stronger than
// a like signal because the user took adversarial action.
//
// Inputs are pre-fetched rows. No DB calls here.

export interface NegativeEvent {
  kind: 'block' | 'report' | 'unmatch' | 'pass_feedback';
  // The traits we observed on the offending user at the time of action.
  // Caller hydrates these from the offender's profile snapshot.
  targetTraits: TraitSnapshot;
  daysAgo: number;
  reason?: string | null; // free-text or enum from the user's feedback
}

export interface TraitSnapshot {
  city?: string | null;
  ageBucket?: string | null;          // e.g. '18-24', '25-29'
  smoking?: string | null;
  drinking?: string | null;
  religion?: string | null;
  datingIntent?: string | null;
  education?: string | null;
  verified?: boolean | null;
}

export interface NegativeSignalProfile {
  traitPenalties: Record<string, number>;  // key='city:Mumbai' → penalty 0..1
  reasonTags: Record<string, number>;       // free-text reason vocabulary
  totalEvents: number;
  hardBlockedTraits: Set<string>;           // ≥3 events on same trait → hard penalty
}

export function buildNegativeProfile(events: NegativeEvent[]): NegativeSignalProfile {
  if (events.length === 0) {
    return { traitPenalties: {}, reasonTags: {}, totalEvents: 0, hardBlockedTraits: new Set() };
  }

  const accum: Record<string, number> = {};
  const reasonTags: Record<string, number> = {};
  // Severity multipliers: blocks/reports are louder than unmatches/passes.
  const SEV: Record<NegativeEvent['kind'], number> = {
    report: 3.0,
    block: 2.5,
    unmatch: 1.5,
    pass_feedback: 1.0,
  };
  // 90-day half-life — block from a year ago still meaningful but faded.
  const decay = (d: number) => Math.pow(0.5, Math.max(0, d) / 90);

  for (const e of events) {
    const w = SEV[e.kind] * decay(e.daysAgo);
    for (const [k, v] of Object.entries(e.targetTraits)) {
      if (v == null || v === '' || typeof v === 'boolean') continue;
      const key = `${k}:${v.toLowerCase()}`;
      accum[key] = (accum[key] || 0) + w;
    }
    if (e.reason) {
      const tokens = e.reason.toLowerCase().split(/[^a-z]+/).filter(t => t.length > 3);
      for (const t of tokens) reasonTags[t] = (reasonTags[t] || 0) + w;
    }
  }

  // Normalize trait penalties to 0..1 by dividing by max accumulator,
  // and mark "hardBlocked" anything that exceeded ~3 strong events
  // (≥2 reports, ≥3 blocks, or ≥4 unmatches with full freshness).
  let max = 1;
  for (const v of Object.values(accum)) { if (v > max) max = v; }
  const traitPenalties: Record<string, number> = {};
  const hardBlockedTraits = new Set<string>();
  for (const [k, v] of Object.entries(accum)) {
    traitPenalties[k] = v / max;
    if (v >= 6) hardBlockedTraits.add(k);
  }

  return { traitPenalties, reasonTags, totalEvents: events.length, hardBlockedTraits };
}

// Returns a penalty 0..40 to subtract from a candidate's score.
export function negativePenalty(
  profile: NegativeSignalProfile,
  candidate: TraitSnapshot,
): { penalty: number; matchedTraits: string[] } {
  if (profile.totalEvents === 0) return { penalty: 0, matchedTraits: [] };
  let penalty = 0;
  const matched: string[] = [];
  for (const [k, v] of Object.entries(candidate)) {
    if (v == null || v === '' || typeof v === 'boolean') continue;
    const key = `${k}:${v.toLowerCase()}`;
    const p = profile.traitPenalties[key];
    if (p) {
      // Each matched trait contributes up to 12 points; hard-blocked +8 extra.
      let contrib = p * 12;
      if (profile.hardBlockedTraits.has(key)) contrib += 8;
      penalty += contrib;
      matched.push(key);
    }
  }
  // Cap total at 40 — never zero a candidate purely on negative signal.
  return { penalty: Math.min(40, penalty), matchedTraits: matched };
}

export function ageBucket(age?: number | null): string | null {
  if (age == null || age < 18) return null;
  if (age < 25) return '18-24';
  if (age < 30) return '25-29';
  if (age < 35) return '30-34';
  if (age < 40) return '35-39';
  if (age < 50) return '40-49';
  return '50+';
}
