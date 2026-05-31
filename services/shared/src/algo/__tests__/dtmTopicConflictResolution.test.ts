import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicConflictResolution,
  escalatingDtmTopics,
} from '../dtmTopicConflictResolution';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicConflictResolution', () => {
  it('returns 16 canonical topics', () => {
    const r = summarizeDtmTopicConflictResolution([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested empty', () => {
    expect(summarizeDtmTopicConflictResolution([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('integrative-solution => integrating', () => {
    const r = summarizeDtmTopicConflictResolution([{ topic: 'conflict', signal: 'integrative-solution' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('integrating');
  });

  it('compromise (0.75) => resolving', () => {
    const r = summarizeDtmTopicConflictResolution([{ topic: 'conflict', signal: 'compromise' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('resolving');
  });

  it('one-yields (0.5) => avoidant', () => {
    const r = summarizeDtmTopicConflictResolution([{ topic: 'conflict', signal: 'one-yields' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('avoidant');
  });

  it('avoid (0.25) => escalating', () => {
    const r = summarizeDtmTopicConflictResolution([{ topic: 'conflict', signal: 'avoid' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('escalating');
  });

  it('unresolved-escalation => escalating', () => {
    const r = summarizeDtmTopicConflictResolution([{ topic: 'conflict', signal: 'unresolved-escalation' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('escalating');
  });

  it('mixed integrative + unresolved => 0.5 => avoidant', () => {
    const r = summarizeDtmTopicConflictResolution([
      { topic: 'conflict', signal: 'integrative-solution' },
      { topic: 'conflict', signal: 'unresolved-escalation' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('avoidant');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicConflictResolution([{ topic: 'nope', signal: 'integrative-solution' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicConflictResolution([{ topic: 'conflict', signal: 'huh' as any }]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicConflictResolution([
      { topic: 'conflict', signal: 'integrative-solution' },
      { topic: 'conflict', signal: 'one-yields' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(2);
  });

  it('escalatingDtmTopics filters', () => {
    const r = summarizeDtmTopicConflictResolution([
      { topic: 'conflict', signal: 'unresolved-escalation' },
      { topic: 'family', signal: 'integrative-solution' },
    ]);
    const e = escalatingDtmTopics(r);
    expect(e).toHaveLength(1);
    expect(e[0].topic).toBe('conflict');
  });

  it('scores bounded [0,1]', () => {
    const r = summarizeDtmTopicConflictResolution([
      { topic: 'conflict', signal: 'integrative-solution' },
      { topic: 'family', signal: 'unresolved-escalation' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicConflictResolution([
      { topic: 'future', signal: 'integrative-solution' },
      { topic: 'values', signal: 'unresolved-escalation' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
