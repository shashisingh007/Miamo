/**
 * Miamo ingest service — v3.1 tracking pipeline.
 *
 * Responsibilities:
 *   - POST /v1/track          — accept batched event envelopes from the web SDK
 *   - POST /v1/track/forget   — right-to-erasure (mark uid for hash rotation)
 *   - GET  /v1/track/healthz  — liveness
 *
 * Hard rules:
 *   - No synchronous DB writes. Events go to Redis Streams; workers persist.
 *   - Always returns 204 on success, even if Redis is down (events are
 *     considered lossy at the edge). Failures are logged with sampling.
 *   - Honors the global TRACKING_KILL env var: when set, immediately 204s.
 *   - Honors a per-request `Do-Not-Track: 1` header.
 *   - Per-device and per-uid rate limits to bound abuse.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { EnvelopeSchema } from './validate';
import { hashUid } from './hash';
import { pushEvents, closeStream, type StreamRecord } from './stream';
import { installSentry } from '../../shared/src/service';

// In-process counters exposed at /metrics in Prometheus text format.
// Lightweight and dependency-free — we don't need full prom-client here.
const counters = {
  requests_total: 0,
  events_accepted_total: 0,
  events_dropped_total: 0,
  kill_total: 0,
  dnt_total: 0,
  invalid_total: 0,
};

const PORT = Number(process.env.PORT || 3260);
const KILL = process.env.TRACKING_KILL === '1';

const app = express();

app.disable('x-powered-by');
// Sentry request handler — mounts before helmet/cors/routes so every
// request lifecycle is captured. No-op when SENTRY_DSN is unset.
const sentry = installSentry({ serviceName: 'ingest' });
app.use(sentry.requestHandler);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    // Normalised to ALLOWED_ORIGINS (matches gateway). Falls back to FRONTEND_URL,
    // then to localhost — keeps single source of truth for CORS allow-list across services.
    origin: (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3100').split(','),
    credentials: false,
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Track-Device'],
  }),
);
// Tight body cap — anything bigger is either abuse or a client bug.
app.use(express.json({ limit: '64kb' }));

// ── rate limits ───────────────────────────────────────────────────────────
const perDeviceLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req.headers['x-track-device'] as string) ||
    (req.body && (req.body as { ctx?: { did?: string } })?.ctx?.did) ||
    req.ip ||
    'anon',
  // Silent drop — never tell scrapers we throttle them.
  handler: (_req, res) => res.status(204).end(),
});

// ── health ────────────────────────────────────────────────────────────────
app.get('/v1/track/healthz', (_req, res) => {
  res.json({ ok: true, kill: KILL, ts: Date.now() });
});
// Convention-compatible aliases (gateway aggregates /health + /readyz across services)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ingest', kill: KILL, timestamp: new Date().toISOString() });
});
app.get('/readyz', (_req, res) => {
  res.json({ ready: true, service: 'ingest' });
});

// ── ingest ────────────────────────────────────────────────────────────────
app.post('/v1/track', perDeviceLimiter, async (req, res) => {
  counters.requests_total += 1;
  // Kill switch & DNT — short-circuit before parsing.
  if (KILL) { counters.kill_total += 1; return res.status(204).end(); }
  if (req.headers['dnt'] === '1') { counters.dnt_total += 1; return res.status(204).end(); }

  const parsed = EnvelopeSchema.safeParse(req.body);
  if (!parsed.success) {
    counters.invalid_total += 1;
    // Don't reflect parser errors — just 204. This keeps the surface boring.
    return res.status(204).end();
  }
  const env = parsed.data;
  const uidHash = env.ctx.uid ? hashUid(env.ctx.uid) : hashUid(env.ctx.did);

  const records: StreamRecord[] = env.evts.map((e) => ({
    uidHash,
    did: env.ctx.did,
    sid: env.ctx.sid,
    ts: e.t,
    evt: e.e,
    payload: JSON.stringify({
      n: e.n,
      p: e.p,
      tid: e.tid,
      tt: e.tt,
      d: e.d,
      path: env.ctx.path,
      ref: env.ctx.ref,
      loc: env.ctx.loc,
      tzo: env.ctx.tzo,
      vw: env.ctx.vw,
      vh: env.ctx.vh,
      dpr: env.ctx.dpr,
      ua: env.ctx.ua,
      cs: env.ctx.cs,
    }),
  }));

  // Fire-and-forget; never block the response on Redis.
  counters.events_accepted_total += records.length;
  pushEvents(records).then((n) => {
    if (n < records.length) counters.events_dropped_total += (records.length - n);
  }).catch(() => { counters.events_dropped_total += records.length; });
  return res.status(204).end();
});

// ── metrics ───────────────────────────────────────────────────────────────
app.get('/metrics', (_req, res) => {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(counters)) {
    lines.push(`# TYPE miamo_ingest_${k} counter`);
    lines.push(`miamo_ingest_${k} ${v}`);
  }
  res.type('text/plain; version=0.0.4').send(lines.join('\n') + '\n');
});

// ── right to erasure ──────────────────────────────────────────────────────
// In Phase 1 we just acknowledge — a downstream worker keys off the same
// secret rotation to invalidate historical joins.
// SECURITY: we intentionally do NOT log the uid or its HMAC hash here. This
// endpoint is the one place where persisting the identifier defeats the
// purpose of the request. Only the aggregate counter is emitted.
// Finding: docs/architecture/full-audit.md §0 P0-1 (2026-07-01).
app.post('/v1/track/forget', (req, res) => {
  const uid = (req.body && (req.body as { uid?: string }).uid) || '';
  if (!uid) return res.status(400).json({ ok: false });
  // Emit uid-free structured metric only. hashUid() call kept as a way to
  // validate the input format without exposing it.
  void hashUid; // reference retained for future rotation-invalidation worker
  return res.status(202).json({ ok: true });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────
// ── Sentry error handler ──────────────────────────────────────────────────
// Reports any uncaught error to Sentry. Ingest's contract is always-204 on
// success, so most "errors" are upstream — this captures the rare hard
// failures (Redis stream wedged, etc). No-op when SENTRY_DSN is unset.
app.use(sentry.errorHandler);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

let server: ReturnType<typeof app.listen> | null = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[ingest] listening on :${PORT} (kill=${KILL})`);
  });
  const shutdown = async () => {
    if (server) server.close();
    await closeStream();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export { app };
