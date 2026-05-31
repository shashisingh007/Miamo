import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReceptivityOpenness, closedReceptivityDtmTopics } from '../dtmTopicReceptivityOpenness';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicReceptivityOpenness', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicReceptivityOpenness([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicReceptivityOpenness([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('open => receptive', () => {
    const r = summarizeDtmTopicReceptivityOpenness([{ topic: 'values', signal: 'open' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('receptive');
  });

  it('receptive => cautious', () => {
    const r = summarizeDtmTopicReceptivityOpenness([{ topic: 'values', signal: 'receptive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cautious');
  });

  it('cautious => cautious', () => {
    const r = summarizeDtmTopicReceptivityOpenness([{ topic: 'values', signal: 'cautious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cautious');
  });

  it('guarded => closed', () => {
    const r = summarizeDtmTopicReceptivityOpenness([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closed => closed', () => {
    const r = summarizeDtmTopicReceptivityOpenness([{ topic: 'values', signal: 'closed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('mixed 0.5 => guarded', () => {
    const r = summarizeDtmTopicReceptivityOpenness([
      { topic: 'values', signal: 'open' },
      { topic: 'values', signal: 'closed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicReceptivityOpenness([{ topic: 'x', signal: 'open' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicReceptivityOpenness([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicReceptivityOpenness([
      { topic: 'values', signal: 'open' },
      { topic: 'values', signal: 'guarded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('closedReceptivityDtmTopics filters', () => {
    const r = summarizeDtmTopicReceptivityOpenness([
      { topic: 'values', signal: 'closed' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'open' },
    ]);
    expect(closedReceptivityDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicReceptivityOpenness([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicReceptivityOpenness([
      { topic: 'values', signal: 'open' },
      { topic: 'family', signal: 'closed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
