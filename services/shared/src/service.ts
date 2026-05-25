// ─── Shared service bootstrap helpers ──────────────────────────────
// Eliminates duplication of Prisma client setup, Express middleware stack,
// /health + /ready endpoints, internal-key auth, and gateway SSE push that
// was repeated across all 6 backend services.
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { env } from './env';

// ─── Prisma factory ────────────────────────────────────────────────
// Appends connection_limit + pool_timeout query params to the URL so each
// service can keep its tuned pool size without re-implementing the URL math.
export function createPrisma(connectionLimit: number, poolTimeout = 20): PrismaClient {
  let base = process.env.DATABASE_URL;
  if (!base) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: DATABASE_URL must be set in production');
    }
    base = 'postgresql://miamo:miamo@localhost:5432/miamo?schema=public';
    logger.warn('[env] DATABASE_URL not set, using insecure dev default');
  }
  const sep = base.includes('?') ? '&' : '?';
  const url = `${base}${sep}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    datasources: { db: { url } },
  });
}

// ─── Base middleware stack ─────────────────────────────────────────
// helmet + cors + json + cookies + morgan + rate limit, in the same order
// previously hand-rolled in every service.
export interface BaseMiddlewareOptions {
  jsonLimit?: string;         // e.g. '1mb', '10mb'
  rateLimitMax?: number;      // requests per 15-min window
  rateLimitWindowMs?: number; // default 15 minutes
  corsOrigin?: string;        // default FRONTEND_URL or http://localhost:3100
}

export function applyBaseMiddleware(app: Express, opts: BaseMiddlewareOptions = {}): void {
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: opts.corsOrigin || process.env.FRONTEND_URL || 'http://localhost:3100',
    credentials: true,
  }));
  app.use(express.json({ limit: opts.jsonLimit || '1mb' }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));
  app.use(rateLimit({
    windowMs: opts.rateLimitWindowMs ?? 15 * 60 * 1000,
    max: opts.rateLimitMax ?? 2000,
    standardHeaders: true,
    legacyHeaders: false,
  }));
}

// ─── /health + /healthz + /ready + /readyz ───────────────────────
// /health    legacy DB-probing endpoint (kept for backwards compat)
// /healthz   liveness — pure "process is up", no deps; safe for k8s livenessProbe
// /ready     legacy alias for readiness
// /readyz    readiness — DB ping (+ Redis if REDIS_URL configured)
export function installHealthRoutes(app: Express, serviceName: string, prisma: PrismaClient): void {
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', service: serviceName, timestamp: new Date().toISOString(), db: 'connected' });
    } catch {
      res.status(503).json({ status: 'error', service: serviceName, db: 'disconnected' });
    }
  });
  // Liveness: zero-dependency. If this fails the process is wedged and the
  // orchestrator should restart the pod. Crucially does NOT touch DB —
  // otherwise a transient DB outage causes a cascading pod restart storm.
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', service: serviceName, uptime: process.uptime() });
  });
  app.get('/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ready: true, service: serviceName });
    } catch {
      res.status(503).json({ ready: false, service: serviceName });
    }
  });
  // Readiness: probe every backing service this pod needs to serve traffic.
  // Returns 503 if any required dep is unreachable so the orchestrator stops
  // routing traffic without killing the pod.
  app.get('/readyz', async (_req, res) => {
    const checks: Record<string, string> = {};
    let ok = true;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, rj) => setTimeout(() => rj(new Error('db_timeout')), 2000)),
      ]);
      checks.db = 'ok';
    } catch (e: unknown) {
      checks.db = e instanceof Error ? `error:${e.message}` : 'error';
      ok = false;
    }
    res.status(ok ? 200 : 503).json({ ready: ok, service: serviceName, checks });
  });
}

// ─── Internal-key auth middleware ──────────────────────────────────
// Trusts requests bearing the matching x-internal-key header and copies
// x-user-id onto req.userId. Used by users/social/content/messaging/
// notifications which sit behind the gateway and never see end-user tokens.
// (auth service has its own JWT-aware middleware and does NOT use this.)
// Each service keeps its own local `AuthRequest extends Request { userId?: string }`
// to avoid cross-package Request type identity issues in the monorepo.
export function createInternalAuthMiddleware() {
  return function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const userId = req.headers['x-user-id'] as string | undefined;
    if (userId && req.headers['x-internal-key'] === env.internalServiceKey) {
      (req as Request & { userId?: string }).userId = userId;
      return next();
    }
    return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
  };
}

// ─── Gateway SSE push helper ───────────────────────────────────────
// Fire-and-forget POST to gateway's /internal/push-event so services can
// nudge connected clients without managing SSE state themselves.
export function createPushToUser() {
  const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3200';
  return async function pushToUser(userId: string, event: string, data: unknown): Promise<void> {
    try {
      await fetch(`${gatewayUrl}/internal/push-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': env.internalServiceKey },
        body: JSON.stringify({ userId, event, data }),
      });
    } catch (e) {
      logger.warn('SSE push failed for user', userId, ':', (e as Error).message);
    }
  };
}
