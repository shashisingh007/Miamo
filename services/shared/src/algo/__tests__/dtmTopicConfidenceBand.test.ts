import { describe, it, expect } from 'vitest';
import { computeDtmTopicConfidenceBand } from '../dtmTopicConfidenceBand';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

describe('dtmTopicConfidenceBand', () => {
  it('wrong-length -> empty', () => {
    const r = computeDtmTopicConfidenceBand([1, 2, 3]);
    expect(r).toEqual({ entries: [], coverage: 0, weakest: [], strongCount: 0 });
  });

  it('all zero -> all none, coverage 0', () => {
    const r = computeDtmTopicConfidenceBand(new Array(N).fill(0));
    expect(r.coverage).toBe(0);
    expect(r.entries.every((e) => e.band === 'none')).toBe(true);
    expect(r.strongCount).toBe(0);
  });

  it('all strong', () => {
    const r = computeDtmTopicConfidenceBand(new Array(N).fill(10));
    expect(r.entries.every((e) => e.band === 'strong')).toBe(true);
    expect(r.coverage).toBe(1);
    expect(r.strongCount).toBe(N);
  });

  it('bands at default thresholds', () => {
    const r = computeDtmTopicConfidenceBand([0, 1, 2, 3, 5, 6, 7, 10, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(r.entries[0].band).toBe('none');
    expect(r.entries[1].band).toBe('weak');
    expect(r.entries[2].band).toBe('weak');
    expect(r.entries[3].band).toBe('fair');
    expect(r.entries[6].band).toBe('strong'); // 7 >= fairMax=7
    expect(r.entries[7].band).toBe('strong');
  });

  it('weakest list returns lowest-answer entries', () => {
    const data = new Array(N).fill(10);
    data[5] = 0; data[6] = 1; data[7] = 2;
    const r = computeDtmTopicConfidenceBand(data);
    expect(r.weakest.map((e) => e.answers)).toEqual([0, 1, 2]);
  });

  it('custom thresholds honored', () => {
    const data = new Array(N).fill(0); data[0] = 1; data[1] = 4; data[2] = 9;
    const r = computeDtmTopicConfidenceBand(data, { weakMax: 2, fairMax: 5 });
    expect(r.entries[0].band).toBe('weak');
    expect(r.entries[1].band).toBe('fair');
    expect(r.entries[2].band).toBe('strong');
  });

  it('coverage = topicsWithAtLeastOne / N', () => {
    const data = new Array(N).fill(0); data[0] = 1; data[1] = 5;
    const r = computeDtmTopicConfidenceBand(data);
    expect(r.coverage).toBeCloseTo(2 / N, 6);
  });

  it('floors fractional / clamps negative / NaN', () => {
    const data = new Array(N).fill(0);
    data[0] = -3; data[1] = NaN as any; data[2] = 3.9;
    const r = computeDtmTopicConfidenceBand(data);
    expect(r.entries[0].answers).toBe(0);
    expect(r.entries[1].answers).toBe(0);
    expect(r.entries[2].answers).toBe(3); // floor(3.9)
    expect(r.entries[2].band).toBe('fair');
  });

  it('fairMax floor is weakMax+1', () => {
    const data = new Array(N).fill(0); data[0] = 3;
    const r = computeDtmTopicConfidenceBand(data, { weakMax: 5, fairMax: 1 });
    // fairMax bumped to 6, so 3 is weak
    expect(r.entries[0].band).toBe('weak');
  });

  it('entries length equals N', () => {
    const r = computeDtmTopicConfidenceBand(new Array(N).fill(2));
    expect(r.entries.length).toBe(N);
  });
});
