import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWonderingTone, closedDtmTopics } from '../dtmTopicWonderingTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWonderingTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWonderingTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWonderingTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('wondering', () => {
    const r = summarizeDtmTopicWonderingTone([{ topic: 'values', signal: 'wondering' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('wondering');
  });

  it('curious => mixed', () => {
    const r = summarizeDtmTopicWonderingTone([{ topic: 'values', signal: 'curious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicWonderingTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flat => closed', () => {
    const r = summarizeDtmTopicWonderingTone([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closed', () => {
    const r = summarizeDtmTopicWonderingTone([{ topic: 'values', signal: 'closed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('mid', () => {
    const r = summarizeDtmTopicWonderingTone([
      { topic: 'values', signal: 'wondering' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWonderingTone([{ topic: 'x', signal: 'wondering' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWonderingTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWonderingTone([
      { topic: 'values', signal: 'wondering' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('closedDtmTopics filter', () => {
    const r = summarizeDtmTopicWonderingTone([
      { topic: 'values', signal: 'closed' },
      { topic: 'family', signal: 'flat' },
      { topic: 'finance', signal: 'wondering' },
    ]);
    expect(closedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicWonderingTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWonderingTone([
      { topic: 'values', signal: 'wondering' },
      { topic: 'family', signal: 'closed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
