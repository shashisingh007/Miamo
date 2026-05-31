import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSalienceWeighting,
  erasedDtmTopics,
} from '../dtmTopicSalienceWeighting';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSalienceWeighting', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicSalienceWeighting([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSalienceWeighting([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('foreground-priority => foreground', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'foreground-priority' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('foreground');
  });

  it('foreground (0.8) => background', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'foreground' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('background');
  });

  it('background => background', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'background' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('background');
  });

  it('noise => erased', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'noise' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('erased');
  });

  it('erased => erased', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'erased' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('erased');
  });

  it('mixed 0.5 => noise', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'foreground-priority' },
      { topic: 'values', signal: 'erased' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('noise');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'qq', signal: 'foreground-priority' },
    ]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'bogus' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'background' },
      { topic: 'values', signal: 'foreground' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('erasedDtmTopics filters', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'erased' },
      { topic: 'family', signal: 'noise' },
      { topic: 'finance', signal: 'foreground-priority' },
    ]);
    expect(erasedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSalienceWeighting([
      { topic: 'values', signal: 'foreground-priority' },
      { topic: 'family', signal: 'erased' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicSalienceWeighting([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
