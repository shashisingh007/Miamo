import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCuriosityFlow, closedDtmTopics } from '../dtmTopicCuriosityFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCuriosityFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCuriosityFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCuriosityFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('curious => curious', () => {
    const r = summarizeDtmTopicCuriosityFlow([{ topic: 'values', signal: 'curious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('curious');
  });

  it('inquisitive => mixed', () => {
    const r = summarizeDtmTopicCuriosityFlow([{ topic: 'values', signal: 'inquisitive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicCuriosityFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('incurious => closed', () => {
    const r = summarizeDtmTopicCuriosityFlow([{ topic: 'values', signal: 'incurious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closedMinded => closed', () => {
    const r = summarizeDtmTopicCuriosityFlow([{ topic: 'values', signal: 'closedMinded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('mid => incurious', () => {
    const r = summarizeDtmTopicCuriosityFlow([
      { topic: 'values', signal: 'curious' },
      { topic: 'values', signal: 'closedMinded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('incurious');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCuriosityFlow([{ topic: 'x', signal: 'curious' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCuriosityFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCuriosityFlow([
      { topic: 'values', signal: 'curious' },
      { topic: 'values', signal: 'incurious' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('closedDtmTopics filter', () => {
    const r = summarizeDtmTopicCuriosityFlow([
      { topic: 'values', signal: 'closedMinded' },
      { topic: 'family', signal: 'incurious' },
      { topic: 'finance', signal: 'curious' },
    ]);
    expect(closedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCuriosityFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCuriosityFlow([
      { topic: 'values', signal: 'curious' },
      { topic: 'family', signal: 'closedMinded' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
