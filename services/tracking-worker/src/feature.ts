/**
 * Feature aggregator: periodically reads recent `EventAggDaily` rows per
 * uidHash and derives a `FeatureSnapshot` (chronotype, attention profile,
 * rage-click rate, etc.). Lightweight signals only — heavier ML embeddings
 * are computed offline in Phase 3+.
 *
 * Runs every FEATURE_INTERVAL_MS; processes up to FEATURE_BATCH uidHashes
 * per tick (those with activity in the last 24h).
 */
import type { PrismaClient } from '@prisma/client';

const INTERVAL_MS = Number(process.env.FEATURE_INTERVAL_MS || 5 * 60 * 1000);
const BATCH = Number(process.env.FEATURE_BATCH || 200);

type HourRow = { uidHash: string; evt: string; bucket: Date; count: number; durSum: number };
type DayRow = { uidHash: string; evt: string; day: Date; count: number; durSum: number };

function chronotypeOf(rows: HourRow[]): string | null {
  if (rows.length === 0) return null;
  // Sum counts by hour-of-day across recent rows.
  const byHour = new Array(24).fill(0);
  for (const r of rows) byHour[r.bucket.getUTCHours()] += r.count;
  const total = byHour.reduce((a, b) => a + b, 0);
  if (total < 5) return null;
  const morning = byHour.slice(5, 12).reduce((a, b) => a + b, 0);
  const day = byHour.slice(12, 18).reduce((a, b) => a + b, 0);
  const evening = byHour.slice(18, 23).reduce((a, b) => a + b, 0);
  const night = byHour[23] + byHour.slice(0, 5).reduce((a, b) => a + b, 0);
  const peaks = [
    { name: 'morning', n: morning },
    { name: 'day', n: day },
    { name: 'evening', n: evening },
    { name: 'night', n: night },
  ].sort((a, b) => b.n - a.n);
  if (peaks[0].n / total > 0.45) return peaks[0].name;
  return 'mixed';
}

function attentionProfileOf(rows: DayRow[]): string | null {
  if (rows.length === 0) return null;
  const totalByEvt: Record<string, number> = {};
  for (const r of rows) totalByEvt[r.evt] = (totalByEvt[r.evt] || 0) + r.count;
  const reads = (totalByEvt['dwell'] || 0) + (totalByEvt['legacy.page_dwell'] || 0);
  const scrolls = totalByEvt['scroll.depth'] || 0;
  const voice = (totalByEvt['msg.voice_record'] || 0) + (totalByEvt['beats.play'] || 0);
  const visual = (totalByEvt['album.view'] || 0) + (totalByEvt['discover.card_view'] || 0);
  const all = reads + scrolls + voice + visual;
  if (all < 10) return null;
  const pick = [
    ['reader', reads],
    ['scanner', scrolls],
    ['voice-first', voice],
    ['visual', visual],
  ].sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  return pick[0] as string;
}

function rageRate(rows: DayRow[]): number | null {
  const clicks = rows.filter((r) => r.evt === 'click').reduce((a, b) => a + b.count, 0);
  const rage = rows.filter((r) => r.evt === 'click.rage').reduce((a, b) => a + b.count, 0);
  if (clicks < 20) return null;
  return Math.round((rage / clicks) * 1000) / 1000;
}

function deadRate(rows: DayRow[]): number | null {
  const clicks = rows.filter((r) => r.evt === 'click').reduce((a, b) => a + b.count, 0);
  const dead = rows.filter((r) => r.evt === 'click.dead').reduce((a, b) => a + b.count, 0);
  if (clicks < 20) return null;
  return Math.round((dead / clicks) * 1000) / 1000;
}

export class FeatureAggregator {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private prisma: PrismaClient) {}

  start(): void {
    this.timer = setInterval(() => {
      this.tick().catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('[feature] tick error:', (e as Error).message);
      });
    }, INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<number> {
    // Find uidHashes active in the last 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const actives = (await this.prisma.$queryRawUnsafe(
      `SELECT DISTINCT "uidHash" FROM "EventAggDaily" WHERE "day" >= $1 LIMIT $2`,
      since, BATCH,
    )) as Array<{ uidHash: string }>;
    let processed = 0;
    for (const { uidHash } of actives) {
      if (!uidHash) continue;
      try {
        const hours = (await this.prisma.$queryRawUnsafe(
          `SELECT "uidHash","evt","bucket","count","durSum"
           FROM "EventAggHourly"
           WHERE "uidHash" = $1 AND "bucket" >= NOW() - INTERVAL '14 days'`,
          uidHash,
        )) as HourRow[];
        const days = (await this.prisma.$queryRawUnsafe(
          `SELECT "uidHash","evt","day","count","durSum"
           FROM "EventAggDaily"
           WHERE "uidHash" = $1 AND "day" >= NOW() - INTERVAL '30 days'`,
          uidHash,
        )) as DayRow[];
        const chronotype = chronotypeOf(hours);
        const attention = attentionProfileOf(days);
        const rage = rageRate(days);
        const dead = deadRate(days);
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "FeatureSnapshot"
             ("uidHash","computedAt","chronotype","attentionProfile","rageClickRate","deadClickRate","raw")
           VALUES ($1, NOW(), $2, $3, $4, $5, '{}'::jsonb)
           ON CONFLICT ("uidHash") DO UPDATE SET
             "computedAt"       = NOW(),
             "chronotype"       = EXCLUDED."chronotype",
             "attentionProfile" = EXCLUDED."attentionProfile",
             "rageClickRate"    = EXCLUDED."rageClickRate",
             "deadClickRate"    = EXCLUDED."deadClickRate"`,
          uidHash, chronotype, attention, rage, dead,
        );
        processed += 1;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[feature] uidHash failed:', uidHash, (e as Error).message);
      }
    }
    return processed;
  }
}

export const _internals = { chronotypeOf, attentionProfileOf, rageRate, deadRate };
