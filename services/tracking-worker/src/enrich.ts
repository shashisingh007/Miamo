/**
 * Enrichment loop — adds peakHours + cadenceVec + dtmVec to each
 * FeatureSnapshot.raw JSON. These derived signals back the notifyTiming,
 * cadenceOverlap, and dtm algorithms.
 *
 * Runs every 30 minutes by default. Lightweight: a single SELECT per
 * signal, then a JSON merge on FeatureSnapshot.raw — no schema changes.
 *
 * Honors TRACKING_KILL=1 (the entrypoint already gates `start()`).
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.ENRICH_INTERVAL_MS || 30 * 60 * 1000);
const PEAK_TOP_N = Number(process.env.ENRICH_PEAK_TOP_N || 6);
const PEAK_LOOKBACK_DAYS = Number(process.env.ENRICH_PEAK_DAYS || 7);
const CADENCE_LOOKBACK_DAYS = Number(process.env.ENRICH_CADENCE_DAYS || 14);
const DTM_LOOKBACK_DAYS = Number(process.env.ENRICH_DTM_DAYS || 90);

// 16 canonical DTM topics keyed by simple keyword stems.
const DTM_TOPIC_KEYWORDS: ReadonlyArray<readonly string[]> = [
  ['value', 'belief'],     // 0 values
  ['eat', 'sleep', 'gym', 'workout', 'diet'], // 1 lifestyle
  ['talk', 'communicat'],  // 2 communication
  ['kiss', 'sex', 'touch', 'intimate'], // 3 intimacy
  ['family', 'parent', 'sibling'],      // 4 family
  ['money', 'budget', 'save', 'spend'], // 5 finance
  ['argue', 'fight', 'conflict'],       // 6 conflict
  ['grow', 'learn', 'goal'],            // 7 growth
  ['movie', 'music', 'travel', 'game', 'book'], // 8 leisure
  ['god', 'faith', 'religi', 'spirit'], // 9 faith
  ['career', 'ambit', 'work'],          // 10 ambition
  ['space', 'alone', 'independ'],       // 11 autonomy
  ['friend', 'party', 'social'],        // 12 social
  ['health', 'doctor', 'medical'],      // 13 health
  ['kid', 'child', 'baby'],             // 14 parenting
  ['future', 'plan', 'marriage'],       // 15 future
];

function l2Normalize(v: Float32Array): Float32Array {
  let s = 0; for (const x of v) s += x * x;
  if (s === 0) return v;
  const inv = 1 / Math.sqrt(s);
  for (let i = 0; i < v.length; i++) v[i] *= inv;
  return v;
}

function f32ToBase64(v: Float32Array): string {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64');
}

export class EnrichmentWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private prisma: PrismaClient) {}

  start(): void {
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[enrich] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<{ peak: number; cadence: number; dtm: number }> {
    const peak = await this.refreshPeakHours();
    const cadence = await this.refreshCadenceVec();
    const dtm = await this.refreshDtmVec();
    return { peak, cadence, dtm };
  }

  /** Top-N hours by heartbeat density over the last PEAK_LOOKBACK_DAYS. */
  async refreshPeakHours(): Promise<number> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash", "hour", SUM("count")::int AS c
       FROM "EventAggHourly"
       WHERE "evt" = 'session.heartbeat'
         AND "hour" >= NOW() - ($1 || ' days')::interval
       GROUP BY "uidHash", "hour"`,
      String(PEAK_LOOKBACK_DAYS),
    )) as Array<{ uidHash: string; hour: Date; c: number }>;

    const byUser = new Map<string, Map<number, number>>();
    for (const r of rows) {
      const h = new Date(r.hour).getUTCHours();
      let m = byUser.get(r.uidHash);
      if (!m) { m = new Map(); byUser.set(r.uidHash, m); }
      m.set(h, (m.get(h) || 0) + Number(r.c));
    }

    let written = 0;
    for (const [uidHash, hist] of byUser) {
      const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, PEAK_TOP_N).map(([h]) => h);
      await this.prisma.$executeRawUnsafe(
        `UPDATE "FeatureSnapshot"
            SET "raw" = COALESCE("raw", '{}'::jsonb) || jsonb_build_object('peakHours', $2::jsonb),
                "computedAt" = NOW()
          WHERE "uidHash" = $1`,
        uidHash, JSON.stringify(top),
      );
      written += 1;
    }
    return written;
  }

  /** 24-bin normalized histogram of all-evt activity over the last window. */
  async refreshCadenceVec(): Promise<number> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "uidHash", EXTRACT(HOUR FROM "hour")::int AS h, SUM("count")::int AS c
       FROM "EventAggHourly"
       WHERE "hour" >= NOW() - ($1 || ' days')::interval
       GROUP BY "uidHash", h`,
      String(CADENCE_LOOKBACK_DAYS),
    )) as Array<{ uidHash: string; h: number; c: number }>;

    const byUser = new Map<string, Float32Array>();
    for (const r of rows) {
      let v = byUser.get(r.uidHash);
      if (!v) { v = new Float32Array(24); byUser.set(r.uidHash, v); }
      v[r.h] += Number(r.c);
    }

    let written = 0;
    for (const [uidHash, vec] of byUser) {
      l2Normalize(vec);
      await this.prisma.$executeRawUnsafe(
        `UPDATE "FeatureSnapshot"
            SET "raw" = COALESCE("raw", '{}'::jsonb) || jsonb_build_object('cadenceVec', $2::jsonb),
                "computedAt" = NOW()
          WHERE "uidHash" = $1`,
        uidHash, JSON.stringify(f32ToBase64(vec)),
      );
      written += 1;
    }
    return written;
  }

  /**
   * Build a 16-dim DTM topic vector from DtmMessage bodies via cheap keyword
   * matching. NOT a tokeniser — just substring counting. Output is l2-norm.
   */
  async refreshDtmVec(): Promise<number> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "senderId", LOWER("message") AS msg
       FROM "DtmMessage"
       WHERE "createdAt" >= NOW() - ($1 || ' days')::interval`,
      String(DTM_LOOKBACK_DAYS),
    )) as Array<{ senderId: string; msg: string }>;

    // userId → 16-dim
    const byUser = new Map<string, Float32Array>();
    for (const r of rows) {
      let v = byUser.get(r.senderId);
      if (!v) { v = new Float32Array(16); byUser.set(r.senderId, v); }
      for (let t = 0; t < DTM_TOPIC_KEYWORDS.length; t++) {
        for (const kw of DTM_TOPIC_KEYWORDS[t]) {
          if (r.msg.includes(kw)) { v[t] += 1; break; }
        }
      }
    }
    if (byUser.size === 0) return 0;

    // Translate userId → uidHash via FeatureSnapshot via the hash helper.
    // Cheaper: ask Prisma for users in pool and hash here.
    // Lazy import to keep worker tsconfig boundary clean.
    const { hashUid } = await import('../../shared/src/track/hash');

    let written = 0;
    for (const [userId, vec] of byUser) {
      l2Normalize(vec);
      const uidHash = hashUid(userId);
      await this.prisma.$executeRawUnsafe(
        `UPDATE "FeatureSnapshot"
            SET "raw" = COALESCE("raw", '{}'::jsonb) || jsonb_build_object('dtmVec', $2::jsonb),
                "computedAt" = NOW()
          WHERE "uidHash" = $1`,
        uidHash, JSON.stringify(f32ToBase64(vec)),
      );
      written += 1;
    }
    return written;
  }
}

export const _internals = { DTM_TOPIC_KEYWORDS, l2Normalize, f32ToBase64 };
