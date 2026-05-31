import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReliabilityCadence, unreliableDtmTopics } from '../dtmTopicReliabilityCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicReliabilityCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicReliabilityCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicReliabilityCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('reliable', () => {
    const r = summarizeDtmTopicReliabilityCadence([{ topic: 'values', signal: 'reliable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reliable');
  });

  it('dependable => mixed', () => {
    const r = summarizeDtmTopicReliabilityCadence([{ topic: 'values', signal: 'dependable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicReliabilityCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('inconsistent => unreliable', () => {
    const r = summarizeDtmTopicReliabilityCadence([{ topic: 'values', signal: 'inconsistent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unreliable');
  });

  it('unreliable', () => {
    const r = summarizeDtmTopicReliabilityCadence([{ topic: 'values', signal: 'unreliable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unreliable');
  });

  it('mid => inconsistent', () => {
    const r = summarizeDtmTopicReliabilityCadence([
      { topic: 'values', signal: 'reliable' },
      { topic: 'values', signal: 'unreliable' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('inconsistent');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicReliabilityCadence([{ topic: 'x', signal: 'reliable' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicReliabilityCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicReliabilityCadence([
      { topic: 'values', signal: 'reliable' },
      { topic: 'values', signal: 'inconsistent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unreliableDtmTopics filter', () => {
    const r = summarizeDtmTopicReliabilityCadence([
      { topic: 'values', signal: 'unreliable' },
      { topic: 'family', signal: 'inconsistent' },
      { topic: 'finance', signal: 'reliable' },
    ]);
    expect(unreliableDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicReliabilityCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicReliabilityCadence([
      { topic: 'values', signal: 'reliable' },
      { topic: 'family', signal: 'unreliable' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
