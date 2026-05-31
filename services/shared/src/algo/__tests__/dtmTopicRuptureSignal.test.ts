import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRuptureSignal,
  cascadingDtmTopics,
} from '../dtmTopicRuptureSignal';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRuptureSignal', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicRuptureSignal([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicRuptureSignal([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('no-rupture => intact', () => {
    const r = summarizeDtmTopicRuptureSignal([{ topic: 'conflict', signal: 'no-rupture' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('intact');
  });

  it('brief-strain => noticed', () => {
    const r = summarizeDtmTopicRuptureSignal([{ topic: 'conflict', signal: 'brief-strain' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('noticed');
  });

  it('noticed-rupture => noticed', () => {
    const r = summarizeDtmTopicRuptureSignal([{ topic: 'conflict', signal: 'noticed-rupture' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('noticed');
  });

  it('sustained-rupture => cascading', () => {
    const r = summarizeDtmTopicRuptureSignal([{ topic: 'conflict', signal: 'sustained-rupture' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('cascading');
  });

  it('cascading-rupture => cascading', () => {
    const r = summarizeDtmTopicRuptureSignal([{ topic: 'conflict', signal: 'cascading-rupture' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('cascading');
  });

  it('mixed 0.5 => sustained', () => {
    const r = summarizeDtmTopicRuptureSignal([
      { topic: 'conflict', signal: 'no-rupture' },
      { topic: 'conflict', signal: 'cascading-rupture' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('sustained');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicRuptureSignal([{ topic: 'x', signal: 'no-rupture' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicRuptureSignal([{ topic: 'conflict', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRuptureSignal([
      { topic: 'conflict', signal: 'no-rupture' },
      { topic: 'conflict', signal: 'brief-strain' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(2);
  });

  it('cascadingDtmTopics filters', () => {
    const r = summarizeDtmTopicRuptureSignal([
      { topic: 'conflict', signal: 'cascading-rupture' },
      { topic: 'family', signal: 'no-rupture' },
    ]);
    expect(cascadingDtmTopics(r)).toHaveLength(1);
    expect(cascadingDtmTopics(r)[0].topic).toBe('conflict');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicRuptureSignal([
      { topic: 'conflict', signal: 'no-rupture' },
      { topic: 'family', signal: 'cascading-rupture' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicRuptureSignal([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
