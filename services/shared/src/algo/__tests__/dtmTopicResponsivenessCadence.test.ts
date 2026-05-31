import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicResponsivenessCadence, unresponsiveDtmTopics } from '../dtmTopicResponsivenessCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicResponsivenessCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicResponsivenessCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicResponsivenessCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('prompt', () => {
    const r = summarizeDtmTopicResponsivenessCadence([{ topic: 'values', signal: 'prompt' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('prompt');
  });

  it('timely => mixed', () => {
    const r = summarizeDtmTopicResponsivenessCadence([{ topic: 'values', signal: 'timely' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicResponsivenessCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('delayed => unresponsive', () => {
    const r = summarizeDtmTopicResponsivenessCadence([{ topic: 'values', signal: 'delayed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unresponsive');
  });

  it('unresponsive', () => {
    const r = summarizeDtmTopicResponsivenessCadence([{ topic: 'values', signal: 'unresponsive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('unresponsive');
  });

  it('mid => delayed', () => {
    const r = summarizeDtmTopicResponsivenessCadence([
      { topic: 'values', signal: 'prompt' },
      { topic: 'values', signal: 'unresponsive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('delayed');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicResponsivenessCadence([{ topic: 'x', signal: 'prompt' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicResponsivenessCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicResponsivenessCadence([
      { topic: 'values', signal: 'prompt' },
      { topic: 'values', signal: 'delayed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unresponsiveDtmTopics filter', () => {
    const r = summarizeDtmTopicResponsivenessCadence([
      { topic: 'values', signal: 'unresponsive' },
      { topic: 'family', signal: 'delayed' },
      { topic: 'finance', signal: 'prompt' },
    ]);
    expect(unresponsiveDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicResponsivenessCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicResponsivenessCadence([
      { topic: 'values', signal: 'prompt' },
      { topic: 'family', signal: 'unresponsive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
