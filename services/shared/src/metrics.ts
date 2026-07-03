/**
 * Shared Prometheus metrics middleware.
 *
 * Mount with `app.use(metricsMiddleware('service-name'))` to:
 *   - Auto-record HTTP request count/duration by route+status
 *   - Expose `/metrics` (text/plain; version=0.0.4) for Prometheus scraping
 *   - Collect default Node.js process metrics (event loop, memory, GC)
 *
 * `/metrics` is excluded from auth and rate-limiting in the gateway by being
 * served by each service directly on its own port. The gateway should NOT
 * proxy `/metrics` — it's intended for internal Prometheus scraping only.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'miamo_' });

const httpRequestsTotal = new client.Counter({
  name: 'miamo_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['service', 'method', 'route', 'status'] as const,
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'miamo_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['service', 'method', 'route', 'status'] as const,
  // Buckets tuned for typical API latency: 1ms .. 5s
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpErrorsTotal = new client.Counter({
  name: 'miamo_http_errors_total',
  help: 'Total HTTP error responses (status >= 400)',
  labelNames: ['service', 'method', 'route', 'status'] as const,
  registers: [register],
});

// ─── v8 launch custom metrics (Phase C.3) ────────────────────────────
// These four counters/gauge feed the Grafana dashboards listed in the
// launch-audit §3 KPI inventory. They are exported as named bindings so
// workers + services can `import { exposureCreditWrites } from
// '../../shared/src/metrics'` and call `.inc()` / `.set()` directly.
//
// Cardinality discipline:
//   - `exposureCreditWrites` is labelled by `reason` (≤7 enum values from
//     the QualityAction set) — cardinality bounded.
//   - `moveV2SuggestionsEmitted` is labelled by `source` ∈ {v1, v2} —
//     two-value cardinality.
//   - `fairnessGiniPerGender` is a gauge labelled by `gender` ∈ {m,f,o}
//     — three-value cardinality.
//   - `intentInferenceRuns` is unlabelled (one counter per worker tick).

/** Incremented once per intentInference worker tick. Heartbeat proxy for
 *  the tracking-worker rollup-lag alarm (Sev2). */
export const intentInferenceRuns = new client.Counter({
  name: 'miamo_v8_intent_inference_runs_total',
  help: 'Number of intent-inference worker ticks executed',
  labelNames: [] as const,
  registers: [register],
});

/** Incremented once per v9 preferenceWindows worker tick. Heartbeat proxy
 *  for the temporal-learning rollup-lag alarm. */
export const preferenceWindowsRuns = new client.Counter({
  name: 'miamo_v9_preference_windows_runs_total',
  help: 'Number of preferenceWindows worker ticks executed',
  labelNames: [] as const,
  registers: [register],
});

/** Incremented for every ExposureLedger row written, labelled by the
 *  v8 exposureCredits reason enum (`first_quality_msg`, `reply_in_24h`,
 *  `match_back`, `rage_like_zero`, etc). Feeds the daily exposure-credit
 *  burn-rate dashboard. */
export const exposureCreditWrites = new client.Counter({
  name: 'miamo_exposure_credit_writes_total',
  help: 'Exposure-ledger rows written, by reason',
  labelNames: ['reason'] as const,
  registers: [register],
});

/** Incremented after the Move v2 composer emits suggestions, labelled by
 *  the composer source: `v1` for the legacy `generateSmartMoves` path, `v2`
 *  for the new composer behind FEATURE_MOVE_V2_ENABLED. Drives the v2
 *  fallback-rate alarm. */
export const moveV2SuggestionsEmitted = new client.Counter({
  name: 'miamo_move_v2_suggestions_emitted_total',
  help: 'Move v2 suggestion composer emissions, by source (v1|v2)',
  labelNames: ['source'] as const,
  registers: [register],
});

/** Gauge of the gender-conditional Gini coefficient computed by the daily
 *  fairnessAudit worker. One sample per gender bucket. Alarms fire when
 *  any bucket exceeds 0.45 (per the audit threshold). */
export const fairnessGiniPerGender = new client.Gauge({
  name: 'miamo_fairness_gini_per_gender',
  help: 'Gender-conditional Gini coefficient of exposure distribution',
  labelNames: ['gender'] as const,
  registers: [register],
});

/**
 * Express middleware that records request count + duration and mounts /metrics.
 * Call once per service: `app.use(metricsMiddleware('auth'))`.
 */
export function metricsMiddleware(service: string): RequestHandler {
  return function metricsMw(req: Request, res: Response, next: NextFunction): void {
    if (req.path === '/metrics') {
      register.metrics().then((data) => {
        res.set('Content-Type', register.contentType);
        res.end(data);
      }).catch((e: unknown) => {
        res.status(500).json({ error: { message: 'metrics unavailable', code: 'METRICS_ERROR' } });
        // eslint-disable-next-line no-console
        console.error('metrics export failed', e);
      });
      return;
    }
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      // Use req.route?.path when available (Express-matched template) to avoid
      // high-cardinality labels from raw req.path containing UUIDs.
      const route = (req.route?.path as string | undefined) || req.baseUrl || req.path || 'unknown';
      const labels = { service, method: req.method, route, status: String(res.statusCode) };
      const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, durationSec);
      if (res.statusCode >= 400) httpErrorsTotal.inc(labels);
    });
    next();
  };
}

export { register as metricsRegister };
