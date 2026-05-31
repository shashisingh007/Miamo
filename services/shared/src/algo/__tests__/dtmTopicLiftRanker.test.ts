import { describe, it, expect } from 'vitest';
import { rankDtmCandidatesByLift } from '../dtmTopicLiftRanker';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const N = DTM_TOPIC_KEYS.length;

describe('dtmTopicLiftRanker', () => {
  it('empty candidates -> empty', () => {
    expect(rankDtmCandidatesByLift([], new Array(N).fill(0))).toEqual([]);
  });

  it('all topics zero -> highest lift = 1 per topic', () => {
    const r = rankDtmCandidatesByLift(
      [{ id: 'a', topics: [DTM_TOPIC_KEYS[0]] }],
      new Array(N).fill(0),
    );
    expect(r[0].lift).toBeCloseTo(1, 6);
    expect(r[0].rank).toBe(1);
  });

  it('higher-answer topic -> lower lift', () => {
    const counts = new Array(N).fill(0);
    counts[0] = 9; // -> lift 1/10
    counts[1] = 0; // -> lift 1
    const r = rankDtmCandidatesByLift(
      [
        { id: 'covered',   topics: [DTM_TOPIC_KEYS[0]] },
        { id: 'uncovered', topics: [DTM_TOPIC_KEYS[1]] },
      ],
      counts,
    );
    expect(r[0].id).toBe('uncovered');
    expect(r[1].id).toBe('covered');
    expect(r[1].lift).toBeCloseTo(0.1, 6);
  });

  it('averages across multiple topics', () => {
    const counts = new Array(N).fill(0);
    counts[0] = 0; // 1
    counts[1] = 1; // 0.5
    const r = rankDtmCandidatesByLift(
      [{ id: 'q', topics: [DTM_TOPIC_KEYS[0], DTM_TOPIC_KEYS[1]] }],
      counts,
    );
    expect(r[0].lift).toBeCloseTo(0.75, 6);
  });

  it('unknown topic keys ignored', () => {
    const r = rankDtmCandidatesByLift(
      [{ id: 'q', topics: ['not-a-topic' as any, DTM_TOPIC_KEYS[0]] }],
      new Array(N).fill(0),
    );
    expect(r[0].lift).toBeCloseTo(1, 6);
  });

  it('candidate with zero valid topics -> lift 0', () => {
    const r = rankDtmCandidatesByLift(
      [{ id: 'q', topics: ['nope' as any] }],
      new Array(N).fill(0),
    );
    expect(r[0].lift).toBe(0);
  });

  it('ranks are 1-indexed and unique', () => {
    const r = rankDtmCandidatesByLift(
      [
        { id: 'a', topics: [DTM_TOPIC_KEYS[0]] },
        { id: 'b', topics: [DTM_TOPIC_KEYS[1]] },
        { id: 'c', topics: [DTM_TOPIC_KEYS[2]] },
      ],
      new Array(N).fill(0),
    );
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it('handles wrong-length answers array (treats as all-zero)', () => {
    const r = rankDtmCandidatesByLift(
      [{ id: 'q', topics: [DTM_TOPIC_KEYS[0]] }],
      [1, 2, 3],
    );
    expect(r[0].lift).toBeCloseTo(1, 6);
  });

  it('negative / NaN counts clamped to 0', () => {
    const counts = new Array(N).fill(0);
    counts[0] = -5;
    counts[1] = NaN;
    const r = rankDtmCandidatesByLift(
      [{ id: 'q', topics: [DTM_TOPIC_KEYS[0], DTM_TOPIC_KEYS[1]] }],
      counts,
    );
    expect(r[0].lift).toBeCloseTo(1, 6);
  });

  it('descending order by lift', () => {
    const counts = new Array(N).fill(0);
    counts[0] = 9; counts[1] = 4; counts[2] = 0;
    const r = rankDtmCandidatesByLift(
      [
        { id: 'low',  topics: [DTM_TOPIC_KEYS[0]] },
        { id: 'mid',  topics: [DTM_TOPIC_KEYS[1]] },
        { id: 'high', topics: [DTM_TOPIC_KEYS[2]] },
      ],
      counts,
    );
    expect(r.map((x) => x.id)).toEqual(['high', 'mid', 'low']);
  });
});
