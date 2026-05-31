import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReinforcement } from '../dtmTopicReinforcement';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicReinforcement', () => {
  it('one row per topic in order', () => {
    const r = summarizeDtmTopicReinforcement(new Map());
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
    expect(r[0].topic).toBe(DTM_TOPIC_KEYS[0]);
  });

  it('empty inputs -> stable shift 0', () => {
    const r = summarizeDtmTopicReinforcement(new Map());
    expect(r.every((x) => x.shift === 0 && x.band === 'stable')).toBe(true);
  });

  it('reinforced when recent magnitude grew', () => {
    const r = summarizeDtmTopicReinforcement(
      new Map([['values', { recent: [0.9, 0.9], baseline: [0.3, 0.3] }]]),
    );
    const row = r.find((x) => x.topic === 'values')!;
    expect(row.shift).toBeCloseTo(0.6, 5);
    expect(row.band).toBe('reinforced');
  });

  it('weakened when recent magnitude shrank', () => {
    const r = summarizeDtmTopicReinforcement(
      new Map([['family', { recent: [0.1], baseline: [0.9] }]]),
    );
    expect(r.find((x) => x.topic === 'family')!.band).toBe('weakened');
  });

  it('stable within +/-0.1', () => {
    const r = summarizeDtmTopicReinforcement(
      new Map([['faith', { recent: [0.5], baseline: [0.45] }]]),
    );
    expect(r.find((x) => x.topic === 'faith')!.band).toBe('stable');
  });

  it('uses magnitudes (negative recent vs positive baseline)', () => {
    const r = summarizeDtmTopicReinforcement(
      new Map([['ambition', { recent: [-0.9], baseline: [0.2] }]]),
    );
    // |−0.9| − |0.2| = 0.7 -> reinforced
    expect(r.find((x) => x.topic === 'ambition')!.band).toBe('reinforced');
  });

  it('clamps out-of-range and ignores NaN', () => {
    const r = summarizeDtmTopicReinforcement(
      new Map([
        ['social', { recent: [5, NaN, 5], baseline: [0, 0, 0] }],
      ]),
    );
    expect(r.find((x) => x.topic === 'social')!.shift).toBe(1);
  });

  it('empty recent + non-empty baseline -> weakened by baseline magnitude', () => {
    const r = summarizeDtmTopicReinforcement(
      new Map([['health', { recent: [], baseline: [0.8] }]]),
    );
    expect(r.find((x) => x.topic === 'health')!.shift).toBeCloseTo(-0.8, 5);
  });

  it('shift boundary at +0.1 -> stable (strict)', () => {
    const r = summarizeDtmTopicReinforcement(
      new Map([['leisure', { recent: [0.6], baseline: [0.5] }]]),
    );
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('stable');
  });

  it('unknown topics ignored', () => {
    const m = new Map<any, any>([['notatopic', { recent: [1], baseline: [0] }]]);
    const r = summarizeDtmTopicReinforcement(m as any);
    expect(r.length).toBe(DTM_TOPIC_KEYS.length);
  });
});
