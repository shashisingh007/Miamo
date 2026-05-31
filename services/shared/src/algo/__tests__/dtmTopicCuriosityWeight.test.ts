import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCuriosityWeight, closedDtmTopics } from '../dtmTopicCuriosityWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCuriosityWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCuriosityWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCuriosityWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('curious => open band', () => {
    const r = summarizeDtmTopicCuriosityWeight([{ topic: 'values', signal: 'curious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('open');
  });

  it('open => mixed', () => {
    const r = summarizeDtmTopicCuriosityWeight([{ topic: 'values', signal: 'open' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicCuriosityWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('guarded', () => {
    const r = summarizeDtmTopicCuriosityWeight([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closed', () => {
    const r = summarizeDtmTopicCuriosityWeight([{ topic: 'values', signal: 'closed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicCuriosityWeight([
      { topic: 'values', signal: 'curious' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCuriosityWeight([{ topic: 'x', signal: 'curious' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCuriosityWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCuriosityWeight([
      { topic: 'values', signal: 'curious' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('closedDtmTopics filter', () => {
    const r = summarizeDtmTopicCuriosityWeight([
      { topic: 'values', signal: 'closed' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'curious' },
    ]);
    expect(closedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCuriosityWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicCuriosityWeight([
      { topic: 'values', signal: 'curious' },
      { topic: 'family', signal: 'closed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
