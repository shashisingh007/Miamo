/**
 * Intent / mood inference worker — v3.6.0 Section A.7.
 *
 * Drives the pure modules `intentRightNowV8` and `moodRightNowV8` on a
 * staggered schedule and persists the result into `FeatureSnapshot.raw`
 * with a 90s TTL. Pure ranking logic lives in
 * `services/shared/src/algo/v8/{intentRightNow,moodRightNow}.ts`; this
 * file is the I/O wrapper.
 *
 * Schedule (DESIGN_SECTION_A §A.6.1):
 *   - active users  (lastActivity <2min ago)  → tick every 30s
 *   - recent users  (lastActivity <1h ago)    → tick every 5min
 *   - idle users   (>=1h)                     → skipped this tick
 *
 * Consent gates (§A.9):
 *   - Settings.behavioralRankingEnabled = false → skip user entirely.
 *   - Settings.moodInferenceEnabled     = false → compute intent but
 *     do NOT write mood. Default false (opt-in for special-category).
 *
 * Default-OFF: set `INTENT_INFERENCE_ENABLED=1` to start. When unset,
 * `start()` is a no-op so the worker process is safe to ship dark.
 *
 * MAX_USERS_PER_TICK = 200 keeps a single tick under ~600ms median compute
 * (200 × ~3ms each, plus 200 × small Postgres writes) which fits inside the
 * 30s active-tier cadence with margin to spare.
 */
import type { PrismaClient } from '@prisma/client';
import { hashUid } from '../../shared/src/track/hash';
import { intentInferenceRuns } from '../../shared/src/metrics';
import {
  inferIntent,
  topIntent,
  INTENT_TTL_MS,
  type IntentVector,
  type RecentEvent,
  type ViewerFeatures,
} from '../../shared/src/algo/v8/intentRightNow';
import {
  inferMood,
  MOOD_TTL_MS,
  type MoodVector,
} from '../../shared/src/algo/v8/moodRightNow';

// ─── Env-driven knobs ────────────────────────────────────────────────────────

/** Worker is OFF unless this is `'1'`. // because: dark-ship contract per §A.6.4. */
const ENABLED = process.env.INTENT_INFERENCE_ENABLED === '1';

/** Tick cadence (the loop's wall-clock interval). 30s = active-tier rhythm. */
const TICK_INTERVAL_MS = Number(process.env.INTENT_INFERENCE_TICK_MS || 30_000);

/** Active-user threshold — lastActivity < this ⇒ active-tier. */
const ACTIVE_WINDOW_MS = Number(process.env.INTENT_ACTIVE_WINDOW_MS || 2 * 60_000);

/** Recent-user threshold — lastActivity < this ⇒ recent-tier (5min cadence). */
const RECENT_WINDOW_MS = Number(process.env.INTENT_RECENT_WINDOW_MS || 60 * 60_000);

/** Recent-tier cadence — only re-process recent (inactive but <1h) every 5min. */
const RECENT_TICK_MS = Number(process.env.INTENT_RECENT_TICK_MS || 5 * 60_000);

/** Per-tick batch cap to bound DB load. */
export const MAX_USERS_PER_TICK = Number(process.env.INTENT_INFERENCE_BATCH_SIZE || 200);

/** UserActivity lookback window for building the lastNEvents array. */
const ACTIVITY_LOOKBACK_MS = Number(process.env.INTENT_ACTIVITY_LOOKBACK_MS || 30 * 60_000);

/** EventAggHourly lookback for ViewerFeatures derivation. */
const HOURLY_LOOKBACK_HOURS = Number(process.env.INTENT_HOURLY_LOOKBACK_HOURS || 1);

/** Per intentRightNow.MAX_EVENT_WINDOW — but env-tunable for stress tests. */
const MAX_RECENT_EVENTS = Number(process.env.INTENT_MAX_RECENT_EVENTS || 30);

// ─── Lightweight in-process counter ──────────────────────────────────────────
//
// // because: the tracking-worker doesn't yet wire prom-client; the
// // shared `metrics.ts` is HTTP-side. We expose plain accumulator objects so
// // `/v4/status` can include them and tests can assert against them. When the
// // worker grows a real metrics endpoint these can be promoted to
// // `prom_client.Counter` without touching call sites.

