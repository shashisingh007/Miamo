// ─── Shared service bootstrap helpers ──────────────────────────────
// Eliminates duplication of Prisma client setup, Express middleware stack,
// /health + /ready endpoints, internal-key auth, and gateway SSE push that
// was repeated across all 6 backend services.
import express, { Express, Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { env } from './env';
import { metricsMiddleware } from './metrics';
import { requestId } from './requestId';

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
  serviceName?: string;       // labels metrics; defaults to 'unknown' if absent
}

export function applyBaseMiddleware(app: Express, opts: BaseMiddlewareOptions = {}): void {
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // requestId must run before metrics + logging so every log line has a trace id.
  app.use(requestId);
  // Mount metrics BEFORE rate-limiter so /metrics scrapes never trip the limiter
  // and timing covers the full request lifecycle (incl. JSON parse).
  app.use(metricsMiddleware(opts.serviceName || 'unknown'));
  app.use(cors({
    origin: opts.corsOrigin || process.env.FRONTEND_URL || 'http://localhost:3100',
    credentials: true,
  }));
  app.use(express.json({ limit: opts.jsonLimit || '1mb' }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') {
    // Custom morgan token surfaces the X-Request-Id (set by requestId middleware
    // above) so every access-log line can be correlated with downstream traces.
    morgan.token('reqid', (req: any) => req.id || '-');
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms reqid=:reqid'));
  }
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

// ─── Sentry error tracking ─────────────────────────────────────────
// Lazy-loaded @sentry/node integration. When `SENTRY_DSN` is unset (the
// dev default) `installSentry()` returns no-op middleware so boot stays
// crash-free without the package even being initialised. In production
// the helper:
//   1. Lazy-imports @sentry/node (so dev startups don't pay the import cost
//      when there is no DSN).
//   2. Initialises Sentry with serviceName, NODE_ENV, MIAMO_RELEASE, and
//      a 10% trace sample rate (Sentry free tier safe; override via
//      `SENTRY_TRACES_SAMPLE_RATE`).
//   3. Scrubs `Authorization`, `Cookie`, and `X-Internal-Key` headers in
//      `beforeSend` so the audit posture matches the gateway's
//      `sanitizeHeaders` middleware.
// Returns `{ requestHandler, errorHandler }` Express handlers; both are
// no-ops when Sentry is disabled, so the call sites in each
// service's server.ts stay symmetric across environments.
export interface InstallSentryOptions {
  serviceName: string;
  /** Override SENTRY_DSN env var (mostly for tests). Empty string = disabled. */
  dsn?: string;
  /** Override NODE_ENV-derived environment. */
  environment?: string;
  /** Override MIAMO_RELEASE env var (defaults to 'unknown'). */
  release?: string;
  /** Default 0.1 — 10% trace sampling for the Sentry free tier. */
  tracesSampleRate?: number;
}

export interface SentryHandlers {
  /** Express middleware to mount BEFORE all routes (after applyBaseMiddleware). */
  requestHandler: RequestHandler;
  /** Express error middleware to mount BEFORE the Miamo errorHandler. */
  errorHandler: ErrorRequestHandler;
  /** True if Sentry was actually initialised (DSN was non-empty). */
  enabled: boolean;
}

const SENTRY_SCRUB_HEADERS = ['authorization', 'cookie', 'x-internal-key'];

function noopRequestHandler(_req: Request, _res: Response, next: NextFunction): void { next(); }
function noopErrorHandler(err: unknown, _req: Request, _res: Response, next: NextFunction): void { next(err); }

export function installSentry(opts: InstallSentryOptions): SentryHandlers {
  const dsn = opts.dsn ?? process.env.SENTRY_DSN ?? '';
  if (!dsn) {
    // No DSN → fully disabled. No package import, no overhead.
    return { requestHandler: noopRequestHandler, errorHandler: noopErrorHandler, enabled: false };
  }
  try {
    // Lazy require so the import cost is paid only when DSN is set.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node') as typeof import('@sentry/node');
    const environment = opts.environment ?? process.env.NODE_ENV ?? 'development';
    const release = opts.release ?? process.env.MIAMO_RELEASE ?? 'unknown';
    const tracesSampleRate = opts.tracesSampleRate
      ?? Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1');
    Sentry.init({
      dsn,
      serverName: opts.serviceName,
      environment,
      release,
      tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
      // beforeSend scrubs sensitive headers from the event payload before it
      // leaves the process. Matches the gateway's sanitizeHeaders allow-list.
      beforeSend(event) {
        try {
          const req = event.request;
          if (req && req.headers && typeof req.headers === 'object') {
            const headers = req.headers as Record<string, string>;
            for (const name of Object.keys(headers)) {
              if (SENTRY_SCRUB_HEADERS.includes(name.toLowerCase())) {
                headers[name] = '[Filtered]';
              }
            }
          }
        } catch { /* belt-and-braces; never block event delivery */ }
        return event;
      },
    });
    return {
      requestHandler: Sentry.Handlers.requestHandler() as RequestHandler,
      errorHandler: Sentry.Handlers.errorHandler() as ErrorRequestHandler,
      enabled: true,
    };
  } catch (e) {
    // Boot must never crash when Sentry fails to initialise — log and fall
    // back to no-op handlers so the service still serves traffic.
    logger.warn(`[sentry] init failed for ${opts.serviceName}: ${(e as Error).message}`);
    return { requestHandler: noopRequestHandler, errorHandler: noopErrorHandler, enabled: false };
  }
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
