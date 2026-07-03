/**
 * v9 Temporal Learning — preferenceWindows worker loop.
 *
 * Drives the pure v9 modules
 *   - `algo/v9/multiTimescale.ts` (5-window EMA)
 *   - `algo/v9/driftDetector.ts`  (drift signal computation)
 * on a 90-second schedule and persists results into:
 *   - `UserPreferenceHistory` (one row per user × dimension × window)
 *   - `FeatureSnapshot.raw.drift` (JSONB patch for downstream consumers)
 *
 * Emits `preference.drift_detected` tracking events when magnitude > 0.5
 * and confidence > 0.6 (thresholds documented below and in
 * docs/architecture/v9-temporal-learning.md).
 *
 * Contract & safety:
 *   - Default-OFF via ALGO_V9_TEMPORAL_LEARNING_ENABLED. `start()` is a
 *     no-op unless the flag is `'1'`.
 *   - HMAC uidHash only. Never touches raw userId (constraint #6).
 *   - Per-user work is wrapped in `$transaction` for the upsert batch;
 *     per-user errors are swallowed and recorded to counters.
 *   - Batch size capped at PREFERENCE_WINDOWS_BATCH_SIZE users per tick
 *     to bound a single tick's DB load.
 *
 * The worker walks UserActivity rows from the last tick window (default
 * 90s), converts each row to a (dimension, score) pair via a small local
 * mapper, then invokes `updateAllWindows` per (user, dimension) to
 * compute the five updated rows. It upserts into UserPreferenceHistory
 * and runs `detectDrift` on the newly-persisted set. Drift signals with
 * magnitude/confidence above the emit thresholds are written as
 * tracking events for downstream consumption.
 */
import type { PrismaClient } from '@prisma/client';
import { hashUid } from '../../shared/src/track/hash';
import { preferenceWindowsRuns } from '../../shared/src/metrics';
import { v9TemporalLearningEnabled } from '../../shared/src/algo/flags';
import {
  ALL_WINDOWS,
  updateAllWindows,
  type PreferenceRow,
  type PreferenceWindow,
} from '../../shared/src/algo/v9/multiTimescale';
import {
  detectDrift,
  type DriftSignal,
} from '../../shared/src/algo/v9/driftDetector';

// ─── Env-driven knobs ────────────────────────────────────────────────────────

/** Worker cadence (wall-clock). 90s = matches the right_now half-life. */
const TICK_INTERVAL_MS = Number(process.env.PREFERENCE_WINDOWS_INTERVAL_MS || 90_000);

/** Per-tick user batch cap. */
export const MAX_USERS_PER_TICK = Number(process.env.PREFERENCE_WINDOWS_BATCH_SIZE || 100);

/** UserActivity lookback for building this tick's event stream. */
const ACTIVITY_LOOKBACK_MS = Number(process.env.PREFERENCE_WINDOWS_LOOKBACK_MS || 90_000);

/**
 * Drift emission thresholds. When magnitude exceeds MAGNITUDE_EMIT
 * AND confidence exceeds CONFIDENCE_EMIT, the worker fires a
 * `preference.drift_detected` tracking event.
 *
 * Defaults (magnitude 0.5, confidence 0.6) tuned to the Priya case:
 * her month=0.85, session=0.15 gives magnitude 0.70 with sample-count
 * confidence 1.0 → well above the emit floor. A drift of just 0.35 or
 * a fresh dimension with 5 samples stays below.
 */
const MAGNITUDE_EMIT = Number(process.env.PREFERENCE_DRIFT_EMIT_MAGNITUDE || 0.5);
const CONFIDENCE_EMIT = Number(process.env.PREFERENCE_DRIFT_EMIT_CONFIDENCE || 0.6);

// ─── Lightweight in-process counters (mirrors intentInference pattern) ──────

export class Counter {
  private n = 0;
  constructor(public readonly name: string) {}
  inc(by = 1): void { this.n += by; }
  value(): number { return this.n; }
  reset(): void { this.n = 0; }
}

