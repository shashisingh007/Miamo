import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicAccompanimentDepth,
  absentDtmTopics,
} from '../dtmTopicAccompanimentDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAccompanimentDepth', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicAccompanimentDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAccompanimentDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully-with => accompanied', () => {
    const r = summarizeDtmTopicAccompanimentDepth([{ topic: 'values', signal: 'fully-with' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('accompanied');
  });

  it('attentive (0.8) => beside', () => {
    const r = summarizeDtmTopicAccompanimentDepth([{ topic: 'values', signal: 'attentive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('beside');
  });

  it('beside => beside', () => {
    const r = summarizeDtmTopicAccompanimentDepth([{ topic: 'values', signal: 'beside' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('beside');
  });

  it('distracted => absent', () => {
    const r = summarizeDtmTopicAccompanimentDepth([{ topic: 'values', signal: 'distracted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent => absent', () => {
    const r = summarizeDtmTopicAccompanimentDepth([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mixed 0.5 => distracted', () => {
    const r = summarizeDtmTopicAccompanimentDepth([
      { topic: 'values', signal: 'fully-with' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distracted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAccompanimentDepth([{ topic: 'q', signal: 'fully-with' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAccompanimentDepth([
      { topic: 'values', signal: 'x' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAccompanimentDepth([
      { topic: 'values', signal: 'attentive' },
      { topic: 'values', signal: 'beside' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('absentDtmTopics filters', () => {
    const r = summarizeDtmTopicAccompanimentDepth([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'distracted' },
      { topic: 'finance', signal: 'fully-with' },
    ]);
    expect(absentDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAccompanimentDepth([
      { topic: 'values', signal: 'fully-with' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicAccompanimentDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
