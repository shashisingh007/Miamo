import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicPatienceFlow, reactiveDtmTopics } from '../dtmTopicPatienceFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicPatienceFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicPatienceFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicPatienceFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('steady => slow band', () => {
    const r = summarizeDtmTopicPatienceFlow([{ topic: 'values', signal: 'steady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('slow');
  });

  it('slow => mixed', () => {
    const r = summarizeDtmTopicPatienceFlow([{ topic: 'values', signal: 'slow' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicPatienceFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('urgent', () => {
    const r = summarizeDtmTopicPatienceFlow([{ topic: 'values', signal: 'urgent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reactive');
  });

  it('reactive', () => {
    const r = summarizeDtmTopicPatienceFlow([{ topic: 'values', signal: 'reactive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reactive');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicPatienceFlow([
      { topic: 'values', signal: 'steady' },
      { topic: 'values', signal: 'reactive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('urgent');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicPatienceFlow([{ topic: 'x', signal: 'steady' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicPatienceFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicPatienceFlow([
      { topic: 'values', signal: 'steady' },
      { topic: 'values', signal: 'reactive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('reactiveDtmTopics filter', () => {
    const r = summarizeDtmTopicPatienceFlow([
      { topic: 'values', signal: 'reactive' },
      { topic: 'family', signal: 'urgent' },
      { topic: 'finance', signal: 'steady' },
    ]);
    expect(reactiveDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicPatienceFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicPatienceFlow([
      { topic: 'values', signal: 'steady' },
      { topic: 'family', signal: 'reactive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
