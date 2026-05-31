import { describe, it, expect } from 'vitest';
import { calibrateDtmConfidence } from '../dtmConfidenceCalibrator';

describe('dtmConfidenceCalibrator', () => {
  it('perfect inputs -> 1.0', () => {
    const r = calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 0, daysSinceLastAnswer: 0 });
    expect(r.confidence).toBe(1);
    expect(r.tier).toBe('high');
    expect(r.components).toEqual({ sampleSize: 1, consistency: 1, recency: 1 });
  });

  it('zero answers -> 0 confidence (sample size dominates)', () => {
    const r = calibrateDtmConfidence({ answeredCount: 0, vectorVariance: 0, daysSinceLastAnswer: 0 });
    expect(r.confidence).toBe(0);
    expect(r.tier).toBe('low');
  });

  it('high variance penalises confidence', () => {
    const a = calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 0.0, daysSinceLastAnswer: 0 });
    const b = calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 0.5, daysSinceLastAnswer: 0 });
    expect(b.confidence).toBeLessThan(a.confidence);
    expect(b.components.consistency).toBe(0.5);
  });

  it('staleness halves recency at staleDays', () => {
    const r = calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 0, daysSinceLastAnswer: 60 });
    expect(r.components.recency).toBeCloseTo(0.5, 6);
    expect(r.confidence).toBeCloseTo(0.5, 6);
  });

  it('recency clamps at 0 once 2*staleDays elapsed', () => {
    const r = calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 0, daysSinceLastAnswer: 9999 });
    expect(r.components.recency).toBe(0);
    expect(r.confidence).toBe(0);
  });

  it('sampleSize saturates at targetAnswers', () => {
    const r = calibrateDtmConfidence({ answeredCount: 999, vectorVariance: 0, daysSinceLastAnswer: 0 });
    expect(r.components.sampleSize).toBe(1);
  });

  it('honours custom targetAnswers / staleDays', () => {
    const r = calibrateDtmConfidence({
      answeredCount: 4, vectorVariance: 0, daysSinceLastAnswer: 7,
      targetAnswers: 4, staleDays: 7,
    });
    expect(r.components.sampleSize).toBe(1);
    expect(r.components.recency).toBeCloseTo(0.5, 6);
  });

  it('tier boundaries', () => {
    const low = calibrateDtmConfidence({ answeredCount: 2, vectorVariance: 0, daysSinceLastAnswer: 0 });
    expect(low.tier).toBe('low');
    const med = calibrateDtmConfidence({ answeredCount: 6, vectorVariance: 0, daysSinceLastAnswer: 0 });
    expect(med.tier).toBe('medium');
    const hi = calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 0.1, daysSinceLastAnswer: 5 });
    expect(hi.tier).toBe('high');
  });

  it('clamps variance into [0,1]', () => {
    expect(calibrateDtmConfidence({ answeredCount: 12, vectorVariance: -5, daysSinceLastAnswer: 0 }).components.consistency).toBe(1);
    expect(calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 9, daysSinceLastAnswer: 0 }).components.consistency).toBe(0);
  });

  it('handles negative days as 0', () => {
    const r = calibrateDtmConfidence({ answeredCount: 12, vectorVariance: 0, daysSinceLastAnswer: -10 });
    expect(r.components.recency).toBe(1);
  });
});
