import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicForgivenessFlow, resentfulDtmTopics } from '../dtmTopicForgivenessFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicForgivenessFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicForgivenessFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicForgivenessFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('forgiving => forgiving', () => {
    const r = summarizeDtmTopicForgivenessFlow([{ topic: 'values', signal: 'forgiving' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('forgiving');
  });

  it('softening => mixed', () => {
    const r = summarizeDtmTopicForgivenessFlow([{ topic: 'values', signal: 'softening' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicForgivenessFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('guarded => resentful', () => {
    const r = summarizeDtmTopicForgivenessFlow([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resentful');
  });

  it('resentful => resentful', () => {
    const r = summarizeDtmTopicForgivenessFlow([{ topic: 'values', signal: 'resentful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resentful');
  });

  it('mixed midpoint => guarded', () => {
    const r = summarizeDtmTopicForgivenessFlow([
      { topic: 'values', signal: 'forgiving' },
      { topic: 'values', signal: 'resentful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicForgivenessFlow([{ topic: 'x', signal: 'forgiving' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicForgivenessFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicForgivenessFlow([
      { topic: 'values', signal: 'forgiving' },
      { topic: 'values', signal: 'guarded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('resentfulDtmTopics filter', () => {
    const r = summarizeDtmTopicForgivenessFlow([
      { topic: 'values', signal: 'resentful' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'forgiving' },
    ]);
    expect(resentfulDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicForgivenessFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicForgivenessFlow([
      { topic: 'values', signal: 'forgiving' },
      { topic: 'family', signal: 'resentful' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
