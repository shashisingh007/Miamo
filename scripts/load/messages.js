// k6 load test — POST /api/v1/messages/chats/:id/messages
//
// What this does:
//   30 RPS for 3 min against a fixed test chat ID. Asserts p95 < 300 ms.
//   Message send is a hot write path — the DB is the constraint, not
//   the app tier, so this test surfaces index misses and lock waits.
//
// How to run:
//   LOAD_TOKEN='<bearer>' LOAD_CHAT_ID='<chat-uuid>' \
//     bash scripts/load/run.sh messages
//
// A ready-made test chat is created by the seed fixture; grab an ID from
// `psql miamo -c "SELECT id FROM \"Chat\" LIMIT 1;"` if LOAD_CHAT_ID is
// unset the script exits with a clear error rather than blasting the
// gateway with an empty path segment.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 30,
      maxVUs: 120,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    errors: ['rate<0.01'],
  },
};

const BASE = __ENV.LOAD_TARGET || 'http://localhost:3200';
const TOKEN = __ENV.LOAD_TOKEN || '';
const CHAT_ID = __ENV.LOAD_CHAT_ID || '';

export function setup() {
  if (!CHAT_ID) {
    throw new Error('LOAD_CHAT_ID env var required — see scripts/load/README.md');
  }
  return { chatId: CHAT_ID };
}

export default function (data) {
  const payload = JSON.stringify({
    content: `k6-load-${__VU}-${__ITER}-${Date.now()}`,
    type: 'text',
  });
  const res = http.post(
    `${BASE}/api/v1/messages/chats/${data.chatId}/messages`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
        'Idempotency-Key': `k6-msg-${__VU}-${__ITER}`,
        'X-Request-ID': `k6-messages-${__VU}-${__ITER}`,
      },
      tags: { endpoint: 'messages.send' },
    },
  );
  const ok = check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  errorRate.add(!ok);
  sleep(0.1);
}
