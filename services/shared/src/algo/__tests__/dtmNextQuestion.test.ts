import { describe, it, expect } from 'vitest';
import { pickNextDtmTopic } from '../dtmNextQuestion';
import { DTM_TOPIC_KEYS, type DtmTopicKey } from '../dtmTopics';

function uniformCoverage(value: number): Record<DtmTopicKey, number> {
  const out = {} as Record<DtmTopicKey, number>;
  for (const k of DTM_TOPIC_KEYS) out[k] = value;
  return out;
}

describe('pickNextDtmTopic', () => {
  it('picks the most-under-covered topic when explorationRate=0', () => {
    const cov = uniformCoverage(1);
    cov.intimacy = 0.1;
    const r = pickNextDtmTopic({ coverage: cov, explorationRate: 0, rng: () => 0.999 });
    expect(r.topic).toBe('intimacy');
    expect(r.exploration).toBe(false);
  });

  it('exploration=1 forces random uncovered topic', () => {
    const cov = uniformCoverage(0); // every topic uncovered
    const r = pickNextDtmTopic({
      coverage: cov, explorationRate: 1.0, rng: () => 0.0,
    });
    expect(r.exploration).toBe(true);
    expect(r.topic).toBe('values'); // rng=0 → first uncovered
  });

  it('respects priorityHints during exploit', () => {
    const cov = uniformCoverage(0.5);
    const r = pickNextDtmTopic({
      coverage: cov,
      priorityHints: { faith: 1.0 },
      explorationRate: 0,
      rng: () => 0.5,
    });
    expect(r.topic).toBe('faith');
  });

  it('ties broken by canonical index', () => {
    const cov = uniformCoverage(0);
    const r = pickNextDtmTopic({ coverage: cov, explorationRate: 0, rng: () => 0.5 });
    expect(r.topic).toBe('values'); // index 0 wins ties
  });

  it('accepts Float32Array coverage', () => {
    const f = new Float32Array(16).fill(1);
    f[3] = 0; // intimacy
    const r = pickNextDtmTopic({ coverage: f, explorationRate: 0, rng: () => 0.5 });
    expect(r.topic).toBe('intimacy');
  });

  it('handles fully-covered case without crashing', () => {
    const cov = uniformCoverage(1);
    const r = pickNextDtmTopic({ coverage: cov, explorationRate: 1.0, rng: () => 0.5 });
    // No uncovered topics → exploration cannot trigger
    expect(r.exploration).toBe(false);
  });

  it('clamps explorationRate to [0, 1]', () => {
    const cov = uniformCoverage(0);
    const r = pickNextDtmTopic({ coverage: cov, explorationRate: 5.0, rng: () => 0.5 });
    expect(r.exploration).toBe(true);
  });

  it('is deterministic given a deterministic rng', () => {
    const cov = uniformCoverage(0.3);
    const rng = () => 0.42;
    const a = pickNextDtmTopic({ coverage: cov, rng });
    const b = pickNextDtmTopic({ coverage: cov, rng });
    expect(a).toEqual(b);
  });
});
