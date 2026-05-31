import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHopeStance, despairingDtmTopics } from '../dtmTopicHopeStance';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHopeStance', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHopeStance([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHopeStance([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('hopeful => optimistic band', () => {
    const r = summarizeDtmTopicHopeStance([{ topic: 'values', signal: 'hopeful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('optimistic');
  });

  it('optimistic => mixed', () => {
    const r = summarizeDtmTopicHopeStance([{ topic: 'values', signal: 'optimistic' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicHopeStance([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('doubtful', () => {
    const r = summarizeDtmTopicHopeStance([{ topic: 'values', signal: 'doubtful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('despairing');
  });

  it('despairing', () => {
    const r = summarizeDtmTopicHopeStance([{ topic: 'values', signal: 'despairing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('despairing');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicHopeStance([
      { topic: 'values', signal: 'hopeful' },
      { topic: 'values', signal: 'despairing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('doubtful');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHopeStance([{ topic: 'x', signal: 'hopeful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHopeStance([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHopeStance([
      { topic: 'values', signal: 'hopeful' },
      { topic: 'values', signal: 'despairing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('despairingDtmTopics filter', () => {
    const r = summarizeDtmTopicHopeStance([
      { topic: 'values', signal: 'despairing' },
      { topic: 'family', signal: 'doubtful' },
      { topic: 'finance', signal: 'hopeful' },
    ]);
    expect(despairingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicHopeStance([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicHopeStance([
      { topic: 'values', signal: 'hopeful' },
      { topic: 'family', signal: 'despairing' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
