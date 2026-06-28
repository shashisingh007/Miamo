/**
 * SafetyAgg writer — v6.5.
 *
 * Periodically reads safety / match-state events from `EventAggDaily`
 * (already aggregated by RollupConsumer) and projects them into the
 * `SafetyAgg` table keyed by (uidHash, surface, kind, day).
 *
 * Why a separate table? Two reasons:
 *   1. Surface-aware learning: the v6.5 learner consumes safety signals
 *      keyed by where they happened (`discover` block ≠ `messages` block
 *      for ranking purposes).
 *   2. Hard-negative speed: the ranker filters blocked candidates without
 *      paying for a JSONB scan over `EventAggDaily.meta.targets`.
 *
 * Default-OFF: set SAFETY_ROLLUP_ENABLED=1 to start the loop. Idempotent
 * — running it twice on the same day produces the same row.
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.SAFETY_ROLLUP_INTERVAL_MS || 5 * 60 * 1000);
const LOOKBACK_DAYS = Number(process.env.SAFETY_ROLLUP_LOOKBACK_DAYS || 2);
const ENABLED = process.env.SAFETY_ROLLUP_ENABLED === '1';

/** Event names this worker maps into SafetyAgg. */
const SAFETY_EVENTS: Record<string, { kind: string; defaultSurface: string }> = {
  'safety.block':     { kind: 'block',   defaultSurface: 'discover' },
  'safety.report':    { kind: 'report',  defaultSurface: 'discover' },
  'discover.unmatch': { kind: 'unmatch', defaultSurface: 'discover' },
  'match.hold':       { kind: 'hold',    defaultSurface: 'matches'  },
  'match.unhold':     { kind: 'unhold',  defaultSurface: 'matches'  },
};

export type DailyEventRow = {
  uidHash: string;
  evt: string;
  day: Date;
  count: number;
  /** EventAggDaily.meta — may carry { surface?: string, targets?: Record<string, number> }. */
  meta: { surface?: string; targets?: Record<string, number> } | null;
};

/**
 * Pure helper: given recent EventAggDaily rows, fold them into upsert rows
 * for SafetyAgg. Surface is read from `meta.surface` when present, else
 * from the per-event default mapping above.
 */
export function foldSafetyRows(rows: DailyEventRow[]): Array<{
  uidHash: string;
  surface: string;
  kind: string;
  day: Date;
  count: number;
  targets: Record<string, number>;
}> {
  const acc = new Map<string, {
    uidHash: string; surface: string; kind: string; day: Date;
    count: number; targets: Record<string, number>;
  }>();
  for (const r of rows) {
    const map = SAFETY_EVENTS[r.evt];
    if (!map) continue;
    const surface = (r.meta?.surface as string | undefined) || map.defaultSurface;
    const dayIso = r.day.toISOString().slice(0, 10);
    const k = `${r.uidHash}|${surface}|${map.kind}|${dayIso}`;
    let cur = acc.get(k);
    if (!cur) {
      cur = {
        uidHash: r.uidHash, surface, kind: map.kind, day: r.day,
        count: 0, targets: {},
      };
      acc.set(k, cur);
    }
    cur.count += r.count;
    if (r.meta?.targets) {
      for (const [t, n] of Object.entries(r.meta.targets)) {
        cur.targets[t] = (cur.targets[t] || 0) + Number(n);
      }
    }
  }
  // Cap targets-per-row at 64 to bound JSONB size.
  for (const v of acc.values()) {
    const entries = Object.entries(v.targets);
    if (entries.length > 64) {
      entries.sort((a, b) => b[1] - a[1]);
      v.targets = Object.fromEntries(entries.slice(0, 64));
    }
  }
  return [...acc.values()];
}

export class SafetyRollup {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[safety-rollup] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<number> {
    const evts = Object.keys(SAFETY_EVENTS);
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","evt","day","count","meta"
       FROM "EventAggDaily"
       WHERE "evt" = ANY($1::text[])
         AND "day" >= NOW() - ($2 || ' days')::interval`,
      evts, String(LOOKBACK_DAYS),
    )) as DailyEventRow[];
    const upserts = foldSafetyRows(rows);
    let written = 0;
    for (const u of upserts) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SafetyAgg" ("uidHash","surface","kind","day","count","meta")
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT ("uidHash","surface","kind","day") DO UPDATE SET
           "count" = EXCLUDED."count",
           "meta"  = EXCLUDED."meta"`,
        u.uidHash, u.surface, u.kind, u.day, u.count,
        JSON.stringify({ targets: u.targets }),
      );
      written += 1;
    }
    return written;
  }
}

export const _internals = { foldSafetyRows, SAFETY_EVENTS };
