import { describe, it, expect } from 'vitest';
import { createErrorRateWindow } from '../errorRateSlidingWindow';

describe('errorRateSlidingWindow', () => {
  it('empty -> rates 0', () => {
    const w = createErrorRateWindow();
    expect(w.snapshot()).toEqual({
      shortRate: 0, longRate: 0, shortTotal: 0, longTotal: 0, spike: false,
    });
  });

  it('uniform success -> rate 0', () => {
    const w = createErrorRateWindow({ shortSeconds: 5, longSeconds: 10 });
    for (let i = 0; i < 5; i++) w.record({ ok: 10 });
    const s = w.snapshot();
    expect(s.shortRate).toBe(0);
    expect(s.shortTotal).toBe(50);
  });

  it('uniform errors -> rate 1', () => {
    const w = createErrorRateWindow({ shortSeconds: 5, longSeconds: 10 });
    for (let i = 0; i < 5; i++) w.record({ err: 10 });
    const s = w.snapshot();
    expect(s.shortRate).toBe(1);
  });

  it('short window evicts old data', () => {
    const w = createErrorRateWindow({ shortSeconds: 3, longSeconds: 100 });
    // 3 secs of errors then 3 secs of success -> short rate should be 0
    for (let i = 0; i < 3; i++) w.record({ err: 10 });
    for (let i = 0; i < 3; i++) w.record({ ok: 10 });
    const s = w.snapshot();
    expect(s.shortRate).toBe(0);
    expect(s.longRate).toBeCloseTo(0.5, 6);
  });

  it('spike fires when short rate >> long rate', () => {
    const w = createErrorRateWindow({
      shortSeconds: 5,
      longSeconds: 100,
      spikeRatio: 5,
      spikeMinShortErrors: 5,
    });
    // 95s of mostly success
    for (let i = 0; i < 95; i++) w.record({ ok: 100, err: 1 });
    // 5s burst of errors
    for (let i = 0; i < 5; i++) w.record({ err: 50 });
    const s = w.snapshot();
    expect(s.shortRate).toBe(1);
    expect(s.spike).toBe(true);
  });

  it('spike does NOT fire below minShortErrors', () => {
    const w = createErrorRateWindow({
      shortSeconds: 5, longSeconds: 100,
      spikeRatio: 5, spikeMinShortErrors: 100,
    });
    for (let i = 0; i < 95; i++) w.record({ ok: 100, err: 1 });
    for (let i = 0; i < 5; i++) w.record({ err: 1 });
    const s = w.snapshot();
    expect(s.spike).toBe(false);
  });

  it('spike does NOT fire when long rate is 0', () => {
    const w = createErrorRateWindow({ shortSeconds: 5, longSeconds: 10, spikeMinShortErrors: 1 });
    for (let i = 0; i < 5; i++) w.record({ err: 10 });
    const s = w.snapshot();
    expect(s.spike).toBe(false);
  });

  it('reset() clears all counts', () => {
    const w = createErrorRateWindow({ shortSeconds: 5, longSeconds: 10 });
    for (let i = 0; i < 5; i++) w.record({ err: 10 });
    w.reset();
    const s = w.snapshot();
    expect(s.shortTotal).toBe(0);
    expect(s.longTotal).toBe(0);
  });

  it('clamps negative inputs', () => {
    const w = createErrorRateWindow({ shortSeconds: 2, longSeconds: 4 });
    w.record({ ok: -5, err: -10 });
    expect(w.snapshot().shortTotal).toBe(0);
  });

  it('long window includes data outside short window', () => {
    const w = createErrorRateWindow({ shortSeconds: 2, longSeconds: 6 });
    for (let i = 0; i < 4; i++) w.record({ err: 10 });
    for (let i = 0; i < 2; i++) w.record({ ok: 10 });
    const s = w.snapshot();
    expect(s.shortRate).toBe(0);
    expect(s.longRate).toBeCloseTo(40 / 60, 6);
  });
});
