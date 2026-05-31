import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicCompassionateChallenge,
  harshDtmTopicsCompassion,
} from '../dtmTopicCompassionateChallenge';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCompassionateChallenge', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCompassionateChallenge([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicCompassionateChallenge([]).every((x) => x.band === 'untested')
    ).toBe(true);
  });

  it('caring => kind band', () => {
    const r = summarizeDtmTopicCompassionateChallenge([{ topic: 'values', signal: 'caring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('kind');
  });

  it('kind => mixed', () => {
    const r = summarizeDtmTopicCompassionateChallenge([{ topic: 'values', signal: 'kind' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicCompassionateChallenge([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('pointed', () => {
    const r = summarizeDtmTopicCompassionateChallenge([{ topic: 'values', signal: 'pointed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('harsh', () => {
    const r = summarizeDtmTopicCompassionateChallenge([{ topic: 'values', signal: 'harsh' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicCompassionateChallenge([
      { topic: 'values', signal: 'caring' },
      { topic: 'values', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('pointed');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCompassionateChallenge([{ topic: 'x', signal: 'caring' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCompassionateChallenge([
      { topic: 'values', signal: 'q' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCompassionateChallenge([
      { topic: 'values', signal: 'caring' },
      { topic: 'values', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('harshDtmTopicsCompassion filter', () => {
    const r = summarizeDtmTopicCompassionateChallenge([
      { topic: 'values', signal: 'harsh' },
      { topic: 'family', signal: 'pointed' },
      { topic: 'finance', signal: 'caring' },
    ]);
    expect(harshDtmTopicsCompassion(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCompassionateChallenge([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicCompassionateChallenge([
      { topic: 'values', signal: 'caring' },
      { topic: 'family', signal: 'harsh' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