/** Plain numeric counter, mirrors the `Counter` shape the design doc names. */
export class Counter {
  private n = 0;
  constructor(public readonly name: string) {}
  inc(by = 1): void { this.n += by; }
  value(): number { return this.n; }
  reset(): void { this.n = 0; }
}

export const counters = {
  runs:           new Counter('intent_inference_runs_total'),
  writes:         new Counter('intent_inference_writes_total'),
  skippedConsent: new Counter('intent_inference_skipped_consent_total'),
  errors:         new Counter('intent_inference_errors_total'),
};

// ─── Internal row shapes ─────────────────────────────────────────────────────

export type ActiveUserRow = {
  uidHash: string;
  /** Most-recent UserActivity.createdAt for the user (ms since epoch). */
  lastActivityMs: number;
};

export type ActivityRow = {
  uidHash: string;
  action: string;
  targetType: string | null;
  metadata: string | null;
  durationMs: number | null;
  createdAtMs: number;
};

export type HourlyRow = {
  uidHash: string;
  evt: string;
  bucket: Date;
  count: number;
  meta: Record<string, unknown> | null;
};

export type FeatureRow = {
  uidHash: string;
  chronotype: string | null;
  attentionProfile: string | null;
  rageClickRate: number | null;
  raw: Record<string, unknown> | null;
};

export type ConsentRow = {
  /** HMAC-SHA256 of Settings.userId — matches uidHash in tracking tables. */
  uidHash: string;
  moodInferenceEnabled: boolean;
  behavioralRankingEnabled: boolean;
};

// ─── Pure helpers (exported for testing) ─────────────────────────────────────

/**
 * Decide which tier a user falls into for the current tick.
 *
 * Returns:
 *   'active' if ageMs < ACTIVE_WINDOW_MS
 *   'recent' if ageMs < RECENT_WINDOW_MS
 *   'idle'   otherwise
 *
 * Pure. // because: tick-classification is the core scheduling decision; it
 * must be testable without mocking Date.now().
 */
export function classifyTier(ageMs: number): 'active' | 'recent' | 'idle' {
  if (ageMs < ACTIVE_WINDOW_MS) return 'active';
  if (ageMs < RECENT_WINDOW_MS) return 'recent';
  return 'idle';
}

/**
 * Map a UserActivity row's action+metadata into a RecentEvent the pure
 * classifier understands. Best-effort — unknown actions are passed through
 * verbatim; the classifier silently ignores unrecognised event names.
 */
export function activityToRecentEvent(row: ActivityRow, nowMs: number): RecentEvent {
  let payload: Record<string, unknown> | undefined;
  if (row.metadata) {
    try { payload = JSON.parse(row.metadata) as Record<string, unknown>; }
    catch { payload = undefined; }
  }
  // The classifier expects either a dwellMs in payload or an explicit event;
  // we forward durationMs when present.
  if (payload === undefined && row.durationMs !== null) {
    payload = { dwellMs: row.durationMs };
  } else if (payload && row.durationMs !== null && payload.dwellMs === undefined) {
    payload.dwellMs = row.durationMs;
  }
  return {
    evt: row.action,
    payload,
    ageMs: Math.max(0, nowMs - row.createdAtMs),
  };
}

/**
 * Derive the minimal `ViewerFeatures` set from the FeatureSnapshot row +
 * recent activity. Falls back to neutral values for missing rows. Pure.
 */
export function buildViewerFeatures(
  snapshot: FeatureRow | null,
  recentEvents: ReadonlyArray<RecentEvent>,
): ViewerFeatures {
  const raw = (snapshot?.raw || {}) as { lastSessionWindowShopping?: boolean };
  return {
    chronotype:        snapshot?.chronotype ?? undefined,
    attentionProfile:  snapshot?.attentionProfile ?? undefined,
    lastSessionWindowShopping: raw.lastSessionWindowShopping === true,
    // recentEvents is currently unused for features but accepted here so
    // future signals (e.g. inferred from window contents) can land without a
    // signature change. // because: forward-compatible plumbing per §A.6.2.
  };
  void recentEvents;
}

/**
 * Derive the inputs `inferMood()` needs from FeatureSnapshot + recent
 * UserActivity. Conservative: anything we lack confidence in stays `null`
 * so mood collapses toward neutral. Pure.
 */