export const counters = {
  runs:            new Counter('preference_windows_runs_total'),
  usersProcessed:  new Counter('preference_windows_users_processed_total'),
  rowsUpserted:    new Counter('preference_windows_rows_upserted_total'),
  driftDetected:   new Counter('preference_windows_drift_detected_total'),
  driftEmitted:    new Counter('preference_windows_drift_emitted_total'),
  errors:          new Counter('preference_windows_errors_total'),
};

// ─── Pure helpers (exported for testing) ─────────────────────────────────────

/**
 * Row shape returned by the UserActivity lookup query. `uidHash` here
 * is really the raw userId column; the tracking-pipeline convention is
 * to alias it to uidHash after HMAC-hashing at the boundary.
 */
export type ActivityRow = {
  userId: string;
  action: string;
  targetType: string | null;
  metadata: string | null;
  durationMs: number | null;
  createdAtMs: number;
};

/**
 * Map a UserActivity row to a set of (dimension, score) pairs.
 *
 * The dimension namespace is stable so a category rename does not
 * silently break preference history:
 *   `category:<c>`       coarse content category from metadata.category
 *   `hook:<h>`           interaction hook (metadata.hook)
 *   `archetype:<a>`      Miamo Move archetype (metadata.archetype)
 *
 * Scoring conventions (per D.2 spec):
 *   like               → 1.0
 *   match / open       → 0.9
 *   comment / share    → 0.85
 *   dwell (≥1s)        → clip01(durationMs / 5000)
 *   pass / skip        → 0.0
 *   unmatch / block    → 0.0
 *
 * Returns [] when no dimension can be derived — the caller silently
 * skips those events.
 */
export function eventToDimensionScore(row: ActivityRow): Array<{ dimension: string; score: number }> {
  let meta: Record<string, unknown> = {};
  if (row.metadata) {
    try { meta = JSON.parse(row.metadata) as Record<string, unknown>; }
    catch { meta = {}; }
  }
  const dims: string[] = [];
  const push = (kind: string, key: unknown): void => {
    if (typeof key === 'string' && key.length > 0 && key.length < 64) {
      dims.push(`${kind}:${key}`);
    }
  };
  push('category', meta.category);
  push('hook',     meta.hook);
  push('archetype', meta.archetype);
  if (dims.length === 0) return [];

  // Score mapping.
  let score: number;
  switch (row.action) {
    case 'like':
    case 'match':
      score = 1.0; break;
    case 'view':
    case 'click':
    case 'comment':
    case 'share':
      score = 0.85; break;
    case 'dwell': {
      const d = row.durationMs ?? 0;
      score = Math.max(0, Math.min(1, d / 5000));
      break;
    }
    case 'pass':
    case 'skip':
    case 'unmatch':
    case 'block':
      score = 0.0; break;
    default:
      // Unknown action → weak positive signal. // because: any tracked
      // interaction still indicates non-zero attention.
      score = 0.3;
  }
  return dims.map((d) => ({ dimension: d, score }));
}

/**
 * Group a raw UserActivity row list into a nested map keyed by
 * (uidHash, dimension) with a chronologically-sorted list of events.
 * The tick loop walks this map, calls `updateAllWindows` once per
 * (uidHash, dimension) group, and emits a batch upsert.
 */
