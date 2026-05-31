import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicTendernessFlow, hardenedDtmTopics } from '../dtmTopicTendernessFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTendernessFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicTendernessFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicTendernessFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('tender => soft', () => {
    const r = summarizeDtmTopicTendernessFlow([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('soft');
  });

  it('soft signal => mixed', () => {
    const r = summarizeDtmTopicTendernessFlow([{ topic: 'values', signal: 'soft' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicTendernessFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('guarded => hardened', () => {
    const r = summarizeDtmTopicTendernessFlow([{ topic: 'values', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hardened');
  });

  it('hardened => hardened', () => {
    const r = summarizeDtmTopicTendernessFlow([{ topic: 'values', signal: 'hardened' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hardened');
  });

  it('mixed midpoint => guarded', () => {
    const r = summarizeDtmTopicTendernessFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'hardened' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('guarded');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicTendernessFlow([{ topic: 'x', signal: 'tender' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicTendernessFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTendernessFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'guarded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('hardenedDtmTopics filter', () => {
    const r = summarizeDtmTopicTendernessFlow([
      { topic: 'values', signal: 'hardened' },
      { topic: 'family', signal: 'guarded' },
      { topic: 'finance', signal: 'tender' },
    ]);
    expect(hardenedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicTendernessFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicTendernessFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'family', signal: 'hardened' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
