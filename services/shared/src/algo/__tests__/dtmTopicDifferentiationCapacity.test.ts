import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicDifferentiationCapacity,
  enmeshedDtmTopics,
} from '../dtmTopicDifferentiationCapacity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicDifferentiationCapacity', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(
      summarizeDtmTopicDifferentiationCapacity([]).every((x) => x.band === 'untested'),
    ).toBe(true);
  });

  it('distinct-and-connected => differentiated', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'distinct-and-connected' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('differentiated');
  });

  it('distinct (0.8) => blended', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'distinct' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('blended');
  });

  it('blended => blended', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'blended' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('blended');
  });

  it('fused => enmeshed', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'fused' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('enmeshed');
  });

  it('enmeshed => enmeshed', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'enmeshed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('enmeshed');
  });

  it('mixed 0.5 => fused', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'distinct-and-connected' },
      { topic: 'values', signal: 'enmeshed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('fused');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'q', signal: 'distinct' },
    ]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'x' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'distinct' },
      { topic: 'values', signal: 'blended' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('enmeshedDtmTopics filters', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'enmeshed' },
      { topic: 'family', signal: 'fused' },
      { topic: 'finance', signal: 'distinct-and-connected' },
    ]);
    expect(enmeshedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([
      { topic: 'values', signal: 'distinct-and-connected' },
      { topic: 'family', signal: 'enmeshed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicDifferentiationCapacity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
