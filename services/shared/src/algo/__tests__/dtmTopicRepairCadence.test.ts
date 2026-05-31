import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicRepairCadence, absentRepairDtmTopics } from '../dtmTopicRepairCadence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRepairCadence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicRepairCadence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicRepairCadence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('rapid => timely', () => {
    const r = summarizeDtmTopicRepairCadence([{ topic: 'values', signal: 'rapid' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('timely');
  });

  it('timely => mixed', () => {
    const r = summarizeDtmTopicRepairCadence([{ topic: 'values', signal: 'timely' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicRepairCadence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('delayed => absent', () => {
    const r = summarizeDtmTopicRepairCadence([{ topic: 'values', signal: 'delayed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent', () => {
    const r = summarizeDtmTopicRepairCadence([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mid', () => {
    const r = summarizeDtmTopicRepairCadence([
      { topic: 'values', signal: 'rapid' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('delayed');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicRepairCadence([{ topic: 'x', signal: 'rapid' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicRepairCadence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRepairCadence([
      { topic: 'values', signal: 'rapid' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('absentRepairDtmTopics filter', () => {
    const r = summarizeDtmTopicRepairCadence([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'delayed' },
      { topic: 'finance', signal: 'rapid' },
    ]);
    expect(absentRepairDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicRepairCadence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicRepairCadence([
      { topic: 'values', signal: 'rapid' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
