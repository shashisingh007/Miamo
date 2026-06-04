// ─── Miamo API Gateway ───────────────────────────────
// Instagram-style API Gateway — routes to microservices
// Handles: rate limiting, CORS, auth validation, routing, SSE real-time, security
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import compression from 'compression';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import { logger } from '../../shared/src/logger';
import { metricsMiddleware } from '../../shared/src/metrics';
import { requestId } from '../../shared/src/requestId';
import { env } from '../../shared/src/env';

const app = express();
const PORT = parseInt(process.env.PORT || '3200', 10);
const JWT_SECRET = env.jwtSecret;
const INTERNAL_KEY = env.internalServiceKey;

// ═══ Redis store for distributed rate limiting ═══════
// When REDIS_URL is set, rate-limit counters are kept in Redis so all gateway
// replicas share the same window. Without Redis, each replica keeps its own
// in-memory counters (fine for single-process dev/test, BYPASSABLE in prod
// with >1 replica — set REDIS_URL in any multi-replica deployment).
let redisStore: RedisStore | undefined;
let authRedisStore: RedisStore | undefined;
let sensitiveRedisStore: RedisStore | undefined;
if (process.env.REDIS_URL) {
  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => logger.warn('Redis rate-limit client error:', err.message));
  redisClient.connect().then(
    () => logger.info('Rate-limit Redis store connected'),
    (err) => logger.warn('Rate-limit Redis store failed to connect (falling back to memory):', err.message),
  );
  // Separate key prefixes so the two limiters don't share counters
  redisStore = new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args), prefix: 'rl:global:' });
  authRedisStore = new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args), prefix: 'rl:auth:' });
  sensitiveRedisStore = new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args), prefix: 'rl:sensitive:' });
}

// ═══ SSE: Real-time event connections per user ═══════
// In-memory map of userId → Set of active SSE response objects.
// Uses a Set per user to support multi-tab: one user can have multiple browser
// tabs open, each with its own EventSource connection, and all receive events.
const sseClients = new Map<string, Set<express.Response>>();

/**
 * Push a server-sent event to all active SSE connections for a user.
 * Called by microservices via the /internal/push-event endpoint.
 * Failed writes (broken connections) are automatically cleaned up.
 */
export function pushEvent(userId: string, event: string, data: any) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  // SSE wire format: "event: <name>\ndata: <json>\n\n"
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); } // Dead connection cleanup
  }
}

// Internal endpoint for microservices to push events
// Note: do NOT add global express.json() — it interferes with http-proxy-middleware

// ─── Service URLs ────────────────────────────────────
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3201',
  users: process.env.USER_SERVICE_URL || 'http://localhost:3202',
  social: process.env.SOCIAL_SERVICE_URL || 'http://localhost:3203',
  messaging: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3204',
  content: process.env.CONTENT_SERVICE_URL || 'http://localhost:3205',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3206',
  ingest: process.env.INGEST_SERVICE_URL || 'http://localhost:3260',
};

// ─── Security: Enhanced Helmet CSP ───────────────────
// Gateway serves JSON + SSE only — no HTML. Strict CSP is safe and blocks any
// accidental script/style injection via reflected error pages.
app.use(metricsMiddleware('gateway'));
app.use(requestId);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));

// ─── Security: Strict CORS ──────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3100').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || (process.env.NODE_ENV === 'development' && process.env.CORS_BYPASS === 'true')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400, // Preflight cache 24h
}));

// ─── Performance: Response Compression ──────────────
// Only compress non-proxy responses (health, SSE, internal)
app.use(compression({ filter: (req) => !req.originalUrl.startsWith('/api/v1/') }));

app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// ─── Security: Request Size Limits ──────────────────
// Limit body parsing for internal routes only (proxy handles its own)
const internalBodyParser = express.json({ limit: '1mb' });

// ─── Security: Request ID Tracking ──────────────────
app.use((req, _res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  next();
});

// ─── Rate Limiting: User-aware + IP-based ───────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return (req.headers['x-user-id'] as string) || req.ip || 'unknown';
  },
});
app.use(globalLimiter);

// Auth-specific stricter rate limit. Strict in prod (brute-force defense),
// generous in dev/test so iterative login/register cycles don't trip it.
const IS_PROD = process.env.NODE_ENV === 'production';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 30 : 500,
  message: { error: { message: 'Too many auth attempts. Please try again later.', code: 'RATE_LIMITED' } },
  store: authRedisStore,
  keyGenerator: (req) => req.ip || 'unknown',
  skipSuccessfulRequests: !IS_PROD,
});

