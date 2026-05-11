// ─── Miamo API Gateway ───────────────────────────────
// Instagram-style API Gateway — routes to microservices
// Handles: rate limiting, CORS, auth validation, routing, SSE real-time
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = parseInt(process.env.PORT || '3200', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'miamo-dev-jwt-secret-change-in-production-2026';

// ═══ SSE: Real-time event connections per user ═══════
const sseClients = new Map<string, Set<express.Response>>();

export function pushEvent(userId: string, event: string, data: any) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
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
};

// ─── Middleware ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Note: compression disabled — http-proxy-middleware handles its own streams
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3100',
  credentials: true,
}));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Auth-specific stricter rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: { message: 'Too many auth attempts', code: 'RATE_LIMITED' } },
});

// ─── Auth Validation Middleware ───────────────────────
function extractUserId(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      // Pass user ID to downstream services
      req.headers['x-user-id'] = payload.userId;
      req.headers['x-internal-key'] = process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key';
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

app.use(extractUserId);

// ─── Health Check ────────────────────────────────────
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
  if (!userId && req.query.token) {
    try {
      const payload = jwt.verify(req.query.token as string, JWT_SECRET) as { userId: string };
      userId = payload.userId;
    } catch {}
  }
  if (!userId) return res.status(401).json({ error: { message: 'Authentication required' } });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx
  });
  res.write(`event: connected\ndata: {"userId":"${userId}"}\n\n`);

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId)!.add(res);

  // Keep alive every 30s
  const keepAlive = setInterval(() => { try { res.write(': keepalive\n\n'); } catch {} }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.get(userId)?.delete(res);
    if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
  });
});

// Internal push endpoint (called by microservices)
app.post('/internal/push-event', express.json({ limit: '1mb' }), (req: express.Request, res: express.Response) => {
  const key = req.headers['x-internal-key'];
  if (key !== (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { userId, event, data } = req.body;
  if (userId && event) pushEvent(userId, event, data);
  res.json({ ok: true });
});

// ─── Proxy Options Builder ───────────────────────────
function proxyTo(target: string): Options {
  return {
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req: any) => {
        // Express strips the mount path from req.url — restore it
        proxyReq.path = req.originalUrl;
        // Forward auth headers
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
          proxyReq.setHeader('x-internal-key', req.headers['x-internal-key'] || '');
        }
        if (req.headers.authorization) {
          proxyReq.setHeader('authorization', req.headers.authorization);
        }
      },
      error: (err, _req, res: any) => {
        console.error('Proxy error:', err.message);
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
app.use('/api/v1/auth', authLimiter, createProxyMiddleware(proxyTo(SERVICES.auth)));

// User routes (protected)
app.use('/api/v1/users', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/profiles', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/search', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));
app.use('/api/v1/settings', requireAuth, createProxyMiddleware(proxyTo(SERVICES.users)));

// Social routes (protected)
app.use('/api/v1/discover', requireAuth, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/matches', requireAuth, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/ai-match', requireAuth, createProxyMiddleware(proxyTo(SERVICES.social)));
app.use('/api/v1/safety', requireAuth, createProxyMiddleware(proxyTo(SERVICES.social)));

// Messaging routes (protected)
app.use('/api/v1/messages', requireAuth, createProxyMiddleware(proxyTo(SERVICES.messaging)));
app.use('/api/v1/beats', requireAuth, createProxyMiddleware(proxyTo(SERVICES.messaging)));

// Content routes (protected)
app.use('/api/v1/feed', requireAuth, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/stories', requireAuth, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/videos', requireAuth, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/creativity', requireAuth, createProxyMiddleware(proxyTo(SERVICES.content)));
app.use('/api/v1/matrimonial', requireAuth, createProxyMiddleware(proxyTo(SERVICES.content)));

// Notification routes (protected)
app.use('/api/v1/notifications', requireAuth, createProxyMiddleware(proxyTo(SERVICES.notifications)));

// ─── 404 Handler ─────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// ─── Start ───────────────────────────────────────────
export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Miamo API Gateway running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Services:`);
    Object.entries(SERVICES).forEach(([name, url]) => console.log(`     ${name}: ${url}`));
    console.log('');
  });
}
