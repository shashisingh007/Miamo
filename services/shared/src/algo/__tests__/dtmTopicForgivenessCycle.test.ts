import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicForgivenessCycle,
  grudgeDtmTopics,
} from '../dtmTopicForgivenessCycle';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicForgivenessCycle', () => {
  it('returns 16 canonical topics in order', () => {
    const rows = summarizeDtmTopicForgivenessCycle([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicForgivenessCycle([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('genuine-repair => repaired', () => {
    const r = summarizeDtmTopicForgivenessCycle([{ topic: 'conflict', signal: 'genuine-repair' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('repaired');
  });

  it('apology-accepted (0.8) => repaired', () => {
    const r = summarizeDtmTopicForgivenessCycle([{ topic: 'conflict', signal: 'apology-accepted' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('repaired');
  });

  it('apology-offered (0.55) => mending', () => {
    const r = summarizeDtmTopicForgivenessCycle([{ topic: 'conflict', signal: 'apology-offered' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('mending');
  });

  it('still-resentful (0.2) => grudge', () => {
    const r = summarizeDtmTopicForgivenessCycle([{ topic: 'conflict', signal: 'still-resentful' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('grudge');
  });

  it('grudge-held => grudge', () => {
    const r = summarizeDtmTopicForgivenessCycle([{ topic: 'conflict', signal: 'grudge-held' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('grudge');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicForgivenessCycle([{ topic: 'nope', signal: 'genuine-repair' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicForgivenessCycle([
      { topic: 'conflict', signal: 'xyz' as any },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(0);
  });

  it('mixed averages: repair + grudge (0.5) => lingering', () => {
    const r = summarizeDtmTopicForgivenessCycle([
      { topic: 'conflict', signal: 'genuine-repair' },
      { topic: 'conflict', signal: 'grudge-held' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('lingering');
  });

  it('grudgeDtmTopics filters', () => {
    const r = summarizeDtmTopicForgivenessCycle([
      { topic: 'conflict', signal: 'grudge-held' },
      { topic: 'family', signal: 'genuine-repair' },
    ]);
    const g = grudgeDtmTopics(r);
    expect(g).toHaveLength(1);
    expect(g[0].topic).toBe('conflict');
  });

  it('counts n correctly', () => {
    const r = summarizeDtmTopicForgivenessCycle([
      { topic: 'conflict', signal: 'genuine-repair' },
      { topic: 'conflict', signal: 'apology-offered' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(2);
  });

  it('scores bounded in [0,1]', () => {
    const r = summarizeDtmTopicForgivenessCycle([
      { topic: 'conflict', signal: 'genuine-repair' },
      { topic: 'family', signal: 'grudge-held' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicForgivenessCycle([
      { topic: 'future', signal: 'genuine-repair' },
      { topic: 'values', signal: 'grudge-held' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