export function groupEventsByUserDimension(
  rows: readonly ActivityRow[],
): Map<string, Map<string, Array<{ score: number; ts: Date }>>> {
  const out = new Map<string, Map<string, Array<{ score: number; ts: Date }>>>();
  for (const r of rows) {
    const uid = hashUid(r.userId);
    if (!uid) continue;
    const dims = eventToDimensionScore(r);
    if (dims.length === 0) continue;
    let perUser = out.get(uid);
    if (!perUser) { perUser = new Map(); out.set(uid, perUser); }
    for (const d of dims) {
      let list = perUser.get(d.dimension);
      if (!list) { list = []; perUser.set(d.dimension, list); }
      list.push({ score: d.score, ts: new Date(r.createdAtMs) });
    }
  }
  // Ensure chronological order per group.
  for (const perUser of out.values()) {
    for (const list of perUser.values()) list.sort((a, b) => a.ts.getTime() - b.ts.getTime());
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
  counters: {
    runs: number;
    usersProcessed: number;
    rowsUpserted: number;
    driftDetected: number;
    driftEmitted: number;
    errors: number;
  };
};

export class PreferenceWindowsLoop {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickAt: number | null = null;
  private lastTickProcessed = 0;

  constructor(
    private prisma: PrismaClient,
    private opts: { now?: () => number; enabled?: boolean } = {},
  ) {}

  isEnabled(): boolean {
    return this.opts.enabled ?? v9TemporalLearningEnabled();
  }

  /** Default-OFF: start is a no-op unless ALGO_V9_TEMPORAL_LEARNING_ENABLED=1. */
  start(): void {
    if (!this.isEnabled()) return;
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        counters.errors.inc();
        // eslint-disable-next-line no-console
        console.warn('[preference-windows] tick error:', (e as Error).message);
      });
    }, TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  status(): LoopStatus {
    return {
      enabled: this.isEnabled(),
      running: this.timer !== null,
      intervalMs: TICK_INTERVAL_MS,
      lastTickAt: this.lastTickAt,
      lastTickProcessed: this.lastTickProcessed,
      counters: {
        runs:            counters.runs.value(),
        usersProcessed:  counters.usersProcessed.value(),
        rowsUpserted:    counters.rowsUpserted.value(),
        driftDetected:   counters.driftDetected.value(),
        driftEmitted:    counters.driftEmitted.value(),
        errors:          counters.errors.value(),
      },
    };
  }

  /**
   * One tick. Returns count of users successfully processed.
   */
  async tick(): Promise<number> {
    counters.runs.inc();
    preferenceWindowsRuns.inc();
    const now = (this.opts.now ?? Date.now)();
    this.lastTickAt = now;

    let processed = 0;
    try {
      const since = new Date(now - ACTIVITY_LOOKBACK_MS);
      const rawRows = (await this.prisma.$queryRawUnsafe(
        `SELECT "userId","action","targetType","metadata","durationMs",
                EXTRACT(EPOCH FROM "createdAt")*1000 AS "createdAtMs"
         FROM "UserActivity"
         WHERE "createdAt" >= $1
         ORDER BY "createdAt" ASC
         LIMIT $2`,
        since, MAX_USERS_PER_TICK * 200, // ~200 events per user upper bound
      )) as ActivityRow[];

      if (rawRows.length === 0) {
        this.lastTickProcessed = 0;
        return 0;
      }

      const grouped = groupEventsByUserDimension(rawRows);

      for (const [uidHash, perUser] of grouped.entries()) {
        if (processed >= MAX_USERS_PER_TICK) break;
        try {
          await this.processOneUser(uidHash, perUser, now);
          processed += 1;
          counters.usersProcessed.inc();
        } catch (e) {
          counters.errors.inc();
          // eslint-disable-next-line no-console
          console.warn('[preference-windows] user failed:', uidHash, (e as Error).message);
        }
      }
    } catch (e) {
      counters.errors.inc();
      // eslint-disable-next-line no-console
      console.warn('[preference-windows] tick query failed:', (e as Error).message);
    }
    this.lastTickProcessed = processed;
    return processed;
  }

  /**
   * Per-user pipeline. Loads existing UserPreferenceHistory rows for
   * the dimensions we're about to touch, walks the events, and upserts
   * the updated rows in one transaction. Then runs the drift detector
   * over the freshly-persisted rows and writes both the drift patch to
   * FeatureSnapshot.raw AND (when thresholds pass) a
   * `preference.drift_detected` tracking event.
   */
  private async processOneUser(
    uidHash: string,
    perDimension: Map<string, Array<{ score: number; ts: Date }>>,
    nowMs: number,
  ): Promise<void> {
    const dims = Array.from(perDimension.keys());
    if (dims.length === 0) return;

    // Load existing rows for all target dimensions in one query.
    const existing = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","dimension","window","score","sampleCount","computedAt"
       FROM "UserPreferenceHistory"
       WHERE "uidHash" = $1 AND "dimension" = ANY($2::text[])`,
      uidHash, dims,
    )) as Array<{
      uidHash: string;
      dimension: string;
      window: string;
      score: number;
      sampleCount: number;
      computedAt: Date;
    }>;

    // Bucket existing by dimension for O(1) lookup.
    const byDim = new Map<string, PreferenceRow[]>();
    for (const r of existing) {
      if (!(ALL_WINDOWS as readonly string[]).includes(r.window)) continue;
      const w = r.window as PreferenceWindow;
      const row: PreferenceRow = {
        uidHash: r.uidHash,
        dimension: r.dimension,
        window: w,
        score: r.score,
        sampleCount: r.sampleCount,
        computedAt: r.computedAt instanceof Date ? r.computedAt : new Date(r.computedAt),
      };
      const list = byDim.get(r.dimension) ?? [];
      list.push(row);
      byDim.set(r.dimension, list);
    }

    // Walk events per dimension, folding through updateAllWindows.
    const outputRows: PreferenceRow[] = [];
    for (const dim of dims) {
      let state = byDim.get(dim) ?? [];
      const events = perDimension.get(dim) ?? [];
      for (const ev of events) {
        state = updateAllWindows(state, uidHash, dim, ev.score, ev.ts);
      }
      outputRows.push(...state);
    }

    // Upsert every output row in one transaction. // because:
    // last-write-wins with monotonic `computedAt` is exactly the
    // concurrency guarantee the design spec asks for (§D.8).
    if (outputRows.length > 0) {
      await this.prisma.$transaction(
        outputRows.map((r) => this.prisma.$executeRawUnsafe(
          `INSERT INTO "UserPreferenceHistory"
             ("id","uidHash","dimension","window","score","sampleCount","computedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
           ON CONFLICT ("uidHash","dimension","window") DO UPDATE SET
             "score"       = EXCLUDED."score",
             "sampleCount" = EXCLUDED."sampleCount",
             "computedAt"  = GREATEST("UserPreferenceHistory"."computedAt", EXCLUDED."computedAt")`,
          r.uidHash, r.dimension, r.window, r.score, r.sampleCount, r.computedAt,
        )),
      );
      counters.rowsUpserted.inc(outputRows.length);
    }

    // Drift detection over the persisted rows.
    const signals = detectDrift(outputRows);
    counters.driftDetected.inc(signals.length);

    if (signals.length > 0) {
      // Merge the drift patch into FeatureSnapshot.raw.
      const patch = { drift: signals };
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "FeatureSnapshot" ("uidHash","computedAt","raw")
         VALUES ($1, NOW(), $2::jsonb)
         ON CONFLICT ("uidHash") DO UPDATE SET
           "computedAt" = NOW(),
           "raw"        = COALESCE("FeatureSnapshot"."raw", '{}'::jsonb) || EXCLUDED."raw"`,
        uidHash, JSON.stringify(patch),
      );

      // Emit drift-detected tracking events past the confidence/magnitude gate.
      for (const s of signals) {
        if (s.driftMagnitude > MAGNITUDE_EMIT && s.confidence > CONFIDENCE_EMIT) {
          await this.emitDriftEvent(uidHash, s, nowMs);
          counters.driftEmitted.inc();
        }
      }
    }
  }

  /**
   * Persist a `preference.drift_detected` tracking event. The tracking
   * pipeline convention is to write into UserActivity for consumers
   * that don't subscribe to the Redis stream — we use targetType='drift'
   * and encode the signal into the metadata JSON string.
   */
  private async emitDriftEvent(uidHash: string, signal: DriftSignal, nowMs: number): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "UserActivity"
         ("id","userId","action","targetType","targetId","metadata","createdAt")
       VALUES (gen_random_uuid(), $1, 'preference.drift_detected', 'drift', $2, $3, to_timestamp($4/1000.0))`,
      uidHash, signal.dimension, JSON.stringify({
        dimension: signal.dimension,
        driftMagnitude: signal.driftMagnitude,
        driftDirection: signal.driftDirection,
        confidence: signal.confidence,
      }), nowMs,
    );
  }
}

export const _internals = {
  eventToDimensionScore,
  groupEventsByUserDimension,
  counters,
};
