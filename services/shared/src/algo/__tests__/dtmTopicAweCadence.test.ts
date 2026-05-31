import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAweCadence, numbDtmTopics } from '../dtmTopicAweCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAweCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAweCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAweCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('transcendent => awed', () => {
    const r = summarizeDtmTopicAweCadence([{ topic: 'values', signal: 'transcendent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('awed');
  });

  it('awed => mixed', () => {
    const r = summarizeDtmTopicAweCadence([{ topic: 'values', signal: 'awed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicAweCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flat => numb', () => {
    const r = summarizeDtmTopicAweCadence([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('numb');
  });

  it('numb => numb', () => {
    const r = summarizeDtmTopicAweCadence([{ topic: 'values', signal: 'numb' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('numb');
  });

  it('mixed midpoint => flat', () => {
    const r = summarizeDtmTopicAweCadence([
      { topic: 'values', signal: 'transcendent' },
      { topic: 'values', signal: 'numb' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAweCadence([{ topic: 'x', signal: 'transcendent' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAweCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAweCadence([
      { topic: 'values', signal: 'transcendent' },
      { topic: 'values', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('numbDtmTopics filter', () => {
    const r = summarizeDtmTopicAweCadence([
      { topic: 'values', signal: 'numb' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'transcendent' },
    ]);
    expect(numbDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAweCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAweCadence([
      { topic: 'values', signal: 'transcendent' },
      { topic: 'family', signal: 'numb' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
