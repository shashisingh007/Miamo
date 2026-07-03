import { describe, it, expect } from 'vitest';
import { buildDtmFeed, type DtmTopicCandidate, type DtmTopicHistory } from '../dtmFeedV7';

const cand = (
  topic: string,
  over: Partial<DtmTopicCandidate> = {},
): DtmTopicCandidate => ({
  topic,
  importance: 0.6,
  lastAskedDaysAgo: 7,
  tone: 'reflective',
  cohortPopularity: 0.4,
  reciprocityLift: 0.3,
  ...over,
});

const hist = (over: Partial<DtmTopicHistory> = {}): DtmTopicHistory => ({
  answered: 0,
  skippedRecently: false,
  abandonedRecently: false,
  ...over,
});

describe('dtmFeedV7.buildDtmFeed', () => {
  it('returns up to k items, defaulting to 10', () => {
    const candidates = Array.from({ length: 16 }, (_, i) => cand(`t${i}`));
    const out = buildDtmFeed({
      weights: new Map(),
      candidates,
      history: new Map(),
    });
    expect(out.batch.length).toBe(10);
  });

  it('honors explicit k', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => cand(`t${i}`));
    const out = buildDtmFeed({
      weights: new Map(),
      candidates,
      history: new Map(),
      k: 4,
    });
    expect(out.batch.length).toBe(4);
  });

  it('rejects saturated topics', () => {
    const candidates = [cand('a'), cand('b')];
    const history = new Map<string, DtmTopicHistory>([
      ['a', hist({ answered: 5 })],
    ]);
    const out = buildDtmFeed({ weights: new Map(), candidates, history });
    expect(out.batch.find((x) => x.topic === 'a')).toBeUndefined();
    expect(out.rejected.some((r) => r.topic === 'a' && r.reason === 'saturated')).toBe(true);
  });

  it('penalizes abandoned + skipped (low_score / order)', () => {
    const candidates = [
      cand('clean', { importance: 0.5 }),
      cand('abandoned', { importance: 0.5 }),
    ];
    const history = new Map<string, DtmTopicHistory>([
      ['abandoned', hist({ abandonedRecently: true })],
    ]);
    const out = buildDtmFeed({ weights: new Map(), candidates, history });
    if (out.batch.find((x) => x.topic === 'abandoned')) {
      const clean = out.batch.findIndex((x) => x.topic === 'clean');
      const abandoned = out.batch.findIndex((x) => x.topic === 'abandoned');
      expect(clean).toBeLessThan(abandoned);
    }
  });

  it('ranks high-affinity over low-affinity for same coverage', () => {
    const candidates = [cand('a'), cand('b')];
    const out = buildDtmFeed({
      weights: new Map([['a', 0.9], ['b', 0.1]]),
      candidates,
      history: new Map(),
    });
    expect(out.batch[0].topic).toBe('a');
  });

  it('cold-start (no history, no weights) still yields a batch', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      cand(`t${i}`, { importance: 1, lastAskedDaysAgo: null, cohortPopularity: 0, reciprocityLift: 0 }),
    );
    const out = buildDtmFeed({
      weights: new Map(),
      candidates,
      history: new Map(),
    });
    expect(out.batch.length).toBe(10);
    expect(out.batch.every((x) => x.score > 0)).toBe(true);
  });

  it('attaches reasons that are non-empty for every item', () => {
    const candidates = [cand('a', { importance: 0.9, cohortPopularity: 0.9, reciprocityLift: 0.9, lastAskedDaysAgo: 30 })];
    const out = buildDtmFeed({
      weights: new Map([['a', 0.9]]),
      candidates,
      history: new Map(),
    });
    expect(out.batch[0].reasons.length).toBeGreaterThan(0);
  });

  it('respects toneCap before relaxing', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      cand(`t${i}`, { tone: 'warm', importance: 0.9 }),
    );
    const out = buildDtmFeed({
      weights: new Map(),
      candidates,
      history: new Map(),
      k: 5,
      toneCap: 2,
    });
    // tone cap relaxed when batch can't fill — but batch should still be 5
    expect(out.batch.length).toBe(5);
  });

  it('output is deterministic for fixed input', () => {
    const candidates = [cand('a'), cand('b'), cand('c')];
    const r1 = buildDtmFeed({ weights: new Map(), candidates, history: new Map() });
    const r2 = buildDtmFeed({ weights: new Map(), candidates, history: new Map() });
    expect(r1.batch.map((x) => x.topic)).toEqual(r2.batch.map((x) => x.topic));
  });

  it('clamps k to [1, 20]', () => {
    const candidates = Array.from({ length: 30 }, (_, i) => cand(`t${i}`));
    expect(buildDtmFeed({ weights: new Map(), candidates, history: new Map(), k: 0 }).batch.length).toBe(1);
    expect(buildDtmFeed({ weights: new Map(), candidates, history: new Map(), k: 999 }).batch.length).toBe(20);
  });

  it('empty candidates → empty batch', () => {
    const out = buildDtmFeed({ weights: new Map(), candidates: [], history: new Map() });
    expect(out.batch).toHaveLength(0);
    expect(out.rejected).toHaveLength(0);
  });

  it('scores stay within [0,1]', () => {
    const candidates = [cand('a', { importance: 1, cohortPopularity: 1, reciprocityLift: 1, lastAskedDaysAgo: 100 })];
    const out = buildDtmFeed({
      weights: new Map([['a', 1]]),
      candidates,
      history: new Map(),
    });
    expect(out.batch[0].score).toBeLessThanOrEqual(1);
    expect(out.batch[0].score).toBeGreaterThanOrEqual(0);
  });
});
