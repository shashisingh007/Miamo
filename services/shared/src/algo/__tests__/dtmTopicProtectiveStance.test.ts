import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicProtectiveStance, exposedDtmTopics } from '../dtmTopicProtectiveStance';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicProtectiveStance', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicProtectiveStance([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicProtectiveStance([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('guarding => shielding', () => {
    const r = summarizeDtmTopicProtectiveStance([{ topic: 'values', signal: 'guarding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shielding');
  });

  it('shielding => mixed', () => {
    const r = summarizeDtmTopicProtectiveStance([{ topic: 'values', signal: 'shielding' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicProtectiveStance([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('permeable => exposed', () => {
    const r = summarizeDtmTopicProtectiveStance([{ topic: 'values', signal: 'permeable' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('exposed');
  });

  it('exposed => exposed', () => {
    const r = summarizeDtmTopicProtectiveStance([{ topic: 'values', signal: 'exposed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('exposed');
  });

  it('mixed 0.5 => permeable', () => {
    const r = summarizeDtmTopicProtectiveStance([
      { topic: 'values', signal: 'guarding' },
      { topic: 'values', signal: 'exposed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('permeable');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicProtectiveStance([{ topic: 'x', signal: 'guarding' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicProtectiveStance([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicProtectiveStance([
      { topic: 'values', signal: 'guarding' },
      { topic: 'values', signal: 'permeable' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('exposedDtmTopics filter', () => {
    const r = summarizeDtmTopicProtectiveStance([
      { topic: 'values', signal: 'exposed' },
      { topic: 'family', signal: 'permeable' },
      { topic: 'finance', signal: 'guarding' },
    ]);
    expect(exposedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicProtectiveStance([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicProtectiveStance([
      { topic: 'values', signal: 'guarding' },
      { topic: 'family', signal: 'exposed' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
