import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSoftnessImpact, harshDtmTopics } from '../dtmTopicSoftnessImpact';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSoftnessImpact', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicSoftnessImpact([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSoftnessImpact([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('tender => soft', () => {
    const r = summarizeDtmTopicSoftnessImpact([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('soft');
  });

  it('gentle (0.8) => neutral', () => {
    const r = summarizeDtmTopicSoftnessImpact([{ topic: 'values', signal: 'gentle' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neutral');
  });

  it('neutral => neutral', () => {
    const r = summarizeDtmTopicSoftnessImpact([{ topic: 'values', signal: 'neutral' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neutral');
  });

  it('edged => harsh', () => {
    const r = summarizeDtmTopicSoftnessImpact([{ topic: 'values', signal: 'edged' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('harsh => harsh', () => {
    const r = summarizeDtmTopicSoftnessImpact([{ topic: 'values', signal: 'harsh' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('mixed 0.5 => edged', () => {
    const r = summarizeDtmTopicSoftnessImpact([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('edged');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSoftnessImpact([{ topic: 'q', signal: 'tender' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSoftnessImpact([
      { topic: 'values', signal: 'q' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSoftnessImpact([
      { topic: 'values', signal: 'gentle' },
      { topic: 'values', signal: 'gentle' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('harshDtmTopics filters', () => {
    const r = summarizeDtmTopicSoftnessImpact([
      { topic: 'values', signal: 'harsh' },
      { topic: 'family', signal: 'edged' },
      { topic: 'finance', signal: 'tender' },
    ]);
    expect(harshDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSoftnessImpact([
      { topic: 'values', signal: 'tender' },
      { topic: 'family', signal: 'harsh' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicSoftnessImpact([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
