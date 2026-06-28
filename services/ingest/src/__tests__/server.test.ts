import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

const validEnv = {
  ctx: { v: 1, did: 'dev-aaaa-bbbb', sid: 'ses-aaaa-bbbb' },
  evts: [{ e: 'page.view', t: Date.now(), n: 0, p: { path: '/' } }],
};

describe('ingest /v1/track', () => {
  it('responds 204 on valid envelope', async () => {
    const res = await request(app).post('/v1/track').send(validEnv);
    expect(res.status).toBe(204);
  });

  it('responds 204 on malformed payload (silent drop)', async () => {
    const res = await request(app).post('/v1/track').send({ junk: true });
    expect(res.status).toBe(204);
  });

  it('respects DNT header', async () => {
    const res = await request(app).post('/v1/track').set('DNT', '1').send(validEnv);
    expect(res.status).toBe(204);
  });

  it('healthz returns ok', async () => {
    const res = await request(app).get('/v1/track/healthz');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('accepts envelope with v6.7 ctx fields (lh, wd, sn, sf)', async () => {
    const env = {
      ctx: { v: 1, did: 'dev-aaaa-bbbb', sid: 'ses-aaaa-bbbb', lh: 22, wd: 3, sn: 7, sf: 'discover' },
      evts: [{ e: 'page.view', t: Date.now(), n: 0, p: { path: '/discover' } }],
    };
    const res = await request(app).post('/v1/track').send(env);
    expect(res.status).toBe(204);
  });

  it('still rejects out-of-range hour silently', async () => {
    const env = {
      ctx: { v: 1, did: 'dev-aaaa-bbbb', sid: 'ses-aaaa-bbbb', lh: 99 },
      evts: [{ e: 'page.view', t: Date.now(), n: 0, p: { path: '/' } }],
    };
    const res = await request(app).post('/v1/track').send(env);
    expect(res.status).toBe(204);
  });
});
