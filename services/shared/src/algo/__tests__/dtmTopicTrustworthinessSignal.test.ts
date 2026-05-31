import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicTrustworthinessSignal, untrustworthyDtmTopics } from '../dtmTopicTrustworthinessSignal';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTrustworthinessSignal', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTrustworthinessSignal([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('consistent => reliable', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([{ topic: 'values', signal: 'consistent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reliable');
  });

  it('reliable => mixed', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([{ topic: 'values', signal: 'reliable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('flaky => breaking', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([{ topic: 'values', signal: 'flaky' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('breaking');
  });

  it('breaking => breaking', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([{ topic: 'values', signal: 'breaking' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('breaking');
  });

  it('mixed 0.5 => flaky', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([
      { topic: 'values', signal: 'consistent' },
      { topic: 'values', signal: 'breaking' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flaky');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([{ topic: 'x', signal: 'consistent' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([
      { topic: 'values', signal: 'consistent' },
      { topic: 'values', signal: 'flaky' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('untrustworthyDtmTopics filter', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([
      { topic: 'values', signal: 'breaking' },
      { topic: 'family', signal: 'flaky' },
      { topic: 'finance', signal: 'consistent' },
    ]);
    expect(untrustworthyDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTrustworthinessSignal([
      { topic: 'values', signal: 'consistent' },
      { topic: 'family', signal: 'breaking' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
