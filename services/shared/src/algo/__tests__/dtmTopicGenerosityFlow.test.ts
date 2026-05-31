import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGenerosityFlow, withholdingDtmTopics } from '../dtmTopicGenerosityFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGenerosityFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGenerosityFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGenerosityFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('lavish => generous', () => {
    const r = summarizeDtmTopicGenerosityFlow([{ topic: 'values', signal: 'lavish' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('generous');
  });

  it('generous => measured', () => {
    const r = summarizeDtmTopicGenerosityFlow([{ topic: 'values', signal: 'generous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('measured');
  });

  it('measured => measured', () => {
    const r = summarizeDtmTopicGenerosityFlow([{ topic: 'values', signal: 'measured' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('measured');
  });

  it('stingy => withholding', () => {
    const r = summarizeDtmTopicGenerosityFlow([{ topic: 'values', signal: 'stingy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withholding');
  });

  it('withholding => withholding', () => {
    const r = summarizeDtmTopicGenerosityFlow([{ topic: 'values', signal: 'withholding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withholding');
  });

  it('mixed 0.5 => stingy', () => {
    const r = summarizeDtmTopicGenerosityFlow([
      { topic: 'values', signal: 'lavish' },
      { topic: 'values', signal: 'withholding' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('stingy');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGenerosityFlow([{ topic: 'x', signal: 'generous' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGenerosityFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGenerosityFlow([
      { topic: 'values', signal: 'generous' },
      { topic: 'values', signal: 'measured' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('withholdingDtmTopics filters', () => {
    const r = summarizeDtmTopicGenerosityFlow([
      { topic: 'values', signal: 'withholding' },
      { topic: 'family', signal: 'stingy' },
      { topic: 'finance', signal: 'lavish' },
    ]);
    expect(withholdingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicGenerosityFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGenerosityFlow([
      { topic: 'values', signal: 'lavish' },
      { topic: 'family', signal: 'withholding' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
