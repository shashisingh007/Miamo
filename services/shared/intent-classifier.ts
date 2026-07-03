// ─── Intent Classifier ─────────────────────────────────
// Classifies STATED vs REVEALED intent. Profiles often say one thing
// (datingIntent="serious") while behavior says another (fast swipes,
// late-night sessions, photo-only views). We surface the gap so the
// ranker can act on what users *do*, not what they *type*.
//
// Inputs are pre-aggregated rows the caller already has (EventAggDaily
// for last 14 days). No DB calls in here — keeps it testable and
// import-cycle-free.

export type StatedIntent = 'casual' | 'serious' | 'dtm' | 'unknown';
export type RevealedIntent = 'casual' | 'serious' | 'dtm' | 'exploring';

export interface DailyEventRow {
  evt: string;
  day: Date | string;
  count: number;
  durSum?: number | null;
}

export interface IntentWeights {
  serious: number; // 0..1
  dtm: number;     // 0..1
  casual: number;  // 0..1
}

export interface IntentReport {
  stated: StatedIntent;
  revealed: RevealedIntent;
  weights: IntentWeights;     // sum to 1
  confidence: number;         // 0..1, low when total signal small
  mismatch: number;           // 0..1, distance between stated and revealed
  signalCount: number;        // total events considered (for debugging)
  dominantSignals: string[];  // e.g. ["dtm.filter.applied", "scoreSerious dwell"]
}

// Signal taxonomy. Each event name contributes to one or more buckets.
// Weights: events that strongly indicate intent get higher weights.
const SERIOUS_EVENTS: Record<string, number> = {
  'profile.bio.expand': 1.5,
  'profile.depth_score': 2.0,
  'gallery.long_press': 1.0,
  'card.dwell.long': 2.0,         // dwell > 8s
  'card.hover.no_action': 0.8,    // considered, didn't commit — hesitation = consideration
  'discover.filter.serious': 3.0, // filter toggled
  'serious.mode.on': 4.0,
  'msg.send.first': 2.5,           // first move = commitment
  'access.request.sent': 2.0,
};
const DTM_EVENTS: Record<string, number> = {
  'matrimonial.browse': 3.0,
  'matrimonial.profile.view': 2.0,
  'dtm.filter.applied': 4.0,
  'dtm.access.request': 4.0,
  'serious.mode.on': 1.5,         // overlap signal
  'route.navigate': 0.0,           // counted only when path = serious-mode (handled below)
};
const CASUAL_EVENTS: Record<string, number> = {
  'discover.swipe': 0.3,           // pure volume = casual
  'card.dwell.short': 1.5,         // dwell < 2s
  'photo.swipe': 0.5,
  'swipe.repeat_pass': 1.5,
  'session.late_night': 1.0,       // 11pm-4am sessions
  'gallery.zoom': 0.4,
  'feed.bounce': 1.5,              // entered feed, left within 5s w/ no action — boredom
  'feed.return.fast': 1.0,         // re-entered feed within 60s — rumination loop
  'discover.refresh.empty': 0.8,   // refreshed but didn't act — indecision-while-browsing
  'filter.reverted': 0.6,          // tried filter, reverted — exploring without commitment
  'session.abandon': 1.2,          // hidden tab >2min after <3 actions — gave up
};

// Routes whose mere navigation signals an intent.
const ROUTE_SIGNALS: Record<string, { bucket: 'serious' | 'dtm' | 'casual'; weight: number }> = {
  '/serious-mode': { bucket: 'dtm', weight: 2.0 },
  '/matrimonial': { bucket: 'dtm', weight: 2.0 },
  '/discover': { bucket: 'casual', weight: 0.2 },
};

// Half-life decay applied to per-day counts. 7-day half-life means
// signals from a week ago count half as much as today's.
function decay(daysAgo: number, halfLifeDays = 7): number {
  return Math.pow(0.5, Math.max(0, daysAgo) / halfLifeDays);
}

function dayDelta(day: Date | string): number {
  const t = typeof day === 'string' ? Date.parse(day) : day.getTime();
  return Math.max(0, (Date.now() - t) / 86400000);
}

