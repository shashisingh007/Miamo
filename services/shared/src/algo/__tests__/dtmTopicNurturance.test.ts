import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicNurturance, withholdingDtmTopics } from '../dtmTopicNurturance';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicNurturance', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicNurturance([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicNurturance([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('caring-deeply => caring', () => {
    const r = summarizeDtmTopicNurturance([{ topic: 'values', signal: 'caring-deeply' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('caring');
  });

  it('caring => occasional', () => {
    const r = summarizeDtmTopicNurturance([{ topic: 'values', signal: 'caring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('occasional');
  });

  it('occasional => occasional', () => {
    const r = summarizeDtmTopicNurturance([{ topic: 'values', signal: 'occasional' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('occasional');
  });

  it('sparse => withholding', () => {
    const r = summarizeDtmTopicNurturance([{ topic: 'values', signal: 'sparse' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withholding');
  });

  it('withholding => withholding', () => {
    const r = summarizeDtmTopicNurturance([{ topic: 'values', signal: 'withholding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withholding');
  });

  it('mixed 0.5 mean => sparse', () => {
    const r = summarizeDtmTopicNurturance([
      { topic: 'values', signal: 'caring-deeply' },
      { topic: 'values', signal: 'withholding' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sparse');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicNurturance([{ topic: 'x', signal: 'caring' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicNurturance([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicNurturance([
      { topic: 'values', signal: 'caring' },
      { topic: 'values', signal: 'occasional' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('withholdingDtmTopics filters', () => {
    const r = summarizeDtmTopicNurturance([
      { topic: 'values', signal: 'withholding' },
      { topic: 'family', signal: 'sparse' },
      { topic: 'finance', signal: 'caring-deeply' },
    ]);
    expect(withholdingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicNurturance([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicNurturance([
      { topic: 'values', signal: 'caring-deeply' },
      { topic: 'family', signal: 'withholding' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
