import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from './validate';

function appFor() {
  const app = express();
  app.use(express.json());
  app.post(
    '/echo',
    validate({ body: z.object({ name: z.string().min(2), age: z.number().int().min(0) }) }),
    (req, res) => res.json({ ok: true, body: req.body }),
  );
  app.get(
    '/list',
    validate({ query: z.object({ limit: z.coerce.number().int().max(50) }) }),
    (req, res) => res.json({ ok: true, limit: req.query.limit }),
  );
  return app;
}

describe('validate middleware', () => {
  it('passes valid body to handler', async () => {
    const res = await request(appFor()).post('/echo').send({ name: 'Sam', age: 30 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, body: { name: 'Sam', age: 30 } });
  });

  it('rejects invalid body with VALIDATION_ERROR + fields[]', async () => {
    const res = await request(appFor()).post('/echo').send({ name: 'x', age: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.fields)).toBe(true);
    expect(res.body.error.fields.length).toBeGreaterThanOrEqual(2);
    const paths = res.body.error.fields.map((f: { path: string }) => f.path).sort();
    expect(paths).toEqual(['age', 'name']);
  });

  it('coerces query strings via schema', async () => {
    const res = await request(appFor()).get('/list?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
  });

  it('rejects query exceeding max', async () => {
    const res = await request(appFor()).get('/list?limit=999');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
