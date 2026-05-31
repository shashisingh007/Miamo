/**
 * Session-summary derivation — Phase 2 worker-side pure logic.
 *
 * Given a chronologically-ordered stream of raw track events for a single
 * `(uidHash, sessionId)`, return the rolled-up `SessionSummary` fields the
 * `forYouV6` + `discoverPolicy` modules consume. Pure: no DB, no Redis,
 * no time-of-day dependency. The tracking-worker `session.end` handler is
 * a thin wrapper around `deriveSessionSummary()`.
 *
 * Detection rules (kept simple so they are auditable):
 *
 *   zeroActionSession  durationMs >= 30_000
 *                      AND swipesLeft + swipesRight + msgsSent + clicks == 0
 *
 *   windowShopping     cardsViewed >= 5
 *                      AND swipesLeft + swipesRight == 0
 *                      AND msgsSent == 0
 *
 *   ghostedSelf        msgsRead > 0
 *                      AND msgsSent == 0
 *                      AND durationMs >= 10_000
 */

export type RawEvent = {
  /** event name, e.g. 'discover.card_view', 'swipe.commit'. */
  e: string;
  /** wall-clock ms. */
  t: number;
  /** payload (best-effort untyped). */
  p?: Record<string, unknown>;
  /** duration (ms) — present for dwell-like events. */
  d?: number;
};

export type SessionSummaryFields = {
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  idleMs: number;
  routesVisited: string[];
  cardsViewed: number;
  swipesLeft: number;
  swipesRight: number;
  msgsSent: number;
  msgsRead: number;
  zeroActionSession: boolean;
  windowShopping: boolean;
  ghostedSelf: boolean;
};

const CLICK_EVENTS = new Set(['click', 'click.rage', 'click.dead', 'intent.cta.hover']);

export function deriveSessionSummary(events: RawEvent[]): SessionSummaryFields {
  if (!events || events.length === 0) {
    const now = new Date();
    return emptySummary(now, now);
  }

  // Sort defensively (tracking-worker may receive out-of-order events across shards).
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const startedAt = new Date(sorted[0].t);
  const endedAt   = new Date(sorted[sorted.length - 1].t);
  const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());

  const routes = new Set<string>();
  let cardsViewed = 0;
  let swipesLeft = 0;
  let swipesRight = 0;
  let msgsSent = 0;
  let msgsRead = 0;
  let clicks = 0;
  let idleMs = 0;
  // Track unmatched idle.enter timestamps so a missing exit can be charged at endedAt.
  const openIdles: number[] = [];

  for (const ev of sorted) {
    switch (ev.e) {
      case 'page.view':
      case 'nav.route': {
        const path = readPath(ev);
        if (path) routes.add(path);
        break;
      }
      case 'discover.card_view':
      case 'card.impression.100':
        cardsViewed += 1;
        break;
      case 'swipe.commit': {
        const dir = readDir(ev);
        if (dir === 'left') swipesLeft += 1;
        else if (dir === 'right') swipesRight += 1;
        break;
      }
      case 'msg.send':
        msgsSent += 1;
        break;
      case 'msg.read':
        msgsRead += 1;
        break;
      case 'attention.idle.enter':
        openIdles.push(ev.t);
        break;
      case 'attention.idle.exit': {
        const enter = openIdles.pop();
        if (enter != null) idleMs += Math.max(0, ev.t - enter);
        break;
      }
      case 'attention.idle':
        // Legacy single-event idle (pre-v6): trust its `d` ms.
        if (typeof ev.d === 'number' && ev.d > 0) idleMs += ev.d;
        break;
      default:
        if (CLICK_EVENTS.has(ev.e)) clicks += 1;
    }
  }

  // Charge any unmatched idle.enter against the session end.
  for (const enter of openIdles) {
    idleMs += Math.max(0, endedAt.getTime() - enter);
  }
  // Cap idleMs at durationMs so derived ratios stay in [0, 1].
  if (idleMs > durationMs) idleMs = durationMs;

  const zeroActionSession =
    durationMs >= 30_000 &&
    swipesLeft + swipesRight + msgsSent + clicks === 0;

  const windowShopping =
    cardsViewed >= 5 &&
    swipesLeft + swipesRight === 0 &&
    msgsSent === 0;

  const ghostedSelf =
    msgsRead > 0 &&
    msgsSent === 0 &&
    durationMs >= 10_000;

  return {
    startedAt, endedAt, durationMs, idleMs,
    routesVisited: [...routes],
    cardsViewed, swipesLeft, swipesRight,
    msgsSent, msgsRead,
    zeroActionSession, windowShopping, ghostedSelf,
  };
}

function emptySummary(startedAt: Date, endedAt: Date): SessionSummaryFields {
  return {
    startedAt, endedAt, durationMs: 0, idleMs: 0,
    routesVisited: [], cardsViewed: 0,
    swipesLeft: 0, swipesRight: 0, msgsSent: 0, msgsRead: 0,
    zeroActionSession: false, windowShopping: false, ghostedSelf: false,
  };
}

function readPath(ev: RawEvent): string | null {
  const p = ev.p ?? {};
  const path = (p.path ?? p.to ?? null);
  return typeof path === 'string' ? path : null;
}

function readDir(ev: RawEvent): 'left' | 'right' | null {
  const p = ev.p ?? {};
  const dir = p.dir ?? p.direction;
  if (dir === 'left' || dir === 'right') return dir;
  return null;
}

/* ----------------------------------------------------------------------- */
/* Focus affinity derivation — one row per (route, elementId) per hour.    */
/* ----------------------------------------------------------------------- */

export type FocusAffinityKey = `${string}|${string}|${number}`; // route|elementId|hourTs

export type FocusAffinityAgg = {
  route: string;
  elementId: string;
  /** hour bucket (UTC) as a Date (top of the hour). */
  bucket: Date;
  focusCount: number;
  dwellSumMs: number;
};

const HOUR_MS = 60 * 60 * 1000;

function hourTopUtc(ts: number): number {
  return Math.floor(ts / HOUR_MS) * HOUR_MS;
}

/**
 * Aggregate `focus.element` (count) and `intent.dwell` (count + dwellMs)
 * into per-(route, elementId, hour) buckets. Events with missing payload
 * fields are skipped (logged upstream).
 */
export function aggregateFocusAffinity(events: RawEvent[]): FocusAffinityAgg[] {
  const buckets = new Map<FocusAffinityKey, FocusAffinityAgg>();
  for (const ev of events) {
    if (ev.e !== 'focus.element' && ev.e !== 'intent.dwell') continue;
    const p = ev.p ?? {};
    const route = typeof p.route === 'string' ? p.route : null;
    const elementId = typeof p.elementId === 'string' ? p.elementId : null;
    if (!route || !elementId) continue;
    const hourTs = hourTopUtc(ev.t);
    const key: FocusAffinityKey = `${route}|${elementId}|${hourTs}`;
    let agg = buckets.get(key);
    if (!agg) {
      agg = { route, elementId, bucket: new Date(hourTs), focusCount: 0, dwellSumMs: 0 };
      buckets.set(key, agg);
    }
    agg.focusCount += 1;
    if (ev.e === 'intent.dwell') {
      const dwell = typeof p.dwellMs === 'number' ? p.dwellMs : (typeof ev.d === 'number' ? ev.d : 0);
      if (dwell > 0) agg.dwellSumMs += dwell;
    }
  }
  return [...buckets.values()];
}
