import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicAppreciationFlow,
  dismissedDtmTopics,
} from '../dtmTopicAppreciationFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAppreciationFlow', () => {
  it('returns 16', () => {
    const r = summarizeDtmTopicAppreciationFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty untested', () => {
    expect(summarizeDtmTopicAppreciationFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('specific-thanks => appreciated', () => {
    const r = summarizeDtmTopicAppreciationFlow([{ topic: 'family', signal: 'specific-thanks' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('appreciated');
  });

  it('general-thanks (0.8) => noticed', () => {
    const r = summarizeDtmTopicAppreciationFlow([{ topic: 'family', signal: 'general-thanks' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('noticed');
  });

  it('acknowledged (0.55) => noticed', () => {
    const r = summarizeDtmTopicAppreciationFlow([{ topic: 'family', signal: 'acknowledged' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('noticed');
  });

  it('overlooked (0.25) => dismissed', () => {
    const r = summarizeDtmTopicAppreciationFlow([{ topic: 'family', signal: 'overlooked' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('dismissed');
  });

  it('dismissed => dismissed', () => {
    const r = summarizeDtmTopicAppreciationFlow([{ topic: 'family', signal: 'dismissed' }]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('dismissed');
  });

  it('mixed (0.5) => overlooked', () => {
    const r = summarizeDtmTopicAppreciationFlow([
      { topic: 'family', signal: 'specific-thanks' },
      { topic: 'family', signal: 'dismissed' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('overlooked');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicAppreciationFlow([{ topic: 'xx', signal: 'specific-thanks' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicAppreciationFlow([{ topic: 'family', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'family')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAppreciationFlow([
      { topic: 'family', signal: 'specific-thanks' },
      { topic: 'family', signal: 'dismissed' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.n).toBe(2);
  });

  it('dismissedDtmTopics filters', () => {
    const r = summarizeDtmTopicAppreciationFlow([
      { topic: 'family', signal: 'dismissed' },
      { topic: 'leisure', signal: 'specific-thanks' },
    ]);
    expect(dismissedDtmTopics(r)).toHaveLength(1);
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicAppreciationFlow([
      { topic: 'family', signal: 'specific-thanks' },
      { topic: 'leisure', signal: 'dismissed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order', () => {
    const r = summarizeDtmTopicAppreciationFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
