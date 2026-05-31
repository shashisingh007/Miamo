import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHonestyWeight, dishonestDtmTopics } from '../dtmTopicHonestyWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHonestyWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHonestyWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHonestyWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('honest => honest', () => {
    const r = summarizeDtmTopicHonestyWeight([{ topic: 'values', signal: 'honest' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('honest');
  });

  it('candid => mixed', () => {
    const r = summarizeDtmTopicHonestyWeight([{ topic: 'values', signal: 'candid' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicHonestyWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('evasive => dishonest', () => {
    const r = summarizeDtmTopicHonestyWeight([{ topic: 'values', signal: 'evasive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dishonest');
  });

  it('dishonest => dishonest', () => {
    const r = summarizeDtmTopicHonestyWeight([{ topic: 'values', signal: 'dishonest' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dishonest');
  });

  it('mixed midpoint => evasive', () => {
    const r = summarizeDtmTopicHonestyWeight([
      { topic: 'values', signal: 'honest' },
      { topic: 'values', signal: 'dishonest' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('evasive');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHonestyWeight([{ topic: 'x', signal: 'honest' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHonestyWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHonestyWeight([
      { topic: 'values', signal: 'honest' },
      { topic: 'values', signal: 'evasive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('dishonestDtmTopics filter', () => {
    const r = summarizeDtmTopicHonestyWeight([
      { topic: 'values', signal: 'dishonest' },
      { topic: 'family', signal: 'evasive' },
      { topic: 'finance', signal: 'honest' },
    ]);
    expect(dishonestDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicHonestyWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicHonestyWeight([
      { topic: 'values', signal: 'honest' },
      { topic: 'family', signal: 'dishonest' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
