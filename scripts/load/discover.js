// k6 load test — GET /api/v1/discover
//
// What this does:
//   Ramps 0 → 100 RPS over 30s, holds 100 RPS for 5 min, then ramps
//   down to 0 over 30s. Asserts p95 < 250 ms and error rate < 1 %.
//
// How to run:
//   brew install k6                                 # macOS
//   apt install k6                                  # Debian/Ubuntu
//   LOAD_TOKEN='<bearer>' bash scripts/load/run.sh discover
//
// Direct invocation without the wrapper:
//   LOAD_TARGET=http://localhost:3200 LOAD_TOKEN=... k6 run scripts/load/discover.js
//
// See scripts/load/README.md for the LOAD_* env var contract and
// docs/DEVOPS.md §Load-tests for the launch-day acceptance criteria.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    ramping: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { duration: '30s', target: 100 },  // ramp up
        { duration: '5m',  target: 100 },  // hold
        { duration: '30s', target: 0 },    // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<250'],
    errors: ['rate<0.01'],
  },
};

const BASE = __ENV.LOAD_TARGET || 'http://localhost:3200';
const TOKEN = __ENV.LOAD_TOKEN || '';

export default function () {
  const res = http.get(`${BASE}/api/v1/discover`, {
    headers: {
      Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
      'X-Request-ID': `k6-discover-${__VU}-${__ITER}`,
    },
    tags: { endpoint: 'discover' },
  });
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'body has data': (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!ok);
  sleep(0.1);
}
