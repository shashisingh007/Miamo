import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requestId, type RequestWithId } from './requestId';

function mockRes(): Response & { _headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    _headers: headers,
  } as unknown as Response & { _headers: Record<string, string> };
}

describe('requestId middleware', () => {
  it('mints a UUID when no incoming X-Request-Id header is present', () => {
    const req = { headers: {} } as RequestWithId;
    const res = mockRes();
    const next = vi.fn();
    requestId(req, res, next);
    expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(res._headers['X-Request-Id']).toBe(req.id);
    expect(next).toHaveBeenCalledOnce();
  });

  it('echoes a well-formed incoming X-Request-Id', () => {
    const req = { headers: { 'x-request-id': 'trace-abc-123' } } as unknown as RequestWithId;
    const res = mockRes();
    requestId(req, res, vi.fn());
    expect(req.id).toBe('trace-abc-123');
    expect(res._headers['X-Request-Id']).toBe('trace-abc-123');
  });

  it('rejects malicious incoming ids (with spaces / control chars) and mints a new one', () => {
    const req = { headers: { 'x-request-id': 'bad id\nwith newline' } } as unknown as RequestWithId;
    const res = mockRes();
    requestId(req, res, vi.fn());
    expect(req.id).not.toBe('bad id\nwith newline');
    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects over-long ids (>128 chars) and mints a new one', () => {
    const tooLong = 'a'.repeat(200);
    const req = { headers: { 'x-request-id': tooLong } } as unknown as RequestWithId;
    const res = mockRes();
    requestId(req, res, vi.fn());
    expect(req.id).not.toBe(tooLong);
    expect(req.id!.length).toBe(36);
  });
});
