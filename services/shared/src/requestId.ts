// ─── Request ID middleware ─────────────────────────────────────────
// Generates or reuses an X-Request-Id header so a request can be traced
// end-to-end through gateway → downstream services → response. If the
// caller already supplied a request id (e.g. set by the gateway or an
// upstream load balancer) we honour and echo it; otherwise we mint a new
// UUID. The id is attached to `req.id` so handlers and `errorHandler`
// can include it in log lines and error envelopes.
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export interface RequestWithId extends Request {
  id?: string;
}

const REQ_ID_HEADER = 'x-request-id';
// Defence-in-depth: cap header length and only allow hex/dash/uuid chars so a
// malicious client can't inject log-line junk or unbounded strings.
const SAFE_ID = /^[A-Za-z0-9_\-]{1,128}$/;

export function requestId(req: RequestWithId, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQ_ID_HEADER];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const id = candidate && SAFE_ID.test(candidate) ? candidate : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