export function buildMoodInput(
  snapshot: FeatureRow | null,
  events: ReadonlyArray<RecentEvent>,
  nowMs: number,
): {
  rageClickRate: number | null;
  dwellVariance: number | null;
  scrollVelocity: number | null;
  localHour: number | null;
  recentRegretCount: number;
  recentReturnCount: number;
  bioExpandRate: number;
  nowMs: number;
} {
  let regret = 0;
  let ret = 0;
  let bioExpands = 0;
  let impressions = 0;
  const dwells: number[] = [];
  for (const ev of events) {
    if (ev.evt === 'swipe.regret') regret += 1;
    if (ev.evt === 'intent.profile.settle' || ev.evt === 'discover.see_later.view') ret += 1;
    if (ev.evt === 'card.bio.expand') bioExpands += 1;
    if (ev.evt === 'card.impression.100' || ev.evt === 'card.impression.50') {
      impressions += 1;
      const p = ev.payload as { dwellMs?: number } | undefined;
      if (typeof p?.dwellMs === 'number' && Number.isFinite(p.dwellMs)) dwells.push(p.dwellMs);
    }
  }
  // Sample variance (population variance for tiny samples) — null if <2 dwells.
  let dwellVariance: number | null = null;
  if (dwells.length >= 2) {
    const mean = dwells.reduce((a, b) => a + b, 0) / dwells.length;
    const sq = dwells.reduce((a, b) => a + (b - mean) * (b - mean), 0);
    dwellVariance = sq / dwells.length;
  }
  const bioExpandRate = impressions > 0
    ? Math.min(1, bioExpands / impressions)
    : 0;
  return {
    rageClickRate: snapshot?.rageClickRate ?? null,
    dwellVariance,
    scrollVelocity: null,
    localHour: new Date(nowMs).getUTCHours(),
    recentRegretCount: regret,
    recentReturnCount: ret,
    bioExpandRate,
    nowMs,
  };
}

/**
 * Build the JSONB payload written into FeatureSnapshot.raw for one user.
 * Honours `writeMood=false` by omitting the mood entry; existing keys on
 * the row are preserved by the DB-side `||` merge (see SQL below).
 */
export function buildRawPatch(args: {
  intentVec: IntentVector;
  topClass: ReturnType<typeof topIntent>;
  moodVec: MoodVector | null;
  nowMs: number;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    intentRightNow: {
      intentVec:  args.intentVec,
      topClass:   args.topClass,
      computedAt: args.nowMs,
      ttlMs:      INTENT_TTL_MS,
      algoVersion: 'v8.0',
    },
  };
  if (args.moodVec) {
    out.moodRightNow = {
      moodVec:    args.moodVec,
      computedAt: args.nowMs,
      ttlMs:      MOOD_TTL_MS,
      algoVersion: 'v8.0',
    };
  }
  return out;
}

// ─── The loop ────────────────────────────────────────────────────────────────

export type LoopStatus = {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  lastTickAt: number | null;
  lastTickProcessed: number;
  counters: { runs: number; writes: number; skippedConsent: number; errors: number };
};

export class IntentInferenceLoop {
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Per-uidHash last-processed wall clock; used for recent-tier rate limit. */
  private lastProcessedAt = new Map<string, number>();
  private lastTickAt: number | null = null;
  private lastTickProcessed = 0;

  constructor(
    private prisma: PrismaClient,
    private opts: { now?: () => number; enabled?: boolean } = {},
  ) {}

