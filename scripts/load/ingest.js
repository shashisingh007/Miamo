// k6 load test — POST /v1/track (ingest service).
//
// What this does:
//   200 RPS for 5 min against the ingest service. Every request must
//   return 204 (fire-and-forget contract). No p95 assertion — the
//   service is designed to always be fast; the interesting metric is
//   drop rate under back-pressure to Redis.
//
// The ingest service (see services/ingest/) buffers events into a Redis
// stream, then hands off to services/tracking-worker. If Redis wedges,
// the ingest tier must return 204 within 50 ms regardless (fail-open).
//
// How to run:
//   LOAD_TARGET=http://localhost:3260 bash scripts/load/run.sh ingest

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    ingest: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 400,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<50', 'p(99)<200'],
    errors: ['rate<0.001'],  // ingest must be near-lossless
  },
};

const BASE = __ENV.LOAD_TARGET || 'http://localhost:3260';

const EVENT_TYPES = ['card_view', 'card_like', 'card_pass', 'dwell', 'session_start'];

export default function () {
  const eventType = EVENT_TYPES[__ITER % EVENT_TYPES.length];
  const payload = JSON.stringify({
    version: 6,
    ts: Date.now(),
    userId: `load-user-${__VU % 100}`,
    sessionId: `load-session-${__VU}`,
    events: [
      {
        type: eventType,
        ts: Date.now(),
        payload: {
          targetId: `target-${__ITER % 500}`,
          dwellMs: Math.floor(Math.random() * 5000),
        },
      },
    ],
  });
  const res = http.post(`${BASE}/v1/track`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': `k6-ingest-${__VU}-${__ITER}`,
    },
    tags: { endpoint: 'ingest' },
  });
  const ok = check(res, {
    'status is 204': (r) => r.status === 204,
  });
  errorRate.add(!ok);
  // No sleep — arrival-rate executor throttles for us.
}
