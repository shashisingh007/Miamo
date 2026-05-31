import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCalmnessTone, agitatedDtmTopics } from '../dtmTopicCalmnessTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCalmnessTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCalmnessTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCalmnessTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('calm', () => {
    const r = summarizeDtmTopicCalmnessTone([{ topic: 'values', signal: 'calm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('calm');
  });

  it('composed => mixed', () => {
    const r = summarizeDtmTopicCalmnessTone([{ topic: 'values', signal: 'composed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicCalmnessTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('tense => agitated', () => {
    const r = summarizeDtmTopicCalmnessTone([{ topic: 'values', signal: 'tense' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('agitated');
  });

  it('agitated', () => {
    const r = summarizeDtmTopicCalmnessTone([{ topic: 'values', signal: 'agitated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('agitated');
  });

  it('mid => tense', () => {
    const r = summarizeDtmTopicCalmnessTone([
      { topic: 'values', signal: 'calm' },
      { topic: 'values', signal: 'agitated' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tense');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCalmnessTone([{ topic: 'x', signal: 'calm' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCalmnessTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCalmnessTone([
      { topic: 'values', signal: 'calm' },
      { topic: 'values', signal: 'tense' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('agitatedDtmTopics filter', () => {
    const r = summarizeDtmTopicCalmnessTone([
      { topic: 'values', signal: 'agitated' },
      { topic: 'family', signal: 'tense' },
      { topic: 'finance', signal: 'calm' },
    ]);
    expect(agitatedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCalmnessTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCalmnessTone([
      { topic: 'values', signal: 'calm' },
      { topic: 'family', signal: 'agitated' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
