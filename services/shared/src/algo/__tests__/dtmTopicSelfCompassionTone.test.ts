import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSelfCompassionTone, harshSelfTalkDtmTopics } from '../dtmTopicSelfCompassionTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSelfCompassionTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSelfCompassionTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSelfCompassionTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('tender => kind', () => {
    const r = summarizeDtmTopicSelfCompassionTone([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('kind');
  });

  it('kind => neutral', () => {
    const r = summarizeDtmTopicSelfCompassionTone([{ topic: 'values', signal: 'kind' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neutral');
  });

  it('neutral => neutral', () => {
    const r = summarizeDtmTopicSelfCompassionTone([{ topic: 'values', signal: 'neutral' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neutral');
  });

  it('critical => harsh', () => {
    const r = summarizeDtmTopicSelfCompassionTone([{ topic: 'values', signal: 'critical' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('harsh => harsh', () => {
    const r = summarizeDtmTopicSelfCompassionTone([{ topic: 'values', signal: 'harsh' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('mixed 0.5 => critical', () => {
    const r = summarizeDtmTopicSelfCompassionTone([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('critical');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSelfCompassionTone([{ topic: 'x', signal: 'tender' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSelfCompassionTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSelfCompassionTone([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'critical' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('harshSelfTalkDtmTopics filter', () => {
    const r = summarizeDtmTopicSelfCompassionTone([
      { topic: 'values', signal: 'harsh' },
      { topic: 'family', signal: 'critical' },
      { topic: 'finance', signal: 'tender' },
    ]);
    expect(harshSelfTalkDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSelfCompassionTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSelfCompassionTone([
      { topic: 'values', signal: 'tender' },
      { topic: 'family', signal: 'harsh' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
