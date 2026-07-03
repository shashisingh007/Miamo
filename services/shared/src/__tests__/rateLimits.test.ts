// Light tests on the per-endpoint rate limiters. We boot a minimal express
// app per limiter and exercise it via http requests to localhost. This
// avoids fragile in-memory stubbing of express-rate-limit's `(req, res, next)`
// surface (which can call res.setHeader, res.end, and other methods in
// orders that vary across versions).
import { describe, it, expect } from 'vitest';
import express from 'express';
import type { Express, RequestHandler } from 'express';
import http from 'http';
import {
  accountCreationLimiter,
  loginAttemptLimiter,
  otpSendLimiter,
  passwordResetLimiter,
  paymentInitLimiter,
  webhookLimiter,
} from '../rateLimits';

interface HitResponse { status: number; body: any; headers: Record<string, string | string[] | undefined> }

function buildApp(limiter: RequestHandler): Express {
  const app = express();
  // express-rate-limit v7 trust-proxy semantics: we set 'loopback' so the
  // X-Forwarded-For header from 127.0.0.1 (our test client) is honored
  // without triggering the permissive-trust-proxy validator that fires when
  // `trust proxy` is `true`.
  app.set('trust proxy', 'loopback');
  app.use(express.json());
  app.post('/test', limiter, (_req, res) => { res.json({ ok: true }); });
  return app;
}

function start(app: Express): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server: http.Server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        port,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

function hit(port: number, body: any, headers: Record<string, string>): Promise<HitResponse> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed: any = raw;
        try { parsed = JSON.parse(raw); } catch { /* ignore */ }
        resolve({ status: res.statusCode ?? 0, body: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('accountCreationLimiter', () => {
  it('allows 3 then 429s the 4th from same IP', async () => {
    const srv = await start(buildApp(accountCreationLimiter));
    try {
      const ip = '10.0.0.50';
      for (let i = 0; i < 3; i++) {
        const r = await hit(srv.port, {}, { 'X-Forwarded-For': ip });
        expect(r.status).toBe(200);
      }
      const r = await hit(srv.port, {}, { 'X-Forwarded-For': ip });
      expect(r.status).toBe(429);
      expect(r.body?.error?.code).toBe('RATE_LIMITED');
    } finally {
      await srv.close();
    }
  });

  it('partitions distinct IPs independently', async () => {
    const srv = await start(buildApp(accountCreationLimiter));
    try {
      // Same IP from prior test is now blocked, but fresh IPs are unaffected.
      for (let i = 0; i < 3; i++) {
        const r = await hit(srv.port, {}, { 'X-Forwarded-For': '10.0.0.51' });
        expect(r.status).toBe(200);
      }
      const r = await hit(srv.port, {}, { 'X-Forwarded-For': '10.0.0.99' });
      expect(r.status).toBe(200);
    } finally {
      await srv.close();
    }
  });
});

describe('loginAttemptLimiter', () => {
  it('keys by IP+email so distinct emails on same IP both pass', async () => {
    const srv = await start(buildApp(loginAttemptLimiter));
    try {
      const ip = '10.0.1.10';
      for (let i = 0; i < 5; i++) {
        const r = await hit(srv.port, { email: 'victim@example.com' }, { 'X-Forwarded-For': ip });
        expect(r.status).toBe(200);
      }
      const blocked = await hit(srv.port, { email: 'victim@example.com' }, { 'X-Forwarded-For': ip });
      expect(blocked.status).toBe(429);
      // Same IP, different email is still allowed.
      const fresh = await hit(srv.port, { email: 'someone-else@example.com' }, { 'X-Forwarded-For': ip });
      expect(fresh.status).toBe(200);
    } finally {
      await srv.close();
    }
  });

  it('lower-cases email so casing variations share the same bucket', async () => {
    const srv = await start(buildApp(loginAttemptLimiter));
    try {
      const ip = '10.0.1.11';
      for (let i = 0; i < 5; i++) {
        const r = await hit(srv.port, { email: 'Mixed@Case.com' }, { 'X-Forwarded-For': ip });
        expect(r.status).toBe(200);
      }
      const r = await hit(srv.port, { email: 'mixed@case.COM' }, { 'X-Forwarded-For': ip });
      expect(r.status).toBe(429);
    } finally {
      await srv.close();
    }
  });
});

describe('otpSendLimiter', () => {
  it('caps OTP sends at 3 per (IP, identifier)', async () => {
    const srv = await start(buildApp(otpSendLimiter));
    try {
      const ip = '10.0.2.10';
      for (let i = 0; i < 3; i++) {
        const r = await hit(srv.port, { identifier: '+919999999999' }, { 'X-Forwarded-For': ip });
        expect(r.status).toBe(200);
      }
      const r = await hit(srv.port, { identifier: '+919999999999' }, { 'X-Forwarded-For': ip });
      expect(r.status).toBe(429);
    } finally {
      await srv.close();
    }
  });
});

describe('passwordResetLimiter', () => {
  it('keys by email alone so coordinated multi-IP attacks against one mailbox still throttle', async () => {
    const srv = await start(buildApp(passwordResetLimiter));
    try {
      for (let i = 0; i < 3; i++) {
        const r = await hit(srv.port, { email: 'target@example.com' }, { 'X-Forwarded-For': `10.0.3.${i}` });
        expect(r.status).toBe(200);
      }
      const r = await hit(srv.port, { email: 'target@example.com' }, { 'X-Forwarded-For': '10.0.3.99' });
      expect(r.status).toBe(429);
    } finally {
      await srv.close();
    }
  });
});

describe('paymentInitLimiter', () => {
  it('keys by x-user-id and allows up to 10 per minute', async () => {
    const srv = await start(buildApp(paymentInitLimiter));
    try {
      for (let i = 0; i < 10; i++) {
        const r = await hit(srv.port, {}, { 'x-user-id': 'user-pay-1' });
        expect(r.status).toBe(200);
      }
      const r = await hit(srv.port, {}, { 'x-user-id': 'user-pay-1' });
      expect(r.status).toBe(429);
    } finally {
      await srv.close();
    }
  });
});

describe('webhookLimiter', () => {
  it('exists and returns a function (sanity)', () => {
    expect(typeof webhookLimiter).toBe('function');
  });
});
