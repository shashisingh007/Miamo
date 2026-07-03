/**
 * requestId \u2014 Phase 20 request-id propagation helper (pure).
 *
 * Accepts an inbound `x-request-id` header value and either validates &
 * normalises it, or mints a fresh one. Format: lower-case [0-9a-z-] up
 * to 128 chars (covers ULIDs, UUIDs, simple short ids).
 *
 * `genRandom` is injected so the helper stays pure / deterministic in
 * tests. Production callers pass `Math.random`.
 */
const ALLOWED = /^[0-9a-z-]{1,128}$/;

export type RequestIdResult = {
  id: string;
  source: 'inbound' | 'generated';
};

function mint(genRandom: () => number, nowMs: number): string {
  // 10 base36 chars of time + 6 of randomness => 16-char id
  const t = Math.floor(Math.max(0, nowMs)).toString(36).padStart(10, '0').slice(-10);
  let r = '';
  for (let i = 0; i < 6; i++) {
    r += Math.floor(Math.max(0, Math.min(1, genRandom())) * 36).toString(36);
  }
  return (t + r).toLowerCase();
}

export function resolveRequestId(
  inbound: string | null | undefined,
  opts: { nowMs: number; genRandom: () => number },
): RequestIdResult {
  if (typeof inbound === 'string') {
    const trimmed = inbound.trim().toLowerCase();
    if (ALLOWED.test(trimmed)) return { id: trimmed, source: 'inbound' };
  }
  return { id: mint(opts.genRandom, opts.nowMs), source: 'generated' };
}

export function isValidRequestId(v: unknown): v is string {
  return typeof v === 'string' && ALLOWED.test(v.trim().toLowerCase());
}