// Sensitive-action limiter: forgot-password, /auth/refresh abuse, report spam.
// Tighter than authLimiter, also IP-keyed so a hostile client can't burn
// through email-delivery quota or SMS-cost for a victim address.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  message: { error: { message: 'Too many password reset requests. Try again later.', code: 'RATE_LIMITED' } },
  store: sensitiveRedisStore,
  keyGenerator: (req) => req.ip || 'unknown',
  skipSuccessfulRequests: false,
});
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 60 : 1000,
  message: { error: { message: 'Too many refresh attempts.', code: 'RATE_LIMITED' } },
  store: sensitiveRedisStore,
  keyGenerator: (req) => req.ip || 'unknown',
});
const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24h
  max: 30,
  message: { error: { message: 'Report quota reached for today.', code: 'RATE_LIMITED' } },
  store: sensitiveRedisStore,
  keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip || 'unknown',
});

// Expensive-query limiter: discover feed + user search both run heavy DB joins
// and an ML scoring pass. Cap at 20/min/user to prevent scraping & DoS.
const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: { message: 'Slow down. Too many requests.', code: 'RATE_LIMITED' } },
  store: sensitiveRedisStore,
  keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip || 'unknown',
});

// Feed/stories/videos/creativity limiter: lighter than discover but still bounded
// to prevent infinite-scroll abuse and content scraping. 60/min/user.
const feedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: { message: 'Slow down. Too many feed requests.', code: 'RATE_LIMITED' } },
  store: sensitiveRedisStore,
  keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip || 'unknown',
});

// ─── Security: Input Sanitization Middleware ─────────
function sanitizeHeaders(req: express.Request, _res: express.Response, next: express.NextFunction) {
  // Strip potentially dangerous headers from client requests
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-original-url'];
  delete req.headers['x-rewrite-url'];
  delete req.headers['x-forwarded-server'];
  delete req.headers['x-forwarded-proto'];
  // Validate authorization header format
  const auth = req.headers.authorization;
  if (auth && !auth.startsWith('Bearer ')) {
    delete req.headers.authorization;
  }
  // Reject excessively long authorization headers (max 2KB)
  if (auth && auth.length > 2048) {
    delete req.headers.authorization;
  }
  next();
}
app.use(sanitizeHeaders);

// ─── Auth Validation Middleware ───────────────────────
// Compact 3-segment JWT pre-check. Rejects junk like `Bearer xxx` or single-segment
// strings before jwt.verify(), eliminating one class of CPU-cheap probing.
const JWT_FORMAT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function extractUserId(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token && JWT_FORMAT.test(token)) {
    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string };
      // Pass user ID to downstream services
      req.headers['x-user-id'] = payload.userId;
      req.headers['x-internal-key'] = INTERNAL_KEY;
    } catch {
      // Token invalid — let downstream service handle 401
    }
  }
  next();
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.headers['x-user-id']) {
    return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
  }
  next();
}

// ─── v3.2 — Onboarding Gate ───────────────────────────
// Calls users service /api/v1/profiles/me/completion (60s in-memory cache per user)
// and returns 403 ONBOARDING_INCOMPLETE if score < required threshold (60 casual / 80 DTM).
// Designed to be cheap: only invoked on a small allowlist of gated routes.
interface CompletionCacheEntry { result: { score: number; missing: string[]; threshold: number; dtm: boolean }; expiresAt: number }
const completionCache = new Map<string, CompletionCacheEntry>();
const COMPLETION_TTL_MS = 60_000;

async function requireOnboarded(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });

  try {
    const cached = completionCache.get(userId);
    let result = cached && cached.expiresAt > Date.now() ? cached.result : null;
    if (!result) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch(`${SERVICES.users}/api/v1/profiles/me/completion`, {
        headers: { 'x-user-id': userId, 'x-internal-key': INTERNAL_KEY },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!r.ok) return next(); // fail-open: don't block traffic on completion lookup hiccups
      const body = await r.json() as { data: typeof result };
      result = body.data!;
      completionCache.set(userId, { result, expiresAt: Date.now() + COMPLETION_TTL_MS });
    }
    if (result && result.score < result.threshold) {
      return res.status(403).json({
        error: {
          message: 'Complete your profile to unlock this feature.',
          code: 'ONBOARDING_INCOMPLETE',
          statusCode: 403,
          requiredScore: result.threshold,
          currentScore: result.score,
          missingFields: result.missing,
          dtm: result.dtm,
        },
      });
    }
    next();
  } catch {
    // Fail-open on any unexpected error to avoid wedging the gateway.
    next();
  }
}

app.use(extractUserId);

