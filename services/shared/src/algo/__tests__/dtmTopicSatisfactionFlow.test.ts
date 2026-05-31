import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSatisfactionFlow,
  depletedDtmTopics,
} from '../dtmTopicSatisfactionFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSatisfactionFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSatisfactionFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicSatisfactionFlow([]).every((x) => x.band === 'untested')
    ).toBe(true);
  });

  it('fulfilled => content', () => {
    const r = summarizeDtmTopicSatisfactionFlow([{ topic: 'values', signal: 'fulfilled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('content');
  });

  it('content => mixed', () => {
    const r = summarizeDtmTopicSatisfactionFlow([{ topic: 'values', signal: 'content' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicSatisfactionFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('restless', () => {
    const r = summarizeDtmTopicSatisfactionFlow([{ topic: 'values', signal: 'restless' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleted');
  });

  it('depleted', () => {
    const r = summarizeDtmTopicSatisfactionFlow([{ topic: 'values', signal: 'depleted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleted');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicSatisfactionFlow([
      { topic: 'values', signal: 'fulfilled' },
      { topic: 'values', signal: 'depleted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('restless');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSatisfactionFlow([{ topic: 'x', signal: 'fulfilled' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSatisfactionFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSatisfactionFlow([
      { topic: 'values', signal: 'fulfilled' },
      { topic: 'values', signal: 'depleted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('depletedDtmTopics filter', () => {
    const r = summarizeDtmTopicSatisfactionFlow([
      { topic: 'values', signal: 'depleted' },
      { topic: 'family', signal: 'restless' },
      { topic: 'finance', signal: 'fulfilled' },
    ]);
    expect(depletedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSatisfactionFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicSatisfactionFlow([
      { topic: 'values', signal: 'fulfilled' },
      { topic: 'family', signal: 'depleted' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
