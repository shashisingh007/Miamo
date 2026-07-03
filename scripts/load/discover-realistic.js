// k6 load test — realistic user session.
//
// What this does:
//   Emulates a real Priya session: login → 5 discover fetches (with
//   simulated dwell) → like 2 profiles → view /matches → send 1 msg.
//   20 sessions/sec for 5 min. Assertions are on end-to-end p95 per
//   step, not aggregate — a slow /messages send is more interesting
//   than a fast /discover.
//
// Why we need this in addition to the endpoint-specific tests:
//   Individual endpoints can pass p95 targets while a real user session
//   still feels laggy because every step hits a different cold-cache
//   path. This test surfaces the sequenced-latency budget.
//
// How to run:
//   bash scripts/load/run.sh discover-realistic
//
// Note: this test creates real writes (likes, messages). Point at a
// disposable environment — never against a shared staging DB without
// coordinating.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';

const stepDuration = {
  login: new Trend('step_login_ms', true),
  discover: new Trend('step_discover_ms', true),
  like: new Trend('step_like_ms', true),
  matches: new Trend('step_matches_ms', true),
  message: new Trend('step_message_ms', true),
};

export const options = {
  scenarios: {
    sessions: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    step_login_ms:    ['p(95)<500'],
    step_discover_ms: ['p(95)<300'],
    step_like_ms:     ['p(95)<250'],
    step_matches_ms:  ['p(95)<250'],
    step_message_ms:  ['p(95)<400'],
  },
};

const BASE = __ENV.LOAD_TARGET || 'http://localhost:3200';
// The realistic session logs in with a shared seeded persona pool —
// override with your own persona username if you need isolation.
const PERSONA_POOL = (__ENV.LOAD_PERSONAS || 'miamo10,miamo15,miamo20,miamo25')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export default function () {
  const persona = PERSONA_POOL[__VU % PERSONA_POOL.length];
  let token = '';

  group('login', () => {
    const t0 = Date.now();
    const res = http.post(
      `${BASE}/api/v1/auth/login`,
      JSON.stringify({ email: `${persona}@miamo.test`, password: persona }),
      { headers: { 'Content-Type': 'application/json' }, tags: { step: 'login' } },
    );
    stepDuration.login.add(Date.now() - t0);
    check(res, { 'login ok': (r) => r.status === 200 });
    try {
      const body = JSON.parse(res.body);
      token = body?.data?.accessToken || body?.accessToken || '';
    } catch { /* left blank */ }
  });

  if (!token) return; // cannot proceed without a session

  const auth = { Authorization: `Bearer ${token}` };

  group('discover x5', () => {
    for (let i = 0; i < 5; i += 1) {
      const t0 = Date.now();
      const res = http.get(`${BASE}/api/v1/discover`, { headers: auth, tags: { step: 'discover' } });
      stepDuration.discover.add(Date.now() - t0);
      check(res, { 'discover ok': (r) => r.status === 200 });
      sleep(0.3 + Math.random() * 0.7); // 300–1000 ms dwell per card
    }
  });

  group('like x2', () => {
    for (let i = 0; i < 2; i += 1) {
      const t0 = Date.now();
      const res = http.post(
        `${BASE}/api/v1/discover/like`,
        JSON.stringify({ targetUserId: `seed-target-${__VU}-${i}` }),
        { headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': `k6-like-${__VU}-${__ITER}-${i}` }, tags: { step: 'like' } },
      );
      stepDuration.like.add(Date.now() - t0);
      check(res, { 'like accepted': (r) => r.status === 200 || r.status === 201 || r.status === 409 });
    }
  });

  group('matches', () => {
    const t0 = Date.now();
    const res = http.get(`${BASE}/api/v1/matches`, { headers: auth, tags: { step: 'matches' } });
    stepDuration.matches.add(Date.now() - t0);
    check(res, { 'matches ok': (r) => r.status === 200 });
  });

  group('send 1 msg', () => {
    const chatId = __ENV.LOAD_CHAT_ID;
    if (!chatId) return;
    const t0 = Date.now();
    const res = http.post(
      `${BASE}/api/v1/messages/chats/${chatId}/messages`,
      JSON.stringify({ content: `k6-realistic-${__VU}-${__ITER}`, type: 'text' }),
      { headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': `k6-msg-${__VU}-${__ITER}` }, tags: { step: 'message' } },
    );
    stepDuration.message.add(Date.now() - t0);
    check(res, { 'message sent': (r) => r.status === 200 || r.status === 201 });
  });
}
