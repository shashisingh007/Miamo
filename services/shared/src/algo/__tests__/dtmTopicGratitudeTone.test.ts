import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGratitudeTone, resentfulDtmTopics } from '../dtmTopicGratitudeTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGratitudeTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGratitudeTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGratitudeTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('grateful', () => {
    const r = summarizeDtmTopicGratitudeTone([{ topic: 'values', signal: 'grateful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('grateful');
  });

  it('appreciative => mixed', () => {
    const r = summarizeDtmTopicGratitudeTone([{ topic: 'values', signal: 'appreciative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicGratitudeTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('entitled => resentful', () => {
    const r = summarizeDtmTopicGratitudeTone([{ topic: 'values', signal: 'entitled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resentful');
  });

  it('resentful', () => {
    const r = summarizeDtmTopicGratitudeTone([{ topic: 'values', signal: 'resentful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('resentful');
  });

  it('mid => entitled', () => {
    const r = summarizeDtmTopicGratitudeTone([
      { topic: 'values', signal: 'grateful' },
      { topic: 'values', signal: 'resentful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('entitled');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGratitudeTone([{ topic: 'x', signal: 'grateful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGratitudeTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGratitudeTone([
      { topic: 'values', signal: 'grateful' },
      { topic: 'values', signal: 'entitled' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('resentfulDtmTopics filter', () => {
    const r = summarizeDtmTopicGratitudeTone([
      { topic: 'values', signal: 'resentful' },
      { topic: 'family', signal: 'entitled' },
      { topic: 'finance', signal: 'grateful' },
    ]);
    expect(resentfulDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGratitudeTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGratitudeTone([
      { topic: 'values', signal: 'grateful' },
      { topic: 'family', signal: 'resentful' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
