import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGratitudeExpression, absentGratitudeDtmTopics } from '../dtmTopicGratitudeExpression';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGratitudeExpression', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGratitudeExpression([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGratitudeExpression([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('effusive => grateful', () => {
    const r = summarizeDtmTopicGratitudeExpression([{ topic: 'values', signal: 'effusive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('grateful');
  });

  it('grateful => polite', () => {
    const r = summarizeDtmTopicGratitudeExpression([{ topic: 'values', signal: 'grateful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('polite');
  });

  it('polite => polite', () => {
    const r = summarizeDtmTopicGratitudeExpression([{ topic: 'values', signal: 'polite' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('polite');
  });

  it('sparing => absent', () => {
    const r = summarizeDtmTopicGratitudeExpression([{ topic: 'values', signal: 'sparing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent => absent', () => {
    const r = summarizeDtmTopicGratitudeExpression([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mixed 0.5 => sparing', () => {
    const r = summarizeDtmTopicGratitudeExpression([
      { topic: 'values', signal: 'effusive' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sparing');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGratitudeExpression([{ topic: 'x', signal: 'grateful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGratitudeExpression([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGratitudeExpression([
      { topic: 'values', signal: 'grateful' },
      { topic: 'values', signal: 'polite' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('absentGratitudeDtmTopics filters', () => {
    const r = summarizeDtmTopicGratitudeExpression([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'sparing' },
      { topic: 'finance', signal: 'effusive' },
    ]);
    expect(absentGratitudeDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicGratitudeExpression([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGratitudeExpression([
      { topic: 'values', signal: 'effusive' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
