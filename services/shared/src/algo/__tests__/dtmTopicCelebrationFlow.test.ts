import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCelebrationFlow, silentDtmTopics } from '../dtmTopicCelebrationFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCelebrationFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCelebrationFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCelebrationFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('jubilant => celebratory', () => {
    const r = summarizeDtmTopicCelebrationFlow([{ topic: 'values', signal: 'jubilant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('celebratory');
  });

  it('celebratory signal => mixed', () => {
    const r = summarizeDtmTopicCelebrationFlow([{ topic: 'values', signal: 'celebratory' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicCelebrationFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('subdued => silent', () => {
    const r = summarizeDtmTopicCelebrationFlow([{ topic: 'values', signal: 'subdued' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('silent');
  });

  it('silent => silent', () => {
    const r = summarizeDtmTopicCelebrationFlow([{ topic: 'values', signal: 'silent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('silent');
  });

  it('mixed midpoint => subdued', () => {
    const r = summarizeDtmTopicCelebrationFlow([
      { topic: 'values', signal: 'jubilant' },
      { topic: 'values', signal: 'silent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('subdued');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCelebrationFlow([{ topic: 'x', signal: 'jubilant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCelebrationFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCelebrationFlow([
      { topic: 'values', signal: 'jubilant' },
      { topic: 'values', signal: 'subdued' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('silentDtmTopics filter', () => {
    const r = summarizeDtmTopicCelebrationFlow([
      { topic: 'values', signal: 'silent' },
      { topic: 'family', signal: 'subdued' },
      { topic: 'finance', signal: 'jubilant' },
    ]);
    expect(silentDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCelebrationFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCelebrationFlow([
      { topic: 'values', signal: 'jubilant' },
      { topic: 'family', signal: 'silent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
