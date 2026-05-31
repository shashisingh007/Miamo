import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicJoyWeight, joylessDtmTopics } from '../dtmTopicJoyWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicJoyWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicJoyWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicJoyWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('radiant => joyful', () => {
    const r = summarizeDtmTopicJoyWeight([{ topic: 'values', signal: 'radiant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('joyful');
  });

  it('joyful => mixed', () => {
    const r = summarizeDtmTopicJoyWeight([{ topic: 'values', signal: 'joyful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicJoyWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flat', () => {
    const r = summarizeDtmTopicJoyWeight([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('joyless');
  });

  it('joyless', () => {
    const r = summarizeDtmTopicJoyWeight([{ topic: 'values', signal: 'joyless' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('joyless');
  });

  it('mid mix => flat', () => {
    const r = summarizeDtmTopicJoyWeight([
      { topic: 'values', signal: 'radiant' },
      { topic: 'values', signal: 'joyless' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicJoyWeight([{ topic: 'x', signal: 'radiant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicJoyWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicJoyWeight([
      { topic: 'values', signal: 'radiant' },
      { topic: 'values', signal: 'joyless' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('joyless filter', () => {
    const r = summarizeDtmTopicJoyWeight([
      { topic: 'values', signal: 'joyless' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'radiant' },
    ]);
    expect(joylessDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicJoyWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicJoyWeight([
      { topic: 'values', signal: 'radiant' },
      { topic: 'family', signal: 'joyless' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
