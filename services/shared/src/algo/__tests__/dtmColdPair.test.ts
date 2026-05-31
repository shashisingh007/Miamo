import { describe, it, expect } from 'vitest';
import { resolveDtmColdPair } from '../dtmColdPair';

describe('dtmColdPair', () => {
  it('full coverage on both sides -> raw score wins, ready state', () => {
    const r = resolveDtmColdPair({ rawScore: 0.9, meAnswered: 12, candAnswered: 12 });
    expect(r.pairCoverage).toBe(1);
    expect(r.score).toBeCloseTo(0.9, 6);
    expect(r.state).toBe('ready');
    expect(r.showConfidence).toBe(true);
  });

  it('zero coverage -> neutral 0.5, cold state, hide confidence', () => {
    const r = resolveDtmColdPair({ rawScore: 0.9, meAnswered: 0, candAnswered: 0 });
    expect(r.pairCoverage).toBe(0);
    expect(r.score).toBe(0.5);
    expect(r.state).toBe('cold');
    expect(r.showConfidence).toBe(false);
  });

  it('one side cold drags the pair coverage down (min of the two)', () => {
    const r = resolveDtmColdPair({ rawScore: 1, meAnswered: 12, candAnswered: 1 });
    // covCa = 1/12 \u2248 0.0833 -> cold
    expect(r.pairCoverage).toBeCloseTo(1 / 12, 6);
    expect(r.state).toBe('cold');
  });

  it('warm state between 0.25 and 0.75 coverage', () => {
    const r = resolveDtmColdPair({ rawScore: 0.8, meAnswered: 6, candAnswered: 6 });
    expect(r.pairCoverage).toBe(0.5);
    expect(r.state).toBe('warm');
    expect(r.score).toBeCloseTo(0.8 * 0.5 + 0.5 * 0.5, 6);
  });

  it('honours custom minAnswers', () => {
    const r = resolveDtmColdPair({ rawScore: 0.9, meAnswered: 5, candAnswered: 5, minAnswers: 5 });
    expect(r.pairCoverage).toBe(1);
    expect(r.score).toBeCloseTo(0.9, 6);
  });

  it('honours custom neutral', () => {
    const r = resolveDtmColdPair({ rawScore: 0.9, meAnswered: 0, candAnswered: 0, neutralScore: 0.2 });
    expect(r.score).toBe(0.2);
  });

  it('clamps raw and neutral scores into [0,1]', () => {
    const r = resolveDtmColdPair({ rawScore: 99, meAnswered: 12, candAnswered: 12 });
    expect(r.score).toBe(1);
    const r2 = resolveDtmColdPair({ rawScore: -5, meAnswered: 12, candAnswered: 12 });
    expect(r2.score).toBe(0);
  });

  it('coverage caps at 1 when answered > minAnswers', () => {
    const r = resolveDtmColdPair({ rawScore: 0.7, meAnswered: 100, candAnswered: 100 });
    expect(r.pairCoverage).toBe(1);
    expect(r.score).toBeCloseTo(0.7, 6);
  });

  it('threshold boundaries inclusive of warm/ready', () => {
    const w = resolveDtmColdPair({ rawScore: 0.5, meAnswered: 3, candAnswered: 3 });   // cov=0.25
    expect(w.state).toBe('warm');
    const r = resolveDtmColdPair({ rawScore: 0.5, meAnswered: 9, candAnswered: 9 });   // cov=0.75
    expect(r.state).toBe('ready');
  });
});
