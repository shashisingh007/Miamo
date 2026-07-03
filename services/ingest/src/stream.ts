import Redis from 'ioredis';

/**
 * Thin wrapper around a Redis client used as the hot path for raw events.
 *
 * Events are XADD'd to `events:raw` with MAXLEN ~ STREAM_MAXLEN (approximate
 * trimming), and downstream rollup workers consume with consumer groups.
 * On Redis outage we fall back to logging — no synchronous write to Postgres
 * from the request path, ever.
 */

const STREAM_KEY = process.env.TRACKING_STREAM_KEY || 'events:raw';
const STREAM_MAXLEN = Number(process.env.TRACKING_STREAM_MAXLEN || 10_000_000);

let client: Redis | null = null;
let lastErrLog = 0;

function getClient(): Redis | null {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      enableOfflineQueue: false,
      connectTimeout: 1500,
    });
    client.on('error', (e) => {
      const now = Date.now();
      if (now - lastErrLog > 15_000) {
        lastErrLog = now;
        // eslint-disable-next-line no-console
        console.warn('[ingest] redis error:', (e as Error).message);
      }
    });
    return client;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[ingest] redis init failed:', (e as Error).message);
    return null;
  }
}

export type StreamRecord = {
  uidHash: string;
  did: string;
  sid: string;
  ts: number;
  evt: string;
  payload: string; // JSON
};

export async function pushEvents(records: StreamRecord[]): Promise<number> {
  const c = getClient();
  if (!c) return 0;
  const pipeline = c.pipeline();
  for (const r of records) {
    pipeline.xadd(
      STREAM_KEY,
      'MAXLEN',
      '~',
      String(STREAM_MAXLEN),
      '*',
      'uidHash', r.uidHash,
      'did',     r.did,
      'sid',     r.sid,
      'ts',      String(r.ts),
      'evt',     r.evt,
      'p',       r.payload,
    );
  }
  try {
    await pipeline.exec();
    return records.length;
  } catch (e) {
    const now = Date.now();
    if (now - lastErrLog > 15_000) {
      lastErrLog = now;
      // eslint-disable-next-line no-console
      console.warn('[ingest] xadd failed:', (e as Error).message);
    }
    return 0;
  }
}

export async function closeStream(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
