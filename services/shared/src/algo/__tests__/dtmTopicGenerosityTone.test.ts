import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGenerosityTone, stingyDtmTopics } from '../dtmTopicGenerosityTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGenerosityTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGenerosityTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGenerosityTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('generous => generous', () => {
    const r = summarizeDtmTopicGenerosityTone([{ topic: 'values', signal: 'generous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('generous');
  });

  it('giving => mixed', () => {
    const r = summarizeDtmTopicGenerosityTone([{ topic: 'values', signal: 'giving' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicGenerosityTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('withholding => stingy', () => {
    const r = summarizeDtmTopicGenerosityTone([{ topic: 'values', signal: 'withholding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('stingy');
  });

  it('stingy => stingy', () => {
    const r = summarizeDtmTopicGenerosityTone([{ topic: 'values', signal: 'stingy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('stingy');
  });

  it('mixed midpoint => withholding', () => {
    const r = summarizeDtmTopicGenerosityTone([
      { topic: 'values', signal: 'generous' },
      { topic: 'values', signal: 'stingy' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withholding');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGenerosityTone([{ topic: 'x', signal: 'generous' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGenerosityTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGenerosityTone([
      { topic: 'values', signal: 'generous' },
      { topic: 'values', signal: 'withholding' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('stingyDtmTopics filter', () => {
    const r = summarizeDtmTopicGenerosityTone([
      { topic: 'values', signal: 'stingy' },
      { topic: 'family', signal: 'withholding' },
      { topic: 'finance', signal: 'generous' },
    ]);
    expect(stingyDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGenerosityTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGenerosityTone([
      { topic: 'values', signal: 'generous' },
      { topic: 'family', signal: 'stingy' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
