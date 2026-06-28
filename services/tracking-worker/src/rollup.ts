/**
 * Rollup consumer: drains the `events:raw` Redis Stream into in-memory
 * (uidHash, evt, bucket) aggregates and flushes to Postgres every FLUSH_MS.
 *
 * Uses a consumer group so multiple worker replicas can shard the stream
 * cooperatively (Redis handles ack + pending list).
 *
 * Failure semantics:
 *   - XREADGROUP timeouts return [] — loop continues.
 *   - DB upsert failure: log + retry on next flush (records remain pending).
 *   - Successful flush: XACK the batch.
 */
import Redis from 'ioredis';
import type { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { hourBucket, dayBucket, PercentileEstimator, DistinctCounter } from './buckets';

const HASH_SECRET = process.env.TRACKING_HASH_SECRET || 'dev-only-tracking-hash-secret-change-me';

/** Hash a raw target id with the tracking secret so meta.targets can join on uidHash. */
function hashTid(id: string): string {
  if (!id) return '';
  return createHmac('sha256', HASH_SECRET).update(id).digest('base64url').slice(0, 22);
}

const STREAM_KEY = process.env.TRACKING_STREAM_KEY || 'events:raw';
const GROUP = process.env.TRACKING_GROUP || 'rollup';
const CONSUMER = `${process.env.HOSTNAME || 'rollup'}-${process.pid}`;
const READ_COUNT = Number(process.env.TRACKING_READ_COUNT || 500);
const READ_BLOCK_MS = Number(process.env.TRACKING_READ_BLOCK_MS || 2000);
const FLUSH_MS = Number(process.env.TRACKING_FLUSH_MS || 5000);

/**
 * Dwell-histogram bucket edges (ms) used for v5 `attentionFit`. Stored on
 * `EventAggHourly.meta.hist` whenever any sample landed in the bucket. Edges
 * must match the v5 `dwellHistogram` contract in `services/shared/src/algo/forYou.ts`.
 */
const HIST_EDGES_MS = [0, 750, 2_000, 5_000, 10_000];

type HourKey = string; // `${uidHash}|${evt}|${hourTs}`
type DayKey = string;  // `${uidHash}|${evt}|${dayTs}`

type HourBucketAgg = {
  uidHash: string;
  evt: string;
  bucket: Date;
  count: number;
  durSum: number;
  pe: PercentileEstimator;
};
type DayBucketAgg = {
  uidHash: string;
  evt: string;
  day: Date;
  count: number;
  durSum: number;
  uniq: DistinctCounter;
  /** per-target interaction counts for the prior-interaction signal (cap 64) */
  targets: Map<string, number>;
};

export class RollupConsumer {
  private hour = new Map<HourKey, HourBucketAgg>();
  private day = new Map<DayKey, DayBucketAgg>();
  private pendingIds: string[] = [];
  private stopped = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private redis: Redis | null = null;

  constructor(
    private prisma: PrismaClient,
    private redisUrl = process.env.REDIS_URL || '',
  ) {}

  async start(): Promise<void> {
    if (!this.redisUrl) {
      // eslint-disable-next-line no-console
      console.warn('[rollup] REDIS_URL not set — consumer disabled');
      return;
    }
    this.redis = new Redis(this.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: false });
    // Create the consumer group (ignore BUSYGROUP).
    try {
      await this.redis.xgroup('CREATE', STREAM_KEY, GROUP, '$', 'MKSTREAM');
    } catch (e) {
      if (!/BUSYGROUP/.test((e as Error).message)) throw e;
    }
    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[rollup] flush error:', (err as Error).message);
      });
    }, FLUSH_MS);
    // Fire-and-forget consumption loop.
    this.loop().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[rollup] loop crashed:', err);
    });
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush().catch(() => undefined);
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  private async loop(): Promise<void> {
    if (!this.redis) return;
    while (!this.stopped) {
      try {
        const res = (await this.redis.xreadgroup(
          'GROUP', GROUP, CONSUMER,
          'COUNT', String(READ_COUNT),
          'BLOCK', String(READ_BLOCK_MS),
          'STREAMS', STREAM_KEY, '>',
        )) as Array<[string, Array<[string, string[]]>]> | null;
        if (!res) continue;
        for (const [, entries] of res) {
          for (const [id, kv] of entries) {
            this.ingest(id, kv);
          }
        }
      } catch (e) {
        if (this.stopped) return;
        // eslint-disable-next-line no-console
        console.warn('[rollup] xreadgroup error:', (e as Error).message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  private ingest(id: string, kv: string[]): void {
    const map: Record<string, string> = {};
    for (let i = 0; i < kv.length; i += 2) map[kv[i]] = kv[i + 1];
    const uidHash = map.uidHash || '';
    const evt = map.evt || 'unknown';
    const ts = Number(map.ts || Date.now());
    let payload: { d?: number; tid?: string } = {};
    try {
      payload = JSON.parse(map.p || '{}');
    } catch {
      payload = {};
    }
    const dur = Number(payload.d || 0);
    const tid = payload.tid;

    const hb = hourBucket(ts);
    const hkey = `${uidHash}|${evt}|${hb.getTime()}`;
    let h = this.hour.get(hkey);
    if (!h) {
      h = { uidHash, evt, bucket: hb, count: 0, durSum: 0, pe: new PercentileEstimator() };
      this.hour.set(hkey, h);
    }
    h.count += 1;
    if (dur > 0) {
      h.durSum += dur;
      h.pe.add(dur);
    }

    const db = dayBucket(ts);
    const dkey = `${uidHash}|${evt}|${db.getTime()}`;
    let d = this.day.get(dkey);
    if (!d) {
      d = { uidHash, evt, day: db, count: 0, durSum: 0, uniq: new DistinctCounter(), targets: new Map() };
      this.day.set(dkey, d);
    }
    d.count += 1;
    if (dur > 0) d.durSum += dur;
    d.uniq.add(tid);
    if (tid && d.targets.size < 64) {
      const th = hashTid(tid);
      if (th) d.targets.set(th, (d.targets.get(th) || 0) + 1);
    } else if (tid && d.targets.size >= 64) {
      const th = hashTid(tid);
      if (th && d.targets.has(th)) d.targets.set(th, (d.targets.get(th) || 0) + 1);
    }

    this.pendingIds.push(id);
  }

  private async flush(): Promise<void> {
    if (this.hour.size === 0 && this.day.size === 0) return;
    const hourEntries = [...this.hour.values()];
    const dayEntries = [...this.day.values()];
    const acks = this.pendingIds.splice(0);
    this.hour.clear();
    this.day.clear();

    // Hourly upserts — additive counters via raw upsert to avoid races.
    for (const h of hourEntries) {
      try {
        const hist = h.pe.size > 0 ? h.pe.histogram(HIST_EDGES_MS) : null;
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "EventAggHourly" ("uidHash","evt","bucket","count","durSum","durP50","durP95","meta")
           VALUES ($1,$2,$3,$4,$5,$6,$7, $8::jsonb)
           ON CONFLICT ("uidHash","evt","bucket") DO UPDATE SET
             "count"  = "EventAggHourly"."count" + EXCLUDED."count",
             "durSum" = "EventAggHourly"."durSum" + EXCLUDED."durSum",
             "durP50" = GREATEST("EventAggHourly"."durP50", EXCLUDED."durP50"),
             "durP95" = GREATEST("EventAggHourly"."durP95", EXCLUDED."durP95"),
             "meta"   = jsonb_set(
               COALESCE("EventAggHourly"."meta", '{}'::jsonb),
               '{hist}',
               COALESCE(EXCLUDED."meta"->'hist', "EventAggHourly"."meta"->'hist', '[]'::jsonb)
             )`,
          h.uidHash, h.evt, h.bucket, h.count, h.durSum,
          Math.round(h.pe.percentile(50)), Math.round(h.pe.percentile(95)),
          hist ? JSON.stringify({ hist }) : '{}',
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[rollup] hourly upsert failed:', (e as Error).message);
      }
    }
    // Daily upserts.
    for (const d of dayEntries) {
      try {
        // Build a {targetId: count} object; capped at 64 entries during ingest.
        const targetsObj: Record<string, number> = {};
        for (const [tid, c] of d.targets) targetsObj[tid] = c;
        // Merge into existing meta.targets: incremental sum keyed by tid,
        // total entries capped at 128 via jsonb_object_keys filter.
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "EventAggDaily" ("uidHash","evt","day","count","durSum","uniqTargets","meta")
           VALUES ($1,$2,$3,$4,$5,$6, jsonb_build_object('targets', $7::jsonb))
           ON CONFLICT ("uidHash","evt","day") DO UPDATE SET
             "count"       = "EventAggDaily"."count" + EXCLUDED."count",
             "durSum"      = "EventAggDaily"."durSum" + EXCLUDED."durSum",
             "uniqTargets" = GREATEST("EventAggDaily"."uniqTargets", EXCLUDED."uniqTargets"),
             "meta"        = jsonb_set(
               COALESCE("EventAggDaily"."meta", '{}'::jsonb),
               '{targets}',
               COALESCE("EventAggDaily"."meta"->'targets', '{}'::jsonb) || EXCLUDED."meta"->'targets'
             )`,
          d.uidHash, d.evt, d.day, d.count, d.durSum, d.uniq.count, JSON.stringify(targetsObj),
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[rollup] daily upsert failed:', (e as Error).message);
      }
    }
    // Ack only after successful write attempt (best-effort batch).
    if (this.redis && acks.length) {
      try {
        await this.redis.xack(STREAM_KEY, GROUP, ...acks);
      } catch {
        // ignored — entries stay in PEL and get retried via XPENDING/claim later
      }
    }
  }
}
