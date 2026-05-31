import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicEnergizationFlow, depletedDtmTopics } from '../dtmTopicEnergizationFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicEnergizationFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicEnergizationFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicEnergizationFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('vibrant => energized', () => {
    const r = summarizeDtmTopicEnergizationFlow([{ topic: 'values', signal: 'vibrant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('energized');
  });

  it('energized => steady', () => {
    const r = summarizeDtmTopicEnergizationFlow([{ topic: 'values', signal: 'energized' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('steady');
  });

  it('steady => steady', () => {
    const r = summarizeDtmTopicEnergizationFlow([{ topic: 'values', signal: 'steady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('steady');
  });

  it('drained => depleted', () => {
    const r = summarizeDtmTopicEnergizationFlow([{ topic: 'values', signal: 'drained' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleted');
  });

  it('depleted => depleted', () => {
    const r = summarizeDtmTopicEnergizationFlow([{ topic: 'values', signal: 'depleted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('depleted');
  });

  it('mixed 0.5 => drained', () => {
    const r = summarizeDtmTopicEnergizationFlow([
      { topic: 'values', signal: 'vibrant' },
      { topic: 'values', signal: 'depleted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('drained');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicEnergizationFlow([{ topic: 'x', signal: 'vibrant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicEnergizationFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicEnergizationFlow([
      { topic: 'values', signal: 'vibrant' },
      { topic: 'values', signal: 'drained' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('depletedDtmTopics filter', () => {
    const r = summarizeDtmTopicEnergizationFlow([
      { topic: 'values', signal: 'depleted' },
      { topic: 'family', signal: 'drained' },
      { topic: 'finance', signal: 'vibrant' },
    ]);
    expect(depletedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicEnergizationFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicEnergizationFlow([
      { topic: 'values', signal: 'vibrant' },
      { topic: 'family', signal: 'depleted' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
