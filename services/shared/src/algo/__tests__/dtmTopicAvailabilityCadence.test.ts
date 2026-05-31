import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAvailabilityCadence, unavailableDtmTopics } from '../dtmTopicAvailabilityCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAvailabilityCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAvailabilityCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAvailabilityCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('available', () => {
    const r = summarizeDtmTopicAvailabilityCadence([{ topic: 'values', signal: 'available' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('available');
  });

  it('reachable => mixed', () => {
    const r = summarizeDtmTopicAvailabilityCadence([{ topic: 'values', signal: 'reachable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicAvailabilityCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('scarce', () => {
    const r = summarizeDtmTopicAvailabilityCadence([{ topic: 'values', signal: 'scarce' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unavailable');
  });

  it('unavailable', () => {
    const r = summarizeDtmTopicAvailabilityCadence([{ topic: 'values', signal: 'unavailable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unavailable');
  });

  it('mid', () => {
    const r = summarizeDtmTopicAvailabilityCadence([
      { topic: 'values', signal: 'available' },
      { topic: 'values', signal: 'unavailable' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('scarce');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAvailabilityCadence([{ topic: 'x', signal: 'available' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAvailabilityCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAvailabilityCadence([
      { topic: 'values', signal: 'available' },
      { topic: 'values', signal: 'unavailable' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unavailableDtmTopics filter', () => {
    const r = summarizeDtmTopicAvailabilityCadence([
      { topic: 'values', signal: 'unavailable' },
      { topic: 'family', signal: 'scarce' },
      { topic: 'finance', signal: 'available' },
    ]);
    expect(unavailableDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAvailabilityCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAvailabilityCadence([
      { topic: 'values', signal: 'available' },
      { topic: 'family', signal: 'unavailable' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
