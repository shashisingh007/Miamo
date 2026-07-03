/**
 * FocusAffinityHourly writer — v6.5.
 *
 * Reads `focus.element` and `intent.dwell` rows from EventAggHourly and
 * projects them into per-(uidHash, route, elementId, hour) buckets in
 * the FocusAffinityHourly table. The web SDK is expected to attach
 * `meta.targets` keyed by elementId, and `meta.route` for the page.
 *
 * Default-OFF: set FOCUS_AFFINITY_ENABLED=1 to start the loop.
 * Idempotent on (uidHash, route, elementId, bucket).
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.FOCUS_AFFINITY_INTERVAL_MS || 5 * 60 * 1000);
const LOOKBACK_HOURS = Number(process.env.FOCUS_AFFINITY_LOOKBACK_HOURS || 3);
const ENABLED = process.env.FOCUS_AFFINITY_ENABLED === '1';

export type FocusHourRow = {
  uidHash: string;
  evt: string;
  bucket: Date;
  durSum: number;
  /** EventAggHourly.meta — { route?: string, targets?: Record<elementId,count> }. */
  meta: { route?: string; targets?: Record<string, number> } | null;
};

export type FocusAffinityUpsert = {
  uidHash: string;
  route: string;
  elementId: string;
  bucket: Date;
  focusCount: number;
  dwellSumMs: number;
};

/** Pure: groups focus/dwell rows into FocusAffinityHourly upserts.
 *  `focus.element` contributes focusCount; `intent.dwell` contributes
 *  dwellSumMs (durSum spread evenly across the row's targets). Caps each
 *  (uidHash, bucket) at MAX_KEYS_PER_BUCKET unique (route, elementId)
 *  to bound write amplification. */
export function foldFocusRows(
  rows: FocusHourRow[],
  maxKeysPerBucket = 256,
): FocusAffinityUpsert[] {
  const acc = new Map<string, FocusAffinityUpsert>();
  const perBucketCount = new Map<string, number>();

  for (const r of rows) {
    const route = r.meta?.route || 'unknown';
    const targets = r.meta?.targets;
    if (!targets) continue;
    const targetCount = Object.values(targets).reduce((s, n) => s + Number(n), 0);
    if (targetCount <= 0) continue;
    const dwellPerHit = r.evt === 'intent.dwell' ? r.durSum / targetCount : 0;
    const bucketKey = `${r.uidHash}|${r.bucket.toISOString()}`;
    let keysInBucket = perBucketCount.get(bucketKey) || 0;

    for (const [elementId, c] of Object.entries(targets)) {
      const k = `${r.uidHash}|${route}|${elementId}|${r.bucket.toISOString()}`;
      let cur = acc.get(k);
      if (!cur) {
        if (keysInBucket >= maxKeysPerBucket) continue; // shed new keys past cap
        cur = {
          uidHash: r.uidHash,
          route,
          elementId,
          bucket: r.bucket,
          focusCount: 0,
          dwellSumMs: 0,
        };
        acc.set(k, cur);
        keysInBucket += 1;
      }
      const n = Number(c);
      if (r.evt === 'focus.element') cur.focusCount += n;
      else if (r.evt === 'intent.dwell') cur.dwellSumMs += Math.round(dwellPerHit * n);
    }
    perBucketCount.set(bucketKey, keysInBucket);
  }
  return [...acc.values()];
}

export class FocusAffinityWorker {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {}

  start(): void {
    if (!ENABLED) return;
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[focus-affinity] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<number> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash","evt","bucket","durSum","meta"
       FROM "EventAggHourly"
       WHERE "evt" IN ('focus.element','intent.dwell')
         AND "bucket" >= NOW() - ($1 || ' hours')::interval
         AND "meta" ? 'targets'`,
      String(LOOKBACK_HOURS),
    )) as FocusHourRow[];
    const upserts = foldFocusRows(rows);
    let written = 0;
    for (const u of upserts) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "FocusAffinityHourly"
           ("uidHash","route","elementId","bucket","focusCount","dwellSumMs")
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT ("uidHash","route","elementId","bucket") DO UPDATE SET
           "focusCount" = EXCLUDED."focusCount",
           "dwellSumMs" = EXCLUDED."dwellSumMs"`,
        u.uidHash, u.route, u.elementId, u.bucket, u.focusCount, u.dwellSumMs,
      );
      written += 1;
    }
    return written;
  }
}

export const _internals = { foldFocusRows };
