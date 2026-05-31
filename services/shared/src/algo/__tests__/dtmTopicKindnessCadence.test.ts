import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicKindnessCadence, unkindDtmTopics } from '../dtmTopicKindnessCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicKindnessCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicKindnessCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicKindnessCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('kind => kind', () => {
    const r = summarizeDtmTopicKindnessCadence([{ topic: 'values', signal: 'kind' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('kind');
  });

  it('considerate => mixed', () => {
    const r = summarizeDtmTopicKindnessCadence([{ topic: 'values', signal: 'considerate' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicKindnessCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('curt => unkind', () => {
    const r = summarizeDtmTopicKindnessCadence([{ topic: 'values', signal: 'curt' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unkind');
  });

  it('unkind => unkind', () => {
    const r = summarizeDtmTopicKindnessCadence([{ topic: 'values', signal: 'unkind' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unkind');
  });

  it('mid => curt', () => {
    const r = summarizeDtmTopicKindnessCadence([
      { topic: 'values', signal: 'kind' },
      { topic: 'values', signal: 'unkind' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('curt');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicKindnessCadence([{ topic: 'x', signal: 'kind' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicKindnessCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicKindnessCadence([
      { topic: 'values', signal: 'kind' },
      { topic: 'values', signal: 'curt' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unkindDtmTopics filter', () => {
    const r = summarizeDtmTopicKindnessCadence([
      { topic: 'values', signal: 'unkind' },
      { topic: 'family', signal: 'curt' },
      { topic: 'finance', signal: 'kind' },
    ]);
    expect(unkindDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicKindnessCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicKindnessCadence([
      { topic: 'values', signal: 'kind' },
      { topic: 'family', signal: 'unkind' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
