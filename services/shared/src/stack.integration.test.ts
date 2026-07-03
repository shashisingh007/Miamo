// ─── End-to-end middleware stack test ─────────────────────────────
// Spins up a minimal Express app wired with the shared middlewares
// (requestId, validate, errorHandler) and asserts the full request →
// response contract that downstream services rely on. This catches
// regressions in middleware composition (e.g. error-handler swallowing
// validation errors, requestId not surviving a thrown error, etc.) that
// pure unit tests on isolated modules would miss.
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { requestId } from './requestId';
import { validate } from './validate';
import { errorHandler } from './errorHandler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestId);

  // Happy path — body validated, echoes the parsed value.
  app.post(
    '/echo',
    validate({ body: z.object({ name: z.string().trim().min(1).max(40) }) }),
    (req, res) => res.json({ data: req.body }),
  );

  // Forces a 500 to exercise errorHandler's prod-message masking + requestId surfacing.
  app.get('/boom', (_req, _res) => { throw new Error('kaboom — internal detail'); });

  // AppError-style with custom statusCode + code.
  app.get('/notfound', (_req, _res) => {
    const err: any = new Error('Profile not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  });

  app.use(errorHandler);
  return app;
}

describe('shared middleware stack (integration)', () => {
  it('echoes request-id header on success', async () => {
    const res = await request(buildApp())
      .post('/echo')
      .set('X-Request-Id', 'trace-test-1')
      .send({ name: 'Miamo' });
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('trace-test-1');
    expect(res.body).toEqual({ data: { name: 'Miamo' } });
  });

  it('returns 400 VALIDATION_ERROR with field details on bad body', async () => {
    const res = await request(buildApp()).post('/echo').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.statusCode).toBe(400);
    expect(Array.isArray(res.body.error.fields)).toBe(true);
    expect(res.body.error.fields[0].path).toBe('name');
  });

  it('returns 500 INTERNAL_ERROR with requestId in envelope when handler throws', async () => {
    const res = await request(buildApp())
      .get('/boom')
      .set('X-Request-Id', 'trace-test-2');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.statusCode).toBe(500);
    expect(res.body.error.requestId).toBe('trace-test-2');
  });

  it('returns 404 NOT_FOUND with the original message when handler throws an AppError-shaped error', async () => {
    const res = await request(buildApp()).get('/notfound');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Profile not found');
  });

  it('mints a fresh UUID request-id when none provided', async () => {
    const res = await request(buildApp()).post('/echo').send({ name: 'ok' });
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
