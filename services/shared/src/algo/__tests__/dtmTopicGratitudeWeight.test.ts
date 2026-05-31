import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicGratitudeWeight,
  ungratefulDtmTopics,
} from '../dtmTopicGratitudeWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGratitudeWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGratitudeWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicGratitudeWeight([]).every((x) => x.band === 'untested')
    ).toBe(true);
  });

  it('profound => grateful', () => {
    const r = summarizeDtmTopicGratitudeWeight([{ topic: 'values', signal: 'profound' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('grateful');
  });

  it('grateful => mixed', () => {
    const r = summarizeDtmTopicGratitudeWeight([{ topic: 'values', signal: 'grateful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicGratitudeWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('sparing', () => {
    const r = summarizeDtmTopicGratitudeWeight([{ topic: 'values', signal: 'sparing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent', () => {
    const r = summarizeDtmTopicGratitudeWeight([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mid mix => sparing', () => {
    const r = summarizeDtmTopicGratitudeWeight([
      { topic: 'values', signal: 'profound' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sparing');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGratitudeWeight([{ topic: 'x', signal: 'profound' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGratitudeWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGratitudeWeight([
      { topic: 'values', signal: 'profound' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('ungrateful filter', () => {
    const r = summarizeDtmTopicGratitudeWeight([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'sparing' },
      { topic: 'finance', signal: 'profound' },
    ]);
    expect(ungratefulDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGratitudeWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicGratitudeWeight([
      { topic: 'values', signal: 'profound' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
