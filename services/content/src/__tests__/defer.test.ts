/**
 * End-to-end-ish test for the v6.6 deferred-pile endpoints.
 *
 * Mounts the real express app from server.ts and drives it via supertest
 * with the internal-auth headers the gateway forwards. Verifies the auth
 * + zod-validation contract without requiring a live DB — schema-invalid
 * requests are rejected before the handler reaches Prisma.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

beforeAll(() => {
  process.env.INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'test-internal-key';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-chars-min-len-here';
  process.env.NODE_ENV = 'test';
});

const authHeaders = (userId = 'test-user-1') => ({
  'x-user-id': userId,
  'x-internal-key': process.env.INTERNAL_SERVICE_KEY!,
});

async function getApp(): Promise<import('express').Express> {
  const mod = await import('../server');
  return mod.app;
}

describe('POST /api/v1/defer — auth + validation', () => {
  it('returns 401 without auth headers', async () => {
    const app = await getApp();
    const res = await request(app).post('/api/v1/defer').send({ surface: 'discover', targetId: 't1' });
    expect(res.status).toBe(401);
  });

  it('returns 400 on missing required body fields', async () => {
    const app = await getApp();
    const res = await request(app).post('/api/v1/defer').set(authHeaders()).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on unknown surface', async () => {
    const app = await getApp();
    const res = await request(app).post('/api/v1/defer').set(authHeaders()).send({ surface: 'feed', targetId: 't1' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on unknown reason enum', async () => {
    const app = await getApp();
    const res = await request(app)
      .post('/api/v1/defer')
      .set(authHeaders())
      .send({ surface: 'discover', targetId: 't1', reason: 'whenever' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/defer — query validation', () => {
  it('returns 400 when surface is missing', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/v1/defer').set(authHeaders());
    expect(res.status).toBe(400);
  });

  it('returns 400 on out-of-range limit', async () => {
    const app = await getApp();
    const res = await request(app).get('/api/v1/defer?surface=discover&limit=999').set(authHeaders());
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/defer/:id/resolve — body validation', () => {
  it('returns 400 on unknown action', async () => {
    const app = await getApp();
    const res = await request(app)
      .post('/api/v1/defer/some-id/resolve')
      .set(authHeaders())
      .send({ action: 'maybe' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const app = await getApp();
    const res = await request(app).post('/api/v1/defer/some-id/resolve').send({ action: 'like' });
    expect(res.status).toBe(401);
  });
});