// ─── Health Check ────────────────────────────────────
// /healthz — liveness, no deps. /readyz — aggregate downstream /readyz probes.
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway', uptime: process.uptime() });
});
app.get('/readyz', async (_req, res) => {
  const checks: Record<string, string> = {};
  let ok = true;
  await Promise.all(Object.entries(SERVICES).map(async ([name, url]) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const r = await fetch(`${url}/readyz`, { signal: ctrl.signal });
      clearTimeout(t);
      checks[name] = r.ok ? 'ok' : `error:${r.status}`;
      if (!r.ok) ok = false;
    } catch (e: unknown) {
      checks[name] = e instanceof Error ? `unreachable:${e.message}` : 'unreachable';
      ok = false;
    }
  }));
  res.status(ok ? 200 : 503).json({ ready: ok, service: 'gateway', checks });
});

app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = {};
  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 3000);
      const r = await fetch(`${url}/health`, { signal: ctrl.signal });
      clearTimeout(timeout);
      checks[name] = r.ok ? 'ok' : 'error';
    } catch {
      checks[name] = 'unreachable';
    }
  }
  res.json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    services: checks,
  });
});

// ─── SSE Stream Endpoint ─────────────────────────────
app.get('/api/v1/events/stream', (req: express.Request, res: express.Response) => {
  // EventSource can't send custom headers — accept token from query param
  let userId = req.headers['x-user-id'] as string;
  let tokenExp: number | undefined; // unix seconds, for proactive expiry
  if (!userId && req.query.token) {
    // Validate token length before attempting verification (prevent DoS via long tokens)
    const tokenStr = req.query.token as string;
    if (tokenStr.length > 2048 || !JWT_FORMAT.test(tokenStr)) return res.status(400).json({ error: { message: 'Invalid token' } });
    try {
      const payload = jwt.verify(tokenStr, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string; exp?: number };
      userId = payload.userId;
      tokenExp = payload.exp;
    } catch {}
  }
  if (!userId) return res.status(401).json({ error: { message: 'Authentication required' } });

  // X-Accel-Buffering: no tells nginx to NOT buffer SSE responses.
  // Without this, nginx holds data until the buffer fills, defeating real-time delivery.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx
  });
  // Send initial connection event so the client knows SSE is active
  res.write(`event: connected\ndata: {"userId":"${userId}"}\n\n`);

  // Register this response in the SSE client map (supports multi-tab)
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  const userClients = sseClients.get(userId)!;
  // Security: limit max SSE connections per user to prevent memory exhaustion
  if (userClients.size >= 10) {
    // Close oldest connection to make room
    const oldest = userClients.values().next().value;
    if (oldest) { try { oldest.end(); } catch {} userClients.delete(oldest); }
  }
  userClients.add(res);

  // Heartbeat every 25s — under most proxy idle thresholds (nginx default 60s,
  // ALB 60s, Cloudflare 100s). Comment lines are ignored by EventSource clients.
  const keepAlive = setInterval(() => { try { res.write(': keepalive\n\n'); } catch {} }, 25000);

  // Proactive token-expiry: emit a `token-expired` event 30s before exp and
  // gracefully close so the client can re-auth and reconnect with a fresh JWT.
  let expiryTimer: NodeJS.Timeout | undefined;
  if (tokenExp) {
    const msUntilExpiry = (tokenExp * 1000) - Date.now() - 30_000;
    if (msUntilExpiry > 0) {
      expiryTimer = setTimeout(() => {
        try { res.write('event: token-expired\ndata: {"reason":"jwt_exp_imminent"}\n\n'); } catch {}
        try { res.end(); } catch {}
      }, msUntilExpiry);
    }
  }

  // Clean up on disconnect: remove this response from the map
  req.on('close', () => {
    clearInterval(keepAlive);
    if (expiryTimer) clearTimeout(expiryTimer);
    sseClients.get(userId)?.delete(res);
    if (sseClients.get(userId)?.size === 0) sseClients.delete(userId); // Garbage collect empty sets
  });
});

