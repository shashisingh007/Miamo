import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicBidsForConnection,
  againstDtmTopics,
} from '../dtmTopicBidsForConnection';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicBidsForConnection', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicBidsForConnection([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicBidsForConnection([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('enthusiastic-turn-toward => toward', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'enthusiastic-turn-toward' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('toward');
  });

  it('turn-toward (0.8) => acknowledging', () => {
    const r = summarizeDtmTopicBidsForConnection([{ topic: 'communication', signal: 'turn-toward' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('acknowledging');
  });

  it('neutral-acknowledge => acknowledging', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'neutral-acknowledge' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('acknowledging');
  });

  it('turn-away => against', () => {
    const r = summarizeDtmTopicBidsForConnection([{ topic: 'communication', signal: 'turn-away' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('against');
  });

  it('turn-against => against', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'turn-against' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('against');
  });

  it('mixed 0.5 => away', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'enthusiastic-turn-toward' },
      { topic: 'communication', signal: 'turn-against' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('away');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'x', signal: 'enthusiastic-turn-toward' },
    ]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'q' as any },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'enthusiastic-turn-toward' },
      { topic: 'communication', signal: 'turn-toward' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('againstDtmTopics filters', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'turn-against' },
      { topic: 'family', signal: 'enthusiastic-turn-toward' },
    ]);
    expect(againstDtmTopics(r)).toHaveLength(1);
    expect(againstDtmTopics(r)[0].topic).toBe('communication');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicBidsForConnection([
      { topic: 'communication', signal: 'enthusiastic-turn-toward' },
      { topic: 'family', signal: 'turn-against' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicBidsForConnection([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