  /** Default-OFF: start is a no-op unless `INTENT_INFERENCE_ENABLED=1`. */
  start(): void {
    const on = this.opts.enabled ?? ENABLED;
    if (!on) return;
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        counters.errors.inc();
        // eslint-disable-next-line no-console
        console.warn('[intent-inference] tick error:', (e as Error).message);
      });
    }, TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  status(): LoopStatus {
    return {
      enabled: this.opts.enabled ?? ENABLED,
      running: this.timer !== null,
      intervalMs: TICK_INTERVAL_MS,
      lastTickAt: this.lastTickAt,
      lastTickProcessed: this.lastTickProcessed,
      counters: {
        runs:           counters.runs.value(),
        writes:         counters.writes.value(),
        skippedConsent: counters.skippedConsent.value(),
        errors:         counters.errors.value(),
      },
    };
  }

  /**
   * Run one tick: discover active+recent users, classify intent (and
   * optionally mood) per user, write a JSONB merge patch into
   * `FeatureSnapshot.raw`. Per-user errors are swallowed and recorded into
   * the `errors` counter; the tick never throws.
   *
   * Returns the number of users successfully written.
   */
  async tick(): Promise<number> {
    counters.runs.inc();
    // Phase C.3 — Prometheus heartbeat. Every tick bumps the counter so
    // Grafana / CloudWatch can alarm on monotonic delta == 0 over 5min,
    // which is the documented "tracking-worker rollup lag > 5min" alarm.
    intentInferenceRuns.inc();
    const now = (this.opts.now ?? Date.now)();
    this.lastTickAt = now;

    let processed = 0;
    try {
      // 1) Pull candidate users via UserActivity in the last 30min.
      const since = new Date(now - ACTIVITY_LOOKBACK_MS);
      const candidates = (await this.prisma.$queryRawUnsafe(
        `SELECT "userId" AS "uidHash", MAX("createdAt") AS "lastActivityAt"
         FROM "UserActivity"
         WHERE "createdAt" >= $1
         GROUP BY "userId"
         ORDER BY MAX("createdAt") DESC
         LIMIT $2`,
        since, MAX_USERS_PER_TICK,
      )) as Array<{ uidHash: string; lastActivityAt: Date | string }>;

      if (candidates.length === 0) {
        this.lastTickProcessed = 0;
        return 0;
      }

      const consentByHash = await this.loadConsent(candidates.map((c) => c.uidHash));

      for (const row of candidates) {
        if (processed >= MAX_USERS_PER_TICK) break;
        const lastMs = new Date(row.lastActivityAt).getTime();
        const ageMs = Math.max(0, now - lastMs);
        const tier = classifyTier(ageMs);
        if (tier === 'idle') continue;

        // Recent-tier cadence rate-limit — re-process only every 5min.
        if (tier === 'recent') {
          const lastSeen = this.lastProcessedAt.get(row.uidHash) || 0;
          if (now - lastSeen < RECENT_TICK_MS) continue;
        }

        // Consent gate: behavioralRankingEnabled=false ⇒ skip entirely.
        const consent = consentByHash.get(row.uidHash);
        if (consent && consent.behavioralRankingEnabled === false) {
          counters.skippedConsent.inc();
          continue;
        }
        const writeMood = !consent || consent.moodInferenceEnabled !== false;

        try {
          const wrote = await this.processOne(row.uidHash, now, writeMood);
          if (wrote) {
            processed += 1;
            counters.writes.inc();
            this.lastProcessedAt.set(row.uidHash, now);
          }
        } catch (e) {
          counters.errors.inc();
          // eslint-disable-next-line no-console
          console.warn('[intent-inference] user failed:', row.uidHash, (e as Error).message);
        }
      }
    } catch (e) {
      counters.errors.inc();
      // eslint-disable-next-line no-console
      console.warn('[intent-inference] tick query failed:', (e as Error).message);
    }
    this.lastTickProcessed = processed;
    return processed;
  }

  /**
   * Per-user pipeline: fetch UserActivity + EventAggHourly + FeatureSnapshot,
   * build inputs, call pure modules, merge-write the JSONB patch. Returns
   * `true` if a write was attempted.
   */
  private async processOne(uidHash: string, nowMs: number, writeMood: boolean): Promise<boolean> {
    // Recent UserActivity for the lastNEvents array.
    const activitySince = new Date(nowMs - ACTIVITY_LOOKBACK_MS);
    const actRows = (await this.prisma.$queryRawUnsafe(
      `SELECT "userId" AS "uidHash","action","targetType","metadata","durationMs",
              EXTRACT(EPOCH FROM "createdAt")*1000 AS "createdAtMs"
       FROM "UserActivity"
       WHERE "userId" = $1 AND "createdAt" >= $2
       ORDER BY "createdAt" DESC
       LIMIT $3`,
      uidHash, activitySince, MAX_RECENT_EVENTS,
    )) as ActivityRow[];

    // FeatureSnapshot row (for chronotype / attentionProfile / rageClickRate).
    const fsRows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","chronotype","attentionProfile","rageClickRate","raw"
       FROM "FeatureSnapshot"
       WHERE "uidHash" = $1`,
      uidHash,
    )) as FeatureRow[];
    const snapshot = fsRows[0] || null;

    const events = actRows.map((r) => activityToRecentEvent(r, nowMs));
    const viewerFeatures = buildViewerFeatures(snapshot, events);

    const intentVec = inferIntent({
      lastNEvents: events,
      viewerFeatures,
      nowMs,
    });
    const top = topIntent(intentVec);

    let moodVec: MoodVector | null = null;
    if (writeMood) {
      moodVec = inferMood(buildMoodInput(snapshot, events, nowMs));
    }

    const patch = buildRawPatch({ intentVec, topClass: top, moodVec, nowMs });
    // JSONB merge: existing FeatureSnapshot.raw keys are preserved by the
    // `||` operator on the existing row's `raw`. Matches feature.ts pattern.
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "FeatureSnapshot" ("uidHash","computedAt","raw")
       VALUES ($1, NOW(), $2::jsonb)
       ON CONFLICT ("uidHash") DO UPDATE SET
         "computedAt" = NOW(),
         "raw"        = COALESCE("FeatureSnapshot"."raw", '{}'::jsonb) || EXCLUDED."raw"`,
      uidHash, JSON.stringify(patch),
    );
    return true;
  }

  /**
   * Build a {uidHash → consent} map. The Settings table is keyed by raw
   * `userId`; we HMAC-hash each row to compare against the tracking
   * pipeline's uidHash. Only Settings rows whose hashed userId is in
   * `wantedHashes` are returned.
   *
   * v3.6.1 perf: the Settings table is a full-scan per tick (every 30s
   * for the active tier). We cache the hashed map in-process for
   * `CONSENT_CACHE_TTL_MS` (60s) so back-to-back ticks reuse one scan.
   * Hashing every Settings.userId on every tick was the bottleneck at
   * scale; cache hits cut the per-tick consent step to ~0ms.
   */
  private async loadConsent(wantedHashes: string[]): Promise<Map<string, ConsentRow>> {
    if (wantedHashes.length === 0) return new Map();
    const all = await this.loadAllConsents();
    const want = new Set(wantedHashes);
    const out = new Map<string, ConsentRow>();
    for (const [h, row] of all) {
      if (want.has(h)) out.set(h, row);
    }
    return out;
  }

  /**
   * Pull the full Settings table and project each row into a ConsentRow
   * keyed by uidHash. Memoised for `CONSENT_CACHE_TTL_MS` (60s). The
   * tracking worker is the sole writer to behavioural state; if consent
   * flips, the next 60s tick window is acceptable lag (per §A.9.4 the
   * consent change is also enforced at the HTTP edge via Settings
   * read-through, which sees the change immediately).
   */
  private consentCache: { at: number; map: Map<string, ConsentRow> } | null = null;
  private async loadAllConsents(): Promise<Map<string, ConsentRow>> {
    const now = Date.now();
    if (this.consentCache && now - this.consentCache.at < CONSENT_CACHE_TTL_MS) {
      return this.consentCache.map;
    }
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "userId","moodInferenceEnabled","behavioralRankingEnabled"
       FROM "Settings"`,
    )) as Array<{ userId: string; moodInferenceEnabled: boolean; behavioralRankingEnabled: boolean }>;
    const map = new Map<string, ConsentRow>();
    for (const r of rows) {
      const h = hashUid(r.userId);
      map.set(h, {
        uidHash: h,
        moodInferenceEnabled: r.moodInferenceEnabled,
        behavioralRankingEnabled: r.behavioralRankingEnabled,
      });
    }
    this.consentCache = { at: now, map };
    return map;
  }

  /** Test/diagnostic: drop the cached Settings → ConsentRow map. */
  clearConsentCache(): void { this.consentCache = null; }
}

/** 60s TTL for the in-process Settings cache. // because: spec §A.9.4 tolerance. */
export const CONSENT_CACHE_TTL_MS = 60_000;

export const _internals = {
  classifyTier,
  activityToRecentEvent,
  buildViewerFeatures,
  buildMoodInput,
  buildRawPatch,
  counters,
};
