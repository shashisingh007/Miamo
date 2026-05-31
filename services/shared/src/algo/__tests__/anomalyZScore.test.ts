import { describe, it, expect } from 'vitest';
import { evaluateAnomalyZScore } from '../anomalyZScore';

describe('anomalyZScore', () => {
  it('flat baseline + equal current -> normal', () => {
    const r = evaluateAnomalyZScore([5, 5, 5, 5], 5);
    expect(r.isAnomaly).toBe(false);
    expect(r.severity).toBe('normal');
  });

  it('flat baseline + different current -> severe (stdDev=0)', () => {
    const r = evaluateAnomalyZScore([5, 5, 5], 7);
    expect(r.isAnomaly).toBe(true);
    expect(r.severity).toBe('severe');
  });

  it('within 1 stddev -> normal', () => {
    const r = evaluateAnomalyZScore([10, 11, 9, 10, 11, 9], 11);
    expect(r.isAnomaly).toBe(false);
  });

  it('beyond threshold -> anomaly', () => {
    const r = evaluateAnomalyZScore([10, 11, 9, 10, 11, 9], 100);
    expect(r.isAnomaly).toBe(true);
  });

  it('custom threshold honored', () => {
    const r = evaluateAnomalyZScore([10, 11, 9, 10, 11, 9], 14, { threshold: 2 });
    expect(r.isAnomaly).toBe(true);
  });

  it('mean and stdDev computed correctly', () => {
    const r = evaluateAnomalyZScore([2, 4, 4, 4, 5, 5, 7, 9], 5);
    expect(r.mean).toBe(5);
    expect(r.stdDev).toBeCloseTo(2, 5);
  });

  it('z sign correct (negative below mean)', () => {
    const r = evaluateAnomalyZScore([10, 12, 14], 8);
    expect(r.z).toBeLessThan(0);
  });

  it('empty / too-short baseline -> no-op', () => {
    expect(evaluateAnomalyZScore([], 5).isAnomaly).toBe(false);
    expect(evaluateAnomalyZScore([5], 5).isAnomaly).toBe(false);
  });

  it('non-finite current -> no-op', () => {
    expect(evaluateAnomalyZScore([1, 2, 3], NaN).isAnomaly).toBe(false);
  });

  it('NaN values filtered from baseline', () => {
    const r = evaluateAnomalyZScore([5, NaN, 5, 5], 5);
    expect(r.mean).toBe(5);
  });

  it('severity tiers minor/major/severe', () => {
    // threshold default 3; stddev=1, mean=0
    const baseline = [-1, 0, 1, -1, 0, 1, -1, 0, 1, 0];
    const minor = evaluateAnomalyZScore(baseline, 3);
    const major = evaluateAnomalyZScore(baseline, 6);
    const severe = evaluateAnomalyZScore(baseline, 20);
    expect(minor.severity === 'minor' || minor.severity === 'normal').toBe(true);
    expect(['major', 'severe']).toContain(major.severity);
    expect(severe.severity).toBe('severe');
  });

  it('non-positive threshold falls back to 3', () => {
    const r = evaluateAnomalyZScore([10, 11, 9, 10], 11, { threshold: 0 });
    expect(r.isAnomaly).toBe(false);
  });
});
