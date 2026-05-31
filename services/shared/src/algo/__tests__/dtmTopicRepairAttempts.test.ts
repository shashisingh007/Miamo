import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRepairAttempts,
  contemptuousRepairTopics,
} from '../dtmTopicRepairAttempts';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRepairAttempts', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicRepairAttempts([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicRepairAttempts([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('genuine-repair => restored', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'conflict', signal: 'genuine-repair' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('restored');
  });

  it('soft-bid (0.8) => partial', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'conflict', signal: 'soft-bid' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('partial');
  });

  it('partial (0.55) => partial', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'conflict', signal: 'partial' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('partial');
  });

  it('defensive (0.25) => contemptuous', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'conflict', signal: 'defensive' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('contemptuous');
  });

  it('contemptuous-deflect => contemptuous', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'conflict', signal: 'contemptuous-deflect' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('contemptuous');
  });

  it('mixed (0.5) => defensive', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'conflict', signal: 'genuine-repair' },
      { topic: 'conflict', signal: 'contemptuous-deflect' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('defensive');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'x', signal: 'genuine-repair' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'conflict', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'conflict', signal: 'genuine-repair' },
      { topic: 'conflict', signal: 'soft-bid' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(2);
  });

  it('contemptuousRepairTopics filters', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'conflict', signal: 'contemptuous-deflect' },
      { topic: 'intimacy', signal: 'genuine-repair' },
    ]);
    expect(contemptuousRepairTopics(r)).toHaveLength(1);
    expect(contemptuousRepairTopics(r)[0].topic).toBe('conflict');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'conflict', signal: 'genuine-repair' },
      { topic: 'intimacy', signal: 'contemptuous-deflect' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicRepairAttempts([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
