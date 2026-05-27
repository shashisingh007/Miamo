/**
 * Daily AI Match worker.
 *
 * Picks the single best v4 aiMatch candidate per active user once per day
 * and writes the result into FeatureSnapshot.raw->'dailyMatch'.
 * The web app reads it via PrismaSignalReader.features() or a dedicated
 * lookup. No schema migration required.
 *
 * Gated by ALGO_V4_WORKERS_ENABLED (set by the entrypoint).
 *
 * Cadence:
 *   - INTERVAL_MS default 12h (so each user gets refreshed at least daily)
 *   - For each FeatureSnapshot updated in the last 7 days, sample up to
 *     CAND_POOL active peers, score with scoreAiPicksV4, store top-1.
 *
 * Memory budget: streams users in batches of 200; pool capped to 50 cands.
 */
import type { PrismaClient } from '@prisma/client';
import { PrismaSignalReader } from '../../shared/src/algo/signals';
import { scoreAiPicksV4 } from '../../shared/src/algo/aiPicks';

const INTERVAL_MS = Number(process.env.DAILY_MATCH_INTERVAL_MS || 12 * 60 * 60 * 1000);
const USER_LOOKBACK_DAYS = Number(process.env.DAILY_MATCH_USER_DAYS || 7);
const BATCH = Number(process.env.DAILY_MATCH_BATCH || 200);
const CAND_POOL = Number(process.env.DAILY_MATCH_POOL || 50);
const MIN_SCORE = Number(process.env.DAILY_MATCH_MIN_SCORE || 70);

type ActiveUser = { uidHash: string };

export class DailyMatchWorker {
  private timer: NodeJS.Timeout | null = null;
  constructor(private prisma: PrismaClient) {}

  start(): void {
    if (this.timer) return;
    // Stagger the first run by 60s so the worker doesn't thrash on boot.
    this.timer = setTimeout(() => {
      void this.tick();
      this.timer = setInterval(() => { void this.tick(); }, INTERVAL_MS);
    }, 60_000);
  }

  stop(): void {
    if (this.timer) { clearTimeout(this.timer); clearInterval(this.timer); this.timer = null; }
  }

  async tick(): Promise<void> {
    const t0 = Date.now();
    let processed = 0;
    let written = 0;
    try {
      const actives = (await this.prisma.$queryRawUnsafe(
        `SELECT "uidHash" FROM "FeatureSnapshot"
         WHERE "updatedAt" >= NOW() - ($1 || ' days')::interval
         LIMIT $2`,
        String(USER_LOOKBACK_DAYS), BATCH,
      )) as ActiveUser[];
      if (actives.length === 0) return;
      const reader = new PrismaSignalReader(this.prisma);
      for (const u of actives) {
        processed += 1;
        const ok = await this.runFor(reader, u.uidHash).catch((e) => {
          // eslint-disable-next-line no-console
          console.warn('[daily-match] user failed:', u.uidHash, (e as Error).message);
          return false;
        });
        if (ok) written += 1;
      }
    } finally {
      // eslint-disable-next-line no-console
      console.log(`[daily-match] tick processed=${processed} written=${written} ms=${Date.now() - t0}`);
    }
  }

  /** Score top candidates for one user; write the best (>=MIN_SCORE) to FeatureSnapshot.raw. */
  private async runFor(reader: PrismaSignalReader, myHash: string): Promise<boolean> {
    const me = await reader.features(myHash);
    if (!me) return false;

    // Use PairCompatCache as the candidate pool — these are the users compat-v2
    // already considers a viable match. Avoids a second cross-join.
    const pool = (await this.prisma.$queryRawUnsafe(
      `SELECT "bHash" FROM "PairCompatCache"
       WHERE "aHash" = $1 ORDER BY "finalScore" DESC LIMIT $2`,
      myHash, CAND_POOL,
    )) as Array<{ bHash: string }>;
    if (pool.length === 0) return false;

    const candHashes = pool.map((p) => p.bHash);
    const pairMap = await reader.pairCompat(myHash, candHashes);
    const priorMap = await reader.priorTargets(myHash, candHashes, 14);

    let best: { hash: string; score: number; explain: unknown } | null = null;
    for (const h of candHashes) {
      const cand = await reader.features(h);
      const { score, explain } = scoreAiPicksV4({
        me, cand,
        myIntent: null, candIntent: null,
        myAge: null, candAge: null, cityKm: null,
        myInterests: [], candInterests: [],
        pair: pairMap.get(h),
        priorCount: priorMap.get(h) || 0,
        impressionsLast48h: 0,
        consent: 'full',
        subs: { cf: 50, active: 50, serious: 50, matchHistoryAffinity: 50, vibeMomentum: 50 },
        rand: () => 1,
      });
      if (score < MIN_SCORE) continue;
      if (!best || score > best.score) best = { hash: h, score, explain };
    }
    if (!best) return false;

    await this.prisma.$executeRawUnsafe(
      `UPDATE "FeatureSnapshot"
         SET "raw" = COALESCE("raw", '{}'::jsonb) || jsonb_build_object(
           'dailyMatch', jsonb_build_object(
             'bHash', $2::text,
             'score', $3::float,
             'computedAt', NOW(),
             'algo', 'aiPicks-v4',
             'explain', $4::jsonb
           )
         )
       WHERE "uidHash" = $1`,
      myHash, best.hash, best.score, JSON.stringify(best.explain),
    );
    return true;
  }
}
