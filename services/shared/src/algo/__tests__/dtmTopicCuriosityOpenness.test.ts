import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCuriosityOpenness, closedDtmTopics } from '../dtmTopicCuriosityOpenness';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCuriosityOpenness', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCuriosityOpenness([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCuriosityOpenness([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('wide_open => curious', () => {
    const r = summarizeDtmTopicCuriosityOpenness([{ topic: 'values', signal: 'wide_open' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('curious');
  });

  it('curious => inquiring', () => {
    const r = summarizeDtmTopicCuriosityOpenness([{ topic: 'values', signal: 'curious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('inquiring');
  });

  it('inquiring => inquiring', () => {
    const r = summarizeDtmTopicCuriosityOpenness([{ topic: 'values', signal: 'inquiring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('inquiring');
  });

  it('guarded => closed', () => {
    const r = summarizeDtmTopicCuriosityOpenness([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closed => closed', () => {
    const r = summarizeDtmTopicCuriosityOpenness([{ topic: 'values', signal: 'closed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('mixed 0.5 => guarded', () => {
    const r = summarizeDtmTopicCuriosityOpenness([
      { topic: 'values', signal: 'wide_open' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCuriosityOpenness([{ topic: 'x', signal: 'curious' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCuriosityOpenness([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCuriosityOpenness([
      { topic: 'values', signal: 'curious' },
      { topic: 'values', signal: 'inquiring' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('closedDtmTopics filters', () => {
    const r = summarizeDtmTopicCuriosityOpenness([
      { topic: 'values', signal: 'closed' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'wide_open' },
    ]);
    expect(closedDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicCuriosityOpenness([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCuriosityOpenness([
      { topic: 'values', signal: 'wide_open' },
      { topic: 'family', signal: 'closed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
