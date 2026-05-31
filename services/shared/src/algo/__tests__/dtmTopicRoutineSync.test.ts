import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRoutineSync,
  desyncedDtmTopics,
} from '../dtmTopicRoutineSync';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRoutineSync', () => {
  it('returns 16', () => {
    const r = summarizeDtmTopicRoutineSync([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty untested', () => {
    expect(summarizeDtmTopicRoutineSync([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('in-sync => synced', () => {
    const r = summarizeDtmTopicRoutineSync([{ topic: 'lifestyle', signal: 'in-sync' }]);
    expect(r.find((x) => x.topic === 'lifestyle')!.band).toBe('synced');
  });

  it('mostly-sync (0.8) => partial', () => {
    const r = summarizeDtmTopicRoutineSync([{ topic: 'lifestyle', signal: 'mostly-sync' }]);
    expect(r.find((x) => x.topic === 'lifestyle')!.band).toBe('partial');
  });

  it('occasional-sync (0.55) => partial', () => {
    const r = summarizeDtmTopicRoutineSync([{ topic: 'lifestyle', signal: 'occasional-sync' }]);
    expect(r.find((x) => x.topic === 'lifestyle')!.band).toBe('partial');
  });

  it('misaligned (0.25) => desynced', () => {
    const r = summarizeDtmTopicRoutineSync([{ topic: 'lifestyle', signal: 'misaligned' }]);
    expect(r.find((x) => x.topic === 'lifestyle')!.band).toBe('desynced');
  });

  it('desynced => desynced', () => {
    const r = summarizeDtmTopicRoutineSync([{ topic: 'lifestyle', signal: 'desynced' }]);
    expect(r.find((x) => x.topic === 'lifestyle')!.band).toBe('desynced');
  });

  it('mixed in + desynced (0.5) => misaligned', () => {
    const r = summarizeDtmTopicRoutineSync([
      { topic: 'lifestyle', signal: 'in-sync' },
      { topic: 'lifestyle', signal: 'desynced' },
    ]);
    expect(r.find((x) => x.topic === 'lifestyle')!.band).toBe('misaligned');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicRoutineSync([{ topic: 'xx', signal: 'in-sync' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicRoutineSync([{ topic: 'lifestyle', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'lifestyle')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRoutineSync([
      { topic: 'lifestyle', signal: 'in-sync' },
      { topic: 'lifestyle', signal: 'desynced' },
    ]);
    expect(r.find((x) => x.topic === 'lifestyle')!.n).toBe(2);
  });

  it('desyncedDtmTopics filters', () => {
    const r = summarizeDtmTopicRoutineSync([
      { topic: 'lifestyle', signal: 'desynced' },
      { topic: 'family', signal: 'in-sync' },
    ]);
    expect(desyncedDtmTopics(r)).toHaveLength(1);
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicRoutineSync([
      { topic: 'lifestyle', signal: 'in-sync' },
      { topic: 'family', signal: 'desynced' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order', () => {
    const r = summarizeDtmTopicRoutineSync([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
