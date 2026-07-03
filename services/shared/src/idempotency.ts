// ─── Idempotency middleware (lightweight) ────────────────────────────
// Optional middleware that, when the caller sends an `Idempotency-Key`
// header, atomically reserves the key in Redis (SET NX with a TTL).
// On collision (same key + same user replayed within the window) we
// respond 409 IDEMPOTENCY_REPLAY.
//
// This does NOT cache and replay the original response — it is purely
// a replay/duplicate-submission guard. Use on POST endpoints where the
// client retries on flaky networks (e.g. send-message, like, react)
// and the underlying handler is not yet naturally idempotent.
//
// If `REDIS_URL` is not configured the middleware no-ops silently —
// callers without the header are also ignored. Failures talking to
// Redis FAIL OPEN (request proceeds) so a flaky cache layer never
// hard-blocks a write.
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { createClient, type RedisClientType } from 'redis';
import { logger } from './logger';

interface AuthLike extends Request {
  userId?: string;
}

const SAFE_KEY = /^[A-Za-z0-9_\-]{8,128}$/;

let client: RedisClientType | null = null;
let connectAttempted = false;

async function getClient(): Promise<RedisClientType | null> {
  if (client) return client;
  if (connectAttempted) return null;
  connectAttempted = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const c: RedisClientType = createClient({ url });
    c.on('error', (err) => logger.warn('[idempotency] redis error', err?.message));
    await c.connect();
    client = c;
    return c;
  } catch (err) {
    logger.warn('[idempotency] redis unavailable, middleware will be a no-op', (err as Error).message);
    return null;
  }
}

export interface IdempotencyOptions {
  /** TTL for the reservation in seconds. Default: 24h. */
  ttlSeconds?: number;
  /** Namespace prefix for the Redis key. Default: "idem". */
  prefix?: string;
}

export function idempotency(opts: IdempotencyOptions = {}): RequestHandler {
  const ttl = opts.ttlSeconds ?? 24 * 60 * 60;
  const prefix = opts.prefix ?? 'idem';
  return async (req: AuthLike, res: Response, next: NextFunction) => {
    const raw = req.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key) return next();
    if (!SAFE_KEY.test(key)) {
      res.status(400).json({
        error: {
          message: 'Idempotency-Key must be 8-128 chars of [A-Za-z0-9_-]',
          code: 'INVALID_IDEMPOTENCY_KEY',
          statusCode: 400,
        },
      });
      return;
    }
    const c = await getClient();
    if (!c) return next(); // no Redis available — fail open
    const userPart = req.userId || req.ip || 'anon';
    const redisKey = `${prefix}:${userPart}:${key}`;
    try {
      // SET key 1 NX EX ttl — returns 'OK' on first insert, null on collision.
      const reserved = await c.set(redisKey, '1', { NX: true, EX: ttl });
      if (reserved !== 'OK') {
        res.status(409).json({
          error: {
            message: 'Duplicate request with the same Idempotency-Key',
            code: 'IDEMPOTENCY_REPLAY',
            statusCode: 409,
          },
        });
        return;
      }
    } catch (err) {
      logger.warn('[idempotency] redis SET NX failed, failing open', (err as Error).message);
    }
    next();
  };
}