// Internal push endpoint (called by microservices)
app.post('/internal/push-event', express.json({ limit: '1mb' }), (req: express.Request, res: express.Response) => {
  const key = req.headers['x-internal-key'];
  if (key !== INTERNAL_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { userId, event, data } = req.body;
  if (userId && event) pushEvent(userId, event, data);
  res.json({ ok: true });
});

// ─── Activity Tracking Endpoint ──────────────────────
// Frontend can post user activity for behavioral analysis
app.post('/api/v1/activity/track', express.json({ limit: '50kb' }), (req: express.Request, res: express.Response) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: { message: 'Auth required' } });
  // Forward to the appropriate service (social handles activity storage)
  fetch(`${SERVICES.social}/api/v1/activity/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId, 'x-internal-key': INTERNAL_KEY },
    body: JSON.stringify(req.body),
  }).catch((e: unknown) => logger.warn('Activity forward failed:', e));
  res.json({ ok: true });
});

// ─── Proxy Options Builder ───────────────────────────
function proxyTo(target: string, extra?: Partial<Options> & { pathRewrite?: Record<string, string> }): Options {
  return {
    target,
    changeOrigin: true,
    ...(extra?.pathRewrite ? { pathRewrite: extra.pathRewrite } : {}),
    on: {
      proxyReq: (proxyReq, req: any) => {
        // Express strips the mount path from req.url — restore it (unless rewriting)
        if (!extra?.pathRewrite) proxyReq.path = req.originalUrl;
        // Forward auth headers
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
          proxyReq.setHeader('x-internal-key', req.headers['x-internal-key'] || '');
        }
        if (req.headers.authorization) {
          proxyReq.setHeader('authorization', req.headers.authorization);
        }
        // Forward the request-id so downstream logs stitch into the same trace.
        if (req.id) proxyReq.setHeader('x-request-id', req.id);
      },
      error: (err, _req, res: any) => {
        logger.error('Proxy error:', err.message);
        if (res.writeHead) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Service unavailable', code: 'SERVICE_UNAVAILABLE' } }));
        }
      },
    },
  };
}

// ─── Route Definitions ───────────────────────────────
// Auth routes (public)
// ─── v3.1 Tracking: unauthenticated edge ingest ─────
// Proxied BEFORE auth-gated routes; tracking is consent-gated client-side,
// not auth-gated. Kill switch via TRACKING_KILL short-circuits to 204.
if (process.env.TRACKING_KILL === '1') {
  app.use('/api/v1/track', (_req, res) => res.status(204).end());
} else {
  // Express strips the `/api/v1/track` mount, so req.url arrives as `/` (or
  // sub-paths). Force the upstream path to `/v1/track` regardless.
  app.use('/api/v1/track', createProxyMiddleware({
    target: SERVICES.ingest,
    changeOrigin: true,
    pathRewrite: () => '/v1/track',
    on: {
      proxyReq: (proxyReq, req: any) => {
        if (req.headers['x-request-id']) proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
      },
      error: (err, _req, res: any) => {
        logger.error('Tracking proxy error:', err.message);
        if (res.writeHead) {
          res.writeHead(204);
          res.end();
        }
      },
    },
  }));
}

app.use('/api/v1/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/v1/auth/refresh', refreshLimiter);
app.use('/api/v1/auth', authLimiter, createProxyMiddleware(proxyTo(SERVICES.auth)));

// Public city autocomplete (no auth — used during onboarding before login).
app.use('/api/v1/cities', createProxyMiddleware(proxyTo(SERVICES.users)));

// User routes (protected)
app.use('/api/v1/users', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/profiles', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/search', requireAuth, expensiveLimiter, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/settings', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/bookmarks', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/user-data', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));

// Social routes (protected)
app.use('/api/v1/discover', requireAuth, requireOnboarded, expensiveLimiter, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/matches', requireAuth, requireOnboarded, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/ai-match', requireAuth, requireOnboarded, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/safety', requireAuth, reportLimiter, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/vibe-check', requireAuth, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/activity', requireAuth, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/access', requireAuth, createProxyMiddleware(proxyTo(SERVICES.social)));

// Messaging routes (protected)
app.use('/api/v1/messages', requireAuth, requireOnboarded, createProxyMiddleware(proxyTo(SERVICES.messaging)));
app.use('/api/v1/beats', requireAuth, requireOnboarded, createProxyMiddleware(proxyTo(SERVICES.messaging)));

// Content routes (protected)
app.use('/api/v1/feed', requireAuth, feedLimiter, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/stories', requireAuth, feedLimiter, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/videos', requireAuth, feedLimiter, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/creativity', requireAuth, feedLimiter, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/showcase', requireAuth, feedLimiter, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/matrimonial', requireAuth, createProxyMiddleware(proxyTo(SERVICES.content)));
// v6.6 — see-later pile (Discover + DTM)
app.use('/api/v1/defer', requireAuth, requireOnboarded, createProxyMiddleware(proxyTo(SERVICES.content)));

// Notification routes (protected)
app.use('/api/v1/notifications', requireAuth, createProxyMiddleware(proxyTo(SERVICES.notifications)));

// ─── 404 Handler ─────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// ─── Start ───────────────────────────────────────────
export { app };

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Miamo API Gateway running on port ${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
    logger.info('Services:');
    Object.entries(SERVICES).forEach(([name, url]) => logger.info(`  ${name}: ${url}`));
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gateway...`);
    // Close all SSE connections
    for (const [, clients] of sseClients) {
      for (const res of clients) { try { res.end(); } catch {} }
    }
    sseClients.clear();
    server.close(() => {
      logger.info('Gateway stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
