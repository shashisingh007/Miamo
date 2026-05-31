import { describe, it, expect } from 'vitest';
import { detectDtmDrift } from '../dtmDrift';

function v(arr: number[]): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < Math.min(arr.length, 16); i++) out[i] = arr[i];
  return out;
}

describe('detectDtmDrift', () => {
  it('no drift for identical vectors', () => {
    const a = v([0.5, 0.5, 0.5, 0.5]);
    const r = detectDtmDrift(a, a, { currentExplorationRate: 0.10 });
    expect(r.drifted).toBe(false);
    expect(r.l1).toBe(0);
    expect(r.maxPerTopic).toBe(0);
    expect(r.newExplorationRate).toBe(0.10);
  });

  it('detects drift when L1 exceeds threshold', () => {
    const a = v([0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    const b = v([0.2, 0.2, 0.2, 0.2, 0.2, 0.2]); // L1 = 0.6
    const r = detectDtmDrift(a, b);
    expect(r.drifted).toBe(true);
    expect(r.l1).toBeCloseTo(0.6, 6);
  });

  it('detects drift when single topic exceeds perTopic threshold', () => {
    const a = v([0.0]);
    const b = v([0.20]); // single-topic delta = 0.20 > default 0.12
    const r = detectDtmDrift(a, b, { l1Threshold: 999 });
    expect(r.drifted).toBe(true);
    expect(r.topTopic).toBe('values');
  });

  it('reports topTopic for the biggest delta', () => {
    const a = v([0.0, 0.0, 0.0]);
    const b = v([0.05, 0.30, 0.10]);
    const r = detectDtmDrift(a, b);
    expect(r.topTopic).toBe('lifestyle');
    expect(r.maxPerTopic).toBeCloseTo(0.30, 6);
  });

  it('boosts exploration rate when drifted', () => {
    const a = v([0]);
    const b = v([0.5]); // huge drift
    const r = detectDtmDrift(a, b, { currentExplorationRate: 0.10, explorationBoost: 1.5 });
    expect(r.newExplorationRate).toBeCloseTo(0.15, 6);
  });

  it('clamps exploration to MAX_EXPLORATION (0.40)', () => {
    const a = v([0]);
    const b = v([1]);
    const r = detectDtmDrift(a, b, { currentExplorationRate: 0.50, explorationBoost: 1.5 });
    expect(r.newExplorationRate).toBeLessThanOrEqual(0.40);
  });

  it('clamps exploration to MIN_EXPLORATION (0.05) when current is tiny', () => {
    const a = v([0]);
    const b = v([1]);
    const r = detectDtmDrift(a, b, { currentExplorationRate: 0.001, explorationBoost: 1.5 });
    expect(r.newExplorationRate).toBeGreaterThanOrEqual(0.05);
  });

  it('handles null inputs as zero-vectors', () => {
    const r1 = detectDtmDrift(null, v([0.5]));
    expect(r1.drifted).toBe(true);
    const r2 = detectDtmDrift(null, null);
    expect(r2.drifted).toBe(false);
    expect(r2.l1).toBe(0);
  });

  it('perTopicDelta length is always DTM_TOPIC_COUNT', () => {
    const r = detectDtmDrift(v([1, 1]), v([0, 0]));
    expect(r.perTopicDelta).toHaveLength(16);
  });
});
