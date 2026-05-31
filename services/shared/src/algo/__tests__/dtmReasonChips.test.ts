import { describe, it, expect } from 'vitest';
import { dtmReasonChips } from '../dtmReasonChips';

function v(arr: number[]): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < Math.min(arr.length, 16); i++) out[i] = arr[i];
  return out;
}

describe('dtmReasonChips', () => {
  it('returns empty lists for zero vectors', () => {
    const r = dtmReasonChips(v([]), v([]));
    expect(r.sharedStrengths).toEqual([]);
    expect(r.conversationStarters).toEqual([]);
  });

  it('returns empty lists when either side is null', () => {
    expect(dtmReasonChips(null, v([0.5]))).toEqual({ sharedStrengths: [], conversationStarters: [] });
    expect(dtmReasonChips(v([0.5]), null)).toEqual({ sharedStrengths: [], conversationStarters: [] });
  });

  it('detects shared strengths when both sides are high & gap is small', () => {
    const me   = v([0.6, 0.1, 0.7]);
    const cand = v([0.55, 0.1, 0.65]);
    const r = dtmReasonChips(me, cand);
    const keys = r.sharedStrengths.map((c) => c.topic);
    expect(keys).toContain('values');        // index 0
    expect(keys).toContain('communication'); // index 2
    expect(keys).not.toContain('lifestyle'); // index 1 — both too low
  });

  it('detects conversation starters when gap is large and at least one side is significant', () => {
    const me   = v([0.0, 0.7]);
    const cand = v([0.0, 0.0]);
    const r = dtmReasonChips(me, cand);
    const keys = r.conversationStarters.map((c) => c.topic);
    expect(keys).toContain('lifestyle');
  });

  it('does not surface near-zero overlap as either chip', () => {
    const me   = v([0.05, 0.04]);
    const cand = v([0.03, 0.02]);
    const r = dtmReasonChips(me, cand);
    expect(r.sharedStrengths).toHaveLength(0);
    expect(r.conversationStarters).toHaveLength(0);
  });

  it('respects topN', () => {
    const me   = v([0.6, 0.6, 0.6, 0.6, 0.6]);
    const cand = v([0.6, 0.6, 0.6, 0.6, 0.6]);
    const r = dtmReasonChips(me, cand, { topN: 2 });
    expect(r.sharedStrengths).toHaveLength(2);
  });

  it('sharedStrengths sorted by sharedFloor descending', () => {
    const me   = v([0.9, 0.5, 0.3]);
    const cand = v([0.85, 0.5, 0.3]);
    const r = dtmReasonChips(me, cand, { sharedFloorThreshold: 0.25 });
    const floors = r.sharedStrengths.map((c) => c.sharedFloor);
    for (let i = 1; i < floors.length; i++) {
      expect(floors[i - 1]).toBeGreaterThanOrEqual(floors[i]);
    }
  });

  it('conversationStarters sorted by gap descending', () => {
    const me   = v([0.9, 0.0, 0.7]);
    const cand = v([0.0, 0.6, 0.0]);
    const r = dtmReasonChips(me, cand);
    const gaps = r.conversationStarters.map((c) => c.gap);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1]).toBeGreaterThanOrEqual(gaps[i]);
    }
  });

  it('emits canonical labels and topics', () => {
    const me   = v([0.5, 0, 0, 0]);
    const cand = v([0.5, 0, 0, 0]);
    const r = dtmReasonChips(me, cand);
    expect(r.sharedStrengths[0]).toMatchObject({ topic: 'values', label: 'Values' });
  });
});
