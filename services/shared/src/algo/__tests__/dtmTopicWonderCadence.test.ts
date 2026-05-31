import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWonderCadence, numbDtmTopics } from '../dtmTopicWonderCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWonderCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWonderCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWonderCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('awe => wondrous', () => {
    const r = summarizeDtmTopicWonderCadence([{ topic: 'values', signal: 'awe' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wondrous');
  });

  it('wonder => mixed', () => {
    const r = summarizeDtmTopicWonderCadence([{ topic: 'values', signal: 'wonder' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicWonderCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flat => numb', () => {
    const r = summarizeDtmTopicWonderCadence([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('numb');
  });

  it('numb => numb', () => {
    const r = summarizeDtmTopicWonderCadence([{ topic: 'values', signal: 'numb' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('numb');
  });

  it('mixed midpoint => flat', () => {
    const r = summarizeDtmTopicWonderCadence([
      { topic: 'values', signal: 'awe' },
      { topic: 'values', signal: 'numb' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWonderCadence([{ topic: 'x', signal: 'awe' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWonderCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWonderCadence([
      { topic: 'values', signal: 'awe' },
      { topic: 'values', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('numbDtmTopics filter', () => {
    const r = summarizeDtmTopicWonderCadence([
      { topic: 'values', signal: 'numb' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'awe' },
    ]);
    expect(numbDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicWonderCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWonderCadence([
      { topic: 'values', signal: 'awe' },
      { topic: 'family', signal: 'numb' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
