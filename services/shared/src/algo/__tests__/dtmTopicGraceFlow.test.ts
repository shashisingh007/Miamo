import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGraceFlow, jarringDtmTopics } from '../dtmTopicGraceFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGraceFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGraceFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGraceFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('graceful => graceful', () => {
    const r = summarizeDtmTopicGraceFlow([{ topic: 'values', signal: 'graceful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('graceful');
  });

  it('flowing => mixed', () => {
    const r = summarizeDtmTopicGraceFlow([{ topic: 'values', signal: 'flowing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicGraceFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('awkward => jarring', () => {
    const r = summarizeDtmTopicGraceFlow([{ topic: 'values', signal: 'awkward' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('jarring');
  });

  it('jarring => jarring', () => {
    const r = summarizeDtmTopicGraceFlow([{ topic: 'values', signal: 'jarring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('jarring');
  });

  it('mid => awkward', () => {
    const r = summarizeDtmTopicGraceFlow([
      { topic: 'values', signal: 'graceful' },
      { topic: 'values', signal: 'jarring' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('awkward');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGraceFlow([{ topic: 'x', signal: 'graceful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGraceFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGraceFlow([
      { topic: 'values', signal: 'graceful' },
      { topic: 'values', signal: 'awkward' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('jarringDtmTopics filter', () => {
    const r = summarizeDtmTopicGraceFlow([
      { topic: 'values', signal: 'jarring' },
      { topic: 'family', signal: 'awkward' },
      { topic: 'finance', signal: 'graceful' },
    ]);
    expect(jarringDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGraceFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGraceFlow([
      { topic: 'values', signal: 'graceful' },
      { topic: 'family', signal: 'jarring' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
