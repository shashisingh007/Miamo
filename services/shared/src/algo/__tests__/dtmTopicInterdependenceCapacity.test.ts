import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicInterdependenceCapacity, isolatedDtmTopics } from '../dtmTopicInterdependenceCapacity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicInterdependenceCapacity', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicInterdependenceCapacity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('collaborative => collaborative', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([{ topic: 'values', signal: 'collaborative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('collaborative');
  });

  it('cooperative => parallel', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([{ topic: 'values', signal: 'cooperative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('parallel');
  });

  it('parallel => parallel', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([{ topic: 'values', signal: 'parallel' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('parallel');
  });

  it('isolated => extractive', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([{ topic: 'values', signal: 'isolated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('extractive');
  });

  it('extractive => extractive', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([{ topic: 'values', signal: 'extractive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('extractive');
  });

  it('mixed 0.5 => isolated', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([
      { topic: 'values', signal: 'collaborative' },
      { topic: 'values', signal: 'extractive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('isolated');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([{ topic: 'x', signal: 'collaborative' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([
      { topic: 'values', signal: 'collaborative' },
      { topic: 'values', signal: 'isolated' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('isolatedDtmTopics filter', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([
      { topic: 'values', signal: 'extractive' },
      { topic: 'family', signal: 'isolated' },
      { topic: 'finance', signal: 'collaborative' },
    ]);
    expect(isolatedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicInterdependenceCapacity([
      { topic: 'values', signal: 'collaborative' },
      { topic: 'family', signal: 'extractive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
