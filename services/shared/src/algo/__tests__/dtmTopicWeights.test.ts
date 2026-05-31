import { describe, it, expect } from 'vitest';
import { buildDtmTopicWeights, applyTopicWeights } from '../dtmTopicWeights';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const ALL_COVERED = Array(16).fill(true);
const NONE_COVERED = Array(16).fill(false);

describe('buildDtmTopicWeights', () => {
  it('returns 16 weights summing to 1', () => {
    const w = buildDtmTopicWeights({ covered: ALL_COVERED });
    expect(w.length).toBe(16);
    let s = 0; for (const x of w) s += x;
    expect(s).toBeCloseTo(1, 5);
  });
  it('all-covered uniform weights = 1/16 each', () => {
    const w = buildDtmTopicWeights({ covered: ALL_COVERED });
    for (const x of w) expect(x).toBeCloseTo(1/16, 6);
  });
  it('uncovered topics get quarter weight', () => {
    const cov = ALL_COVERED.slice();
    cov[0] = false;
    const w = buildDtmTopicWeights({ covered: cov });
    // expected raw: 0.25 + 15*1.0 = 15.25; weight[0] = 0.25/15.25
    expect(w[0]).toBeCloseTo(0.25 / 15.25, 5);
  });
  it('positive-feedback topic gets +0.5 boost', () => {
    const w = buildDtmTopicWeights({
      covered: ALL_COVERED,
      positiveFeedbackTopics: ['values'],
    });
    // raw values weight = 1.5, others = 1; sum = 16.5
    expect(w[0]).toBeCloseTo(1.5 / 16.5, 5);
  });
  it('degenerate (no coverage, no boost) falls back to uniform', () => {
    const w = buildDtmTopicWeights({ covered: NONE_COVERED });
    let s = 0; for (const x of w) s += x;
    expect(s).toBeCloseTo(1, 5);
    for (const x of w) expect(x).toBeCloseTo(1/16, 4);
  });
  it('respects canonical DTM_TOPIC_KEYS ordering', () => {
    const w = buildDtmTopicWeights({
      covered: ALL_COVERED,
      positiveFeedbackTopics: [DTM_TOPIC_KEYS[5]],
    });
    // weight at index 5 should be > 1/16
    expect(w[5]).toBeGreaterThan(1/16);
  });
});

describe('applyTopicWeights', () => {
  it('returns weighted dot product', () => {
    const w = new Float32Array(16); for (let i = 0; i < 16; i++) w[i] = 1/16;
    const d = new Float32Array(16); for (let i = 0; i < 16; i++) d[i] = 2;
    expect(applyTopicWeights(d, w)).toBeCloseTo(2, 6);
  });
  it('handles shorter delta safely', () => {
    const w = new Float32Array(16); for (let i = 0; i < 16; i++) w[i] = 1/16;
    const d = new Float32Array(4);  for (let i = 0; i < 4; i++)  d[i] = 4;
    expect(applyTopicWeights(d, w)).toBeCloseTo(4 * (4 / 16), 6);
  });
});
