import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicConflictDeescalation,
  volatileDtmTopics,
} from '../dtmTopicConflictDeescalation';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicConflictDeescalation', () => {
  it('returns 16 canonical topics', () => {
    const rows = summarizeDtmTopicConflictDeescalation([]);
    expect(rows).toHaveLength(16);
    expect(rows.map((r) => r.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested when empty', () => {
    const rows = summarizeDtmTopicConflictDeescalation([]);
    expect(rows.every((r) => r.band === 'untested')).toBe(true);
  });

  it('soften-tone => composed', () => {
    const rows = summarizeDtmTopicConflictDeescalation([{ topic: 'conflict', action: 'soften-tone' }]);
    expect(rows.find((r) => r.topic === 'conflict')!.band).toBe('composed');
  });

  it('escalate-volume => volatile', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'conflict', action: 'escalate-volume' },
    ]);
    expect(rows.find((r) => r.topic === 'conflict')!.band).toBe('volatile');
  });

  it('stonewall => volatile', () => {
    const rows = summarizeDtmTopicConflictDeescalation([{ topic: 'conflict', action: 'stonewall' }]);
    expect(rows.find((r) => r.topic === 'conflict')!.band).toBe('volatile');
  });

  it('sarcasm => volatile', () => {
    const rows = summarizeDtmTopicConflictDeescalation([{ topic: 'conflict', action: 'sarcasm' }]);
    expect(rows.find((r) => r.topic === 'conflict')!.band).toBe('volatile');
  });

  it('name-need => composed (0.85)', () => {
    const rows = summarizeDtmTopicConflictDeescalation([{ topic: 'conflict', action: 'name-need' }]);
    expect(rows.find((r) => r.topic === 'conflict')!.band).toBe('composed');
  });

  it('validate-feeling => composed (0.925)', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'conflict', action: 'validate-feeling' },
    ]);
    expect(rows.find((r) => r.topic === 'conflict')!.band).toBe('composed');
  });

  it('pause-break => composed', () => {
    const rows = summarizeDtmTopicConflictDeescalation([{ topic: 'conflict', action: 'pause-break' }]);
    expect(rows.find((r) => r.topic === 'conflict')!.band).toBe('composed');
  });

  it('mixed soften + escalate => middling', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'conflict', action: 'soften-tone' },
      { topic: 'conflict', action: 'escalate-volume' },
    ]);
    const r = rows.find((x) => x.topic === 'conflict')!;
    expect(r.score).toBeCloseTo(0.5, 5);
    expect(r.band).toBe('reactive');
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'nope', action: 'soften-tone' },
    ]);
    expect(rows.every((r) => r.n === 0)).toBe(true);
  });

  it('ignores unknown action', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'conflict', action: 'mystery' as any },
    ]);
    expect(rows.find((r) => r.topic === 'conflict')!.n).toBe(0);
  });

  it('counts n per topic', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'conflict', action: 'soften-tone' },
      { topic: 'conflict', action: 'pause-break' },
      { topic: 'family', action: 'stonewall' },
    ]);
    expect(rows.find((r) => r.topic === 'conflict')!.n).toBe(2);
    expect(rows.find((r) => r.topic === 'family')!.n).toBe(1);
  });

  it('volatileDtmTopics filters', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'conflict', action: 'escalate-volume' },
      { topic: 'family', action: 'soften-tone' },
    ]);
    const v = volatileDtmTopics(rows);
    expect(v).toHaveLength(1);
    expect(v[0].topic).toBe('conflict');
  });

  it('scores are bounded in [0,1]', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'conflict', action: 'soften-tone' },
      { topic: 'family', action: 'escalate-volume' },
    ]);
    for (const r of rows) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const rows = summarizeDtmTopicConflictDeescalation([
      { topic: 'future', action: 'soften-tone' },
      { topic: 'values', action: 'stonewall' },
    ]);
    expect(rows[0].topic).toBe('values');
    expect(rows[15].topic).toBe('future');
  });
});
