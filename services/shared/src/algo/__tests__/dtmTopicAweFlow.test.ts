import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAweFlow, numbDtmTopics } from '../dtmTopicAweFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAweFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAweFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAweFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('transcendent => wonder band', () => {
    const r = summarizeDtmTopicAweFlow([{ topic: 'values', signal: 'transcendent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wonder');
  });

  it('wonder => mixed band', () => {
    const r = summarizeDtmTopicAweFlow([{ topic: 'values', signal: 'wonder' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAweFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flat', () => {
    const r = summarizeDtmTopicAweFlow([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('numb');
  });

  it('numb', () => {
    const r = summarizeDtmTopicAweFlow([{ topic: 'values', signal: 'numb' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('numb');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicAweFlow([
      { topic: 'values', signal: 'transcendent' },
      { topic: 'values', signal: 'numb' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAweFlow([{ topic: 'x', signal: 'transcendent' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAweFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAweFlow([
      { topic: 'values', signal: 'transcendent' },
      { topic: 'values', signal: 'numb' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('numbDtmTopics filter', () => {
    const r = summarizeDtmTopicAweFlow([
      { topic: 'values', signal: 'numb' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'transcendent' },
    ]);
    expect(numbDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAweFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicAweFlow([
      { topic: 'values', signal: 'transcendent' },
      { topic: 'family', signal: 'numb' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
