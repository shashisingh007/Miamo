// k6 load test — GET /api/v1/matches
//
// What this does:
//   Holds 50 RPS for 3 min. Asserts p95 < 200 ms and error rate < 1 %.
//   Matches list is a cache-friendly hot path — Priya reloads it every
//   time she opens the app, and cache misses under load are the real
//   thing to watch.
//
// How to run:
//   LOAD_TOKEN='<bearer>' bash scripts/load/run.sh matches

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 30,
      maxVUs: 150,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

const BASE = __ENV.LOAD_TARGET || 'http://localhost:3200';
const TOKEN = __ENV.LOAD_TOKEN || '';

export default function () {
  const res = http.get(`${BASE}/api/v1/matches`, {
    headers: {
      Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
      'X-Request-ID': `k6-matches-${__VU}-${__ITER}`,
    },
    tags: { endpoint: 'matches' },
  });
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'body parses as JSON': (r) => {
      try { JSON.parse(r.body); return true; } catch { return false; }
    },
  });
  errorRate.add(!ok);
  sleep(0.05);
}
