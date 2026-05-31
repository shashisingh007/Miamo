import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReceptivityFlow, guardedDtmTopics } from '../dtmTopicReceptivityFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicReceptivityFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicReceptivityFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicReceptivityFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('open', () => {
    const r = summarizeDtmTopicReceptivityFlow([{ topic: 'values', signal: 'open' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('open');
  });

  it('receptive => mixed', () => {
    const r = summarizeDtmTopicReceptivityFlow([{ topic: 'values', signal: 'receptive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicReceptivityFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('guarded => closed', () => {
    const r = summarizeDtmTopicReceptivityFlow([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closed', () => {
    const r = summarizeDtmTopicReceptivityFlow([{ topic: 'values', signal: 'closed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('mid', () => {
    const r = summarizeDtmTopicReceptivityFlow([
      { topic: 'values', signal: 'open' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicReceptivityFlow([{ topic: 'x', signal: 'open' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicReceptivityFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicReceptivityFlow([
      { topic: 'values', signal: 'open' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('guardedDtmTopics filter', () => {
    const r = summarizeDtmTopicReceptivityFlow([
      { topic: 'values', signal: 'closed' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'open' },
    ]);
    expect(guardedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicReceptivityFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicReceptivityFlow([
      { topic: 'values', signal: 'open' },
      { topic: 'family', signal: 'closed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
