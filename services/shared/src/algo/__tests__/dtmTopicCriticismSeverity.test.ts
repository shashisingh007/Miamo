import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCriticismSeverity,
  contemptuousDtmTopics,
} from '../dtmTopicCriticismSeverity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCriticismSeverity', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicCriticismSeverity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCriticismSeverity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('kind-feedback => kind', () => {
    const r = summarizeDtmTopicCriticismSeverity([{ topic: 'conflict', signal: 'kind-feedback' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('kind');
  });

  it('soft-note (0.8) => pointed', () => {
    const r = summarizeDtmTopicCriticismSeverity([{ topic: 'conflict', signal: 'soft-note' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('pointed');
  });

  it('pointed (0.55) => pointed', () => {
    const r = summarizeDtmTopicCriticismSeverity([{ topic: 'conflict', signal: 'pointed' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('pointed');
  });

  it('harsh (0.25) => contemptuous', () => {
    const r = summarizeDtmTopicCriticismSeverity([{ topic: 'conflict', signal: 'harsh' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('contemptuous');
  });

  it('contemptuous => contemptuous', () => {
    const r = summarizeDtmTopicCriticismSeverity([{ topic: 'conflict', signal: 'contemptuous' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('contemptuous');
  });

  it('mixed (0.5) => harsh', () => {
    const r = summarizeDtmTopicCriticismSeverity([
      { topic: 'conflict', signal: 'kind-feedback' },
      { topic: 'conflict', signal: 'contemptuous' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('harsh');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicCriticismSeverity([{ topic: 'x', signal: 'kind-feedback' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicCriticismSeverity([{ topic: 'conflict', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCriticismSeverity([
      { topic: 'conflict', signal: 'kind-feedback' },
      { topic: 'conflict', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(2);
  });

  it('contemptuousDtmTopics filters', () => {
    const r = summarizeDtmTopicCriticismSeverity([
      { topic: 'conflict', signal: 'contemptuous' },
      { topic: 'intimacy', signal: 'kind-feedback' },
    ]);
    expect(contemptuousDtmTopics(r)).toHaveLength(1);
    expect(contemptuousDtmTopics(r)[0].topic).toBe('conflict');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCriticismSeverity([
      { topic: 'conflict', signal: 'kind-feedback' },
      { topic: 'intimacy', signal: 'contemptuous' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicCriticismSeverity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
