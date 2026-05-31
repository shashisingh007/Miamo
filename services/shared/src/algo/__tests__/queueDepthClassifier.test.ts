import { describe, it, expect } from 'vitest';
import { summarizeQueueDepth } from '../queueDepthClassifier';

const NOW = 1_700_000_000_000;
const OPTS = { busyThreshold: 50, saturatedThreshold: 200, windowMs: 60_000 };

describe('queueDepthClassifier', () => {
  it('empty -> idle/flat', () => {
    const r = summarizeQueueDepth([], NOW, OPTS);
    expect(r.band).toBe('idle');
    expect(r.trend).toBe('flat');
  });

  it('single small depth -> normal', () => {
    const r = summarizeQueueDepth([{ tsMs: NOW, depth: 5 }], NOW, OPTS);
    expect(r.band).toBe('normal');
    expect(r.current).toBe(5);
  });

  it('crosses busy threshold', () => {
    const r = summarizeQueueDepth([{ tsMs: NOW, depth: 100 }], NOW, OPTS);
    expect(r.band).toBe('busy');
  });

  it('crosses saturated threshold', () => {
    const r = summarizeQueueDepth([{ tsMs: NOW, depth: 250 }], NOW, OPTS);
    expect(r.band).toBe('saturated');
  });

  it('drops samples outside window', () => {
    const r = summarizeQueueDepth(
      [
        { tsMs: NOW - 120_000, depth: 999 },
        { tsMs: NOW, depth: 10 },
      ],
      NOW,
      OPTS,
    );
    expect(r.current).toBe(10);
    expect(r.max).toBe(10);
  });

  it('drops future samples', () => {
    const r = summarizeQueueDepth([{ tsMs: NOW + 1, depth: 999 }], NOW, OPTS);
    expect(r.band).toBe('idle');
  });

  it('p50/p95/max computed', () => {
    const samples = Array.from({ length: 20 }, (_, i) => ({
      tsMs: NOW - i * 1_000,
      depth: i + 1, // 1..20
    }));
    const r = summarizeQueueDepth(samples, NOW, OPTS);
    expect(r.max).toBe(20);
    expect(r.p50).toBe(10);
    expect(r.p95).toBe(19);
  });

  it('rising trend detected', () => {
    const r = summarizeQueueDepth(
      [
        { tsMs: NOW - 30_000, depth: 5 },
        { tsMs: NOW - 20_000, depth: 20 },
        { tsMs: NOW - 10_000, depth: 40 },
        { tsMs: NOW, depth: 80 },
      ],
      NOW,
      OPTS,
    );
    expect(r.trend).toBe('rising');
  });

  it('falling trend detected', () => {
    const r = summarizeQueueDepth(
      [
        { tsMs: NOW - 30_000, depth: 100 },
        { tsMs: NOW - 10_000, depth: 50 },
        { tsMs: NOW, depth: 10 },
      ],
      NOW,
      OPTS,
    );
    expect(r.trend).toBe('falling');
  });

  it('flat trend within tolerance', () => {
    const r = summarizeQueueDepth(
      [
        { tsMs: NOW - 10_000, depth: 5 },
        { tsMs: NOW, depth: 5 },
      ],
      NOW,
      OPTS,
    );
    expect(r.trend).toBe('flat');
  });

  it('ignores invalid samples (NaN depth, negative ts)', () => {
    const r = summarizeQueueDepth(
      [
        { tsMs: NOW, depth: NaN } as any,
        { tsMs: -1, depth: 5 } as any,
        { tsMs: NOW, depth: 3 },
      ],
      NOW,
      OPTS,
    );
    expect(r.current).toBe(3);
  });

  it('saturated floor raised to busy', () => {
    const r = summarizeQueueDepth(
      [{ tsMs: NOW, depth: 60 }],
      NOW,
      { busyThreshold: 50, saturatedThreshold: 10 },
    );
    expect(r.band).toBe('saturated');
  });

  it('windowMs default = infinite (keeps all)', () => {
    const r = summarizeQueueDepth(
      [{ tsMs: NOW - 10 * 60_000, depth: 7 }],
      NOW,
      { busyThreshold: 50, saturatedThreshold: 200 },
    );
    expect(r.current).toBe(7);
  });
});
