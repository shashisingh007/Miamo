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
