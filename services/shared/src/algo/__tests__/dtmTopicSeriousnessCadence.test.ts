import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSeriousnessCadence, flippantDtmTopics } from '../dtmTopicSeriousnessCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSeriousnessCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSeriousnessCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSeriousnessCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('grave => serious', () => {
    const r = summarizeDtmTopicSeriousnessCadence([{ topic: 'values', signal: 'grave' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('serious');
  });

  it('serious => measured', () => {
    const r = summarizeDtmTopicSeriousnessCadence([{ topic: 'values', signal: 'serious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('measured');
  });

  it('measured => measured', () => {
    const r = summarizeDtmTopicSeriousnessCadence([{ topic: 'values', signal: 'measured' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('measured');
  });

  it('flippant => dismissive', () => {
    const r = summarizeDtmTopicSeriousnessCadence([{ topic: 'values', signal: 'flippant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissive');
  });

  it('dismissive => dismissive', () => {
    const r = summarizeDtmTopicSeriousnessCadence([{ topic: 'values', signal: 'dismissive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissive');
  });

  it('mixed 0.5 => flippant', () => {
    const r = summarizeDtmTopicSeriousnessCadence([
      { topic: 'values', signal: 'grave' },
      { topic: 'values', signal: 'dismissive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flippant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSeriousnessCadence([{ topic: 'x', signal: 'grave' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSeriousnessCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSeriousnessCadence([
      { topic: 'values', signal: 'grave' },
      { topic: 'values', signal: 'flippant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('flippantDtmTopics filter', () => {
    const r = summarizeDtmTopicSeriousnessCadence([
      { topic: 'values', signal: 'dismissive' },
      { topic: 'family', signal: 'flippant' },
      { topic: 'finance', signal: 'grave' },
    ]);
    expect(flippantDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSeriousnessCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSeriousnessCadence([
      { topic: 'values', signal: 'grave' },
      { topic: 'family', signal: 'dismissive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
