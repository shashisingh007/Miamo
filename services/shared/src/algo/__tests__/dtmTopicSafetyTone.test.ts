import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSafetyTone,
  hostileDtmTopics,
} from '../dtmTopicSafetyTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSafetyTone', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicSafetyTone([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicSafetyTone([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('warm-tone => safe', () => {
    const rows = summarizeDtmTopicSafetyTone([{ topic: 'communication', signal: 'warm-tone' }]);
    expect(rows.find((r) => r.topic === 'communication')!.band).toBe('safe');
  });

  it('neutral-tone => cautious', () => {
    const rows = summarizeDtmTopicSafetyTone([{ topic: 'communication', signal: 'neutral-tone' }]);
    expect(rows.find((r) => r.topic === 'communication')!.band).toBe('cautious');
  });

  it('tense-tone => hostile (0.25)', () => {
    const rows = summarizeDtmTopicSafetyTone([{ topic: 'communication', signal: 'tense-tone' }]);
    expect(rows.find((r) => r.topic === 'communication')!.band).toBe('cold');
  });

  it('cold-tone => hostile', () => {
    const rows = summarizeDtmTopicSafetyTone([{ topic: 'communication', signal: 'cold-tone' }]);
    expect(rows.find((r) => r.topic === 'communication')!.band).toBe('hostile');
  });

  it('hostile-tone => hostile', () => {
    const rows = summarizeDtmTopicSafetyTone([{ topic: 'communication', signal: 'hostile-tone' }]);
    expect(rows.find((r) => r.topic === 'communication')!.band).toBe('hostile');
  });

  it('mixed warm + hostile averages to cautious (0.5)', () => {
    const rows = summarizeDtmTopicSafetyTone([
      { topic: 'communication', signal: 'warm-tone' },
      { topic: 'communication', signal: 'hostile-tone' },
    ]);
    expect(rows.find((r) => r.topic === 'communication')!.band).toBe('cautious');
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicSafetyTone([{ topic: 'nope', signal: 'warm-tone' }]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const rows = summarizeDtmTopicSafetyTone([
      { topic: 'communication', signal: 'huh' as any },
    ]);
    expect(rows.find((r) => r.topic === 'communication')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicSafetyTone([
      { topic: 'communication', signal: 'warm-tone' },
      { topic: 'communication', signal: 'tense-tone' },
      { topic: 'family', signal: 'cold-tone' },
    ]);
    expect(rows.find((r) => r.topic === 'communication')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(1);
  });

  it('hostileDtmTopics filters', () => {
    const rows = summarizeDtmTopicSafetyTone([
      { topic: 'communication', signal: 'hostile-tone' },
      { topic: 'family', signal: 'warm-tone' },
    ]);
    const h = hostileDtmTopics(rows);
    expect(h).toHaveLength(1);
    expect(h[0].topic).toBe('communication');
  });

  it('scores bounded in [0,1]', () => {
    const rows = summarizeDtmTopicSafetyTone([
      { topic: 'communication', signal: 'warm-tone' },
      { topic: 'family', signal: 'hostile-tone' },
    ]);
    for (const r of rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicSafetyTone([
      { topic: 'future', signal: 'warm-tone' },
      { topic: 'values', signal: 'hostile-tone' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });
});
