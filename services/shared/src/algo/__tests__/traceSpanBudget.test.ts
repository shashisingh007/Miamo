import { describe, it, expect } from 'vitest';
import { createTraceSpanBudget } from '../traceSpanBudget';

describe('traceSpanBudget', () => {
  it('admits below budget', () => {
    const b = createTraceSpanBudget({ maxSpansPerTrace: 5 });
    const r = b.admit('t1');
    expect(r.admit).toBe(true);
    expect(r.severity).toBe('ok');
    expect(r.count).toBe(1);
  });

  it('rejects after budget exhausted', () => {
    const b = createTraceSpanBudget({ maxSpansPerTrace: 3 });
    expect(b.admit('t1').admit).toBe(true);
    expect(b.admit('t1').admit).toBe(true);
    expect(b.admit('t1').admit).toBe(true);
    const r = b.admit('t1');
    expect(r.admit).toBe(false);
    expect(r.severity).toBe('over');
    expect(r.count).toBe(3);
  });

  it('near severity at warnAtRatio', () => {
    const b = createTraceSpanBudget({ maxSpansPerTrace: 10, warnAtRatio: 0.8 });
    for (let i = 0; i < 7; i++) expect(b.admit('t1').severity).toBe('ok');
    expect(b.admit('t1').severity).toBe('near'); // 8
    expect(b.admit('t1').severity).toBe('near'); // 9
    expect(b.admit('t1').severity).toBe('over'); // 10 (final admit hits cap)
    expect(b.admit('t1').admit).toBe(false);
  });

  it('isolates separate traces', () => {
    const b = createTraceSpanBudget({ maxSpansPerTrace: 2 });
    b.admit('a'); b.admit('a');
    expect(b.admit('a').admit).toBe(false);
    expect(b.admit('b').admit).toBe(true);
  });

  it('empty traceId rejected', () => {
    const b = createTraceSpanBudget();
    expect(b.admit('').admit).toBe(false);
  });

  it('count() reports current', () => {
    const b = createTraceSpanBudget();
    b.admit('x'); b.admit('x');
    expect(b.count('x')).toBe(2);
    expect(b.count('y')).toBe(0);
  });

  it('reset() clears everything', () => {
    const b = createTraceSpanBudget();
    b.admit('x'); b.admit('y');
    b.reset();
    expect(b.tracesTracked()).toBe(0);
    expect(b.admit('x').count).toBe(1);
  });

  it('LRU evicts oldest trace', () => {
    const b = createTraceSpanBudget({ maxTracesTracked: 3 });
    b.admit('a'); b.admit('b'); b.admit('c');
    b.admit('d'); // should evict 'a'
    expect(b.count('a')).toBe(0);
    expect(b.tracesTracked()).toBe(3);
  });

  it('admitting existing trace refreshes its LRU position', () => {
    const b = createTraceSpanBudget({ maxTracesTracked: 3 });
    b.admit('a'); b.admit('b'); b.admit('c');
    b.admit('a'); // refresh \u2014 now 'b' is oldest
    b.admit('d'); // should evict 'b'
    expect(b.count('b')).toBe(0);
    expect(b.count('a')).toBe(2);
  });

  it('clamps warnAtRatio outside [0,1]', () => {
    const b = createTraceSpanBudget({ maxSpansPerTrace: 5, warnAtRatio: 5 });
    // warn ratio clamped to 1 \u2014 only 'near' at count == max
    expect(b.admit('t').severity).toBe('ok'); // 1
  });
});