export function classifyIntent(opts: {
  statedIntent?: string | null;
  seriousMode?: boolean | null;
  dailyEvents: DailyEventRow[];        // last ~14 days for this user
  recentRoutes?: Array<{ path: string; daysAgo: number }>;
}): IntentReport {
  const stated: StatedIntent = (() => {
    const s = (opts.statedIntent || '').toLowerCase();
    if (opts.seriousMode) return 'serious';
    if (s.includes('marriage') || s.includes('matrimon')) return 'dtm';
    if (s.includes('serious') || s.includes('long')) return 'serious';
    if (s.includes('casual') || s.includes('fun') || s.includes('hookup')) return 'casual';
    return 'unknown';
  })();

  let serious = 0, dtm = 0, casual = 0;
  const contributions: Record<string, number> = {};
  let signalCount = 0;

  for (const row of opts.dailyEvents) {
    const w = decay(dayDelta(row.day));
    const c = row.count * w;
    signalCount += row.count;
    if (SERIOUS_EVENTS[row.evt]) {
      const v = SERIOUS_EVENTS[row.evt] * c;
      serious += v;
      contributions[row.evt] = (contributions[row.evt] || 0) + v;
    }
    if (DTM_EVENTS[row.evt]) {
      const v = DTM_EVENTS[row.evt] * c;
      dtm += v;
      contributions[row.evt] = (contributions[row.evt] || 0) + v;
    }
    if (CASUAL_EVENTS[row.evt]) {
      const v = CASUAL_EVENTS[row.evt] * c;
      casual += v;
      contributions[row.evt] = (contributions[row.evt] || 0) + v;
    }
  }

  for (const r of opts.recentRoutes || []) {
    const sig = ROUTE_SIGNALS[r.path];
    if (!sig) continue;
    const v = sig.weight * decay(r.daysAgo);
    if (sig.bucket === 'serious') serious += v;
    else if (sig.bucket === 'dtm') dtm += v;
    else casual += v;
  }

  const total = serious + dtm + casual;
  const weights: IntentWeights = total > 0
    ? { serious: serious / total, dtm: dtm / total, casual: casual / total }
    : { serious: 0.34, dtm: 0.33, casual: 0.33 };

  const revealed: RevealedIntent = (() => {
    if (total < 5) return 'exploring';
    const max = Math.max(weights.serious, weights.dtm, weights.casual);
    // If the top bucket is weak relative to second, call it exploring.
    const sorted = [weights.serious, weights.dtm, weights.casual].sort((a, b) => b - a);
    if (sorted[0] - sorted[1] < 0.10) return 'exploring';
    if (max === weights.dtm) return 'dtm';
    if (max === weights.serious) return 'serious';
    return 'casual';
  })();

  // Confidence rises with total signal volume; saturates around 50.
  const confidence = Math.min(1, total / 50);

  // Mismatch: 0 if stated == revealed, 1 if opposites.
  const mismatchTable: Record<string, Record<string, number>> = {
    casual:  { casual: 0,    serious: 0.9, dtm: 1.0, exploring: 0.3 },
    serious: { casual: 0.9,  serious: 0,   dtm: 0.3, exploring: 0.4 },
    dtm:     { casual: 1.0,  serious: 0.3, dtm: 0,   exploring: 0.5 },
    unknown: { casual: 0.4,  serious: 0.4, dtm: 0.4, exploring: 0.2 },
  };
  const mismatch = mismatchTable[stated]?.[revealed] ?? 0.5;

  const dominantSignals = Object.entries(contributions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  return { stated, revealed, weights, confidence, mismatch, signalCount, dominantSignals };
}

// Re-rank weight blender. Given the active filter and the revealed intent,
// returns a multiplier vector applied to the per-algorithm score.
// Example: filter='forYou' but revealed='dtm' → blend toward DTM-style
// substance signals (boost serious score, dampen pure novelty).
export function blendWeights(
  filter: 'forYou' | 'new' | 'active' | 'verified' | 'serious' | 'aiPicks',
  revealed: RevealedIntent,
  confidence: number,
): { primary: number; seriousBlend: number; noveltyBlend: number; activityBlend: number } {
  // Base: filter dominates 100%.
  const base = { primary: 1.0, seriousBlend: 0, noveltyBlend: 0, activityBlend: 0 };
  if (confidence < 0.2) return base; // not enough signal to blend

  const c = Math.min(0.35, confidence * 0.5); // cap blend influence at 35%

  switch (filter) {
    case 'forYou':
      if (revealed === 'serious' || revealed === 'dtm') {
        return { primary: 1 - c, seriousBlend: c, noveltyBlend: 0, activityBlend: 0 };
      }
      if (revealed === 'casual') {
        return { primary: 1 - c * 0.5, seriousBlend: 0, noveltyBlend: c * 0.3, activityBlend: c * 0.2 };
      }
      return base;
    case 'new':
      // If user is acting casual, double down on newness; if serious, dampen.
      if (revealed === 'casual') return { primary: 1, seriousBlend: 0, noveltyBlend: 0.2, activityBlend: 0 };
      if (revealed === 'serious' || revealed === 'dtm') {
        return { primary: 1 - c, seriousBlend: c, noveltyBlend: 0, activityBlend: 0 };
      }
      return base;
    case 'active':
      if (revealed === 'serious') return { primary: 1 - c, seriousBlend: c, noveltyBlend: 0, activityBlend: 0 };
      return base;
    case 'verified':
    case 'serious':
      // Serious filters trust themselves; small casual blend only if revealed=casual.
      if (revealed === 'casual') return { primary: 1 - c * 0.5, seriousBlend: 0, noveltyBlend: 0, activityBlend: c * 0.5 };
      return base;
    case 'aiPicks':
      // aiPicks already learns; pass through.
      return base;
  }
}
