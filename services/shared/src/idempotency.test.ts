import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';

// Ensure REDIS_URL is unset so the middleware no-ops without a real Redis.
delete process.env.REDIS_URL;

// Dynamic import after env tweak so the module sees the unset URL on first call.
const { idempotency } = await import('./idempotency');

function mockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown = undefined;
  const res = {
    setHeader: (k: string, v: string) => { headers[k] = v; },
    status(c: number) { statusCode = c; return res; },
    json(b: unknown) { body = b; return res; },
    get _state() { return { statusCode, body, headers }; },
  };
  return res as unknown as Response & { _state: { statusCode: number; body: any; headers: Record<string, string> } };
}

describe('idempotency middleware (no Redis configured)', () => {
  it('passes through when no Idempotency-Key header is sent', async () => {
    const mw = idempotency();
    const req = { headers: {}, userId: 'u1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res._state.body).toBeUndefined();
  });

  it('passes through with a valid key when Redis is not configured (fail-open)', async () => {
    const mw = idempotency();
    const req = { headers: { 'idempotency-key': 'abc12345' }, userId: 'u1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects malformed Idempotency-Key with 400 INVALID_IDEMPOTENCY_KEY', async () => {
    const mw = idempotency();
    const req = { headers: { 'idempotency-key': 'has spaces!' }, userId: 'u1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._state.statusCode).toBe(400);
    expect((res._state.body as any).error.code).toBe('INVALID_IDEMPOTENCY_KEY');
  });

  it('rejects too-short keys (<8 chars)', async () => {
    const mw = idempotency();
    const req = { headers: { 'idempotency-key': 'short' }, userId: 'u1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._state.statusCode).toBe(400);
  });
});
