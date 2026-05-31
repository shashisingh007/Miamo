import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicApologyTone, unrepentantDtmTopics } from '../dtmTopicApologyTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicApologyTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicApologyTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicApologyTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('apologetic', () => {
    const r = summarizeDtmTopicApologyTone([{ topic: 'values', signal: 'apologetic' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('apologetic');
  });

  it('remorseful => mixed', () => {
    const r = summarizeDtmTopicApologyTone([{ topic: 'values', signal: 'remorseful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicApologyTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('defensive => unrepentant', () => {
    const r = summarizeDtmTopicApologyTone([{ topic: 'values', signal: 'defensive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unrepentant');
  });

  it('unrepentant', () => {
    const r = summarizeDtmTopicApologyTone([{ topic: 'values', signal: 'unrepentant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unrepentant');
  });

  it('mid', () => {
    const r = summarizeDtmTopicApologyTone([
      { topic: 'values', signal: 'apologetic' },
      { topic: 'values', signal: 'unrepentant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('defensive');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicApologyTone([{ topic: 'x', signal: 'apologetic' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicApologyTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicApologyTone([
      { topic: 'values', signal: 'apologetic' },
      { topic: 'values', signal: 'unrepentant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unrepentantDtmTopics filter', () => {
    const r = summarizeDtmTopicApologyTone([
      { topic: 'values', signal: 'unrepentant' },
      { topic: 'family', signal: 'defensive' },
      { topic: 'finance', signal: 'apologetic' },
    ]);
    expect(unrepentantDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicApologyTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicApologyTone([
      { topic: 'values', signal: 'apologetic' },
      { topic: 'family', signal: 'unrepentant' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
