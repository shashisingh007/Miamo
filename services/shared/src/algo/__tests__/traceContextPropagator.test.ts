import { describe, it, expect } from 'vitest';
import { parseTraceParent, buildTraceParent, nextChildSpanId } from '../traceContextPropagator';

const TP = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

describe('traceContextPropagator', () => {
  it('parses a spec-compliant traceparent', () => {
    const r = parseTraceParent(TP);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.parsed.version).toBe('00');
      expect(r.parsed.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(r.parsed.flags).toBe('01');
    }
  });

  it('rejects missing / non-string', () => {
    expect((parseTraceParent(null) as any).reason).toBe('invalid_format');
    expect((parseTraceParent(undefined) as any).reason).toBe('invalid_format');
    expect((parseTraceParent('') as any).reason).toBe('invalid_format');
  });

  it('rejects wrong shape', () => {
    expect((parseTraceParent('not-a-trace') as any).reason).toBe('invalid_format');
    expect((parseTraceParent('00-abc-def-01') as any).reason).toBe('invalid_format');
  });

  it('rejects all-zero traceId / parentId', () => {
    const z = '00-00000000000000000000000000000000-b7ad6b7169203331-01';
    expect((parseTraceParent(z) as any).reason).toBe('invalid_trace_id');
    const z2 = '00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01';
    expect((parseTraceParent(z2) as any).reason).toBe('invalid_parent_id');
  });

  it('rejects version ff', () => {
    const bad = 'ff-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    expect((parseTraceParent(bad) as any).reason).toBe('unsupported_version');
  });

  it('case-insensitive parse', () => {
    const upper = TP.toUpperCase();
    const r = parseTraceParent(upper);
    expect(r.ok).toBe(true);
  });

  it('buildTraceParent round-trips with parse', () => {
    const built = buildTraceParent({ traceId: '0af7651916cd43dd8448eb211c80319c', parentId: 'b7ad6b7169203331', sampled: true });
    expect(built).toBe(TP);
    const r = parseTraceParent(built);
    expect(r.ok).toBe(true);
  });

  it('build rejects bad ids', () => {
    expect(() => buildTraceParent({ traceId: 'short', parentId: 'b7ad6b7169203331' })).toThrow();
    expect(() => buildTraceParent({ traceId: '0'.repeat(32), parentId: 'b7ad6b7169203331' })).toThrow();
  });

  it('nextChildSpanId returns 16 hex chars, non-zero', () => {
    for (let i = 0; i < 50; i++) {
      const id = nextChildSpanId();
      expect(id).toMatch(/^[0-9a-f]{16}$/);
      expect(/^0+$/.test(id)).toBe(false);
    }
  });

  it('nextChildSpanId deterministic with seeded rand', () => {
    let seed = 0.1;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280 / 233280; return seed; };
    const a = nextChildSpanId(rand);
    const b = nextChildSpanId(rand);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});
