import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicNarrativeCoherence,
  incoherentDtmTopics,
} from '../dtmTopicNarrativeCoherence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicNarrativeCoherence', () => {
  it('returns 16 in canonical order', () => {
    const r = summarizeDtmTopicNarrativeCoherence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicNarrativeCoherence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('integrated => coherent', () => {
    const r = summarizeDtmTopicNarrativeCoherence([{ topic: 'communication', signal: 'integrated' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('coherent');
  });

  it('coherent (0.8) => partial', () => {
    const r = summarizeDtmTopicNarrativeCoherence([{ topic: 'communication', signal: 'coherent' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('partial');
  });

  it('partially-coherent => partial', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'partially-coherent' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('partial');
  });

  it('fragmented => incoherent', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'fragmented' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('incoherent');
  });

  it('incoherent => incoherent', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'incoherent' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('incoherent');
  });

  it('mixed 0.5 => fragmented', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'integrated' },
      { topic: 'communication', signal: 'incoherent' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('fragmented');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicNarrativeCoherence([{ topic: 'x', signal: 'integrated' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'q' as any },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'integrated' },
      { topic: 'communication', signal: 'coherent' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('incoherentDtmTopics filters', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'incoherent' },
      { topic: 'family', signal: 'fragmented' },
      { topic: 'finance', signal: 'integrated' },
    ]);
    expect(incoherentDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicNarrativeCoherence([
      { topic: 'communication', signal: 'integrated' },
      { topic: 'family', signal: 'incoherent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicNarrativeCoherence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
