import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGriefDepth, shieldedDtmTopics } from '../dtmTopicGriefDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGriefDepth', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGriefDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGriefDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('mourning => sorrowful', () => {
    const r = summarizeDtmTopicGriefDepth([{ topic: 'values', signal: 'mourning' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sorrowful');
  });

  it('sorrowful => mixed', () => {
    const r = summarizeDtmTopicGriefDepth([{ topic: 'values', signal: 'sorrowful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicGriefDepth([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('tender => shielded', () => {
    const r = summarizeDtmTopicGriefDepth([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shielded');
  });

  it('shielded => shielded', () => {
    const r = summarizeDtmTopicGriefDepth([{ topic: 'values', signal: 'shielded' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('shielded');
  });

  it('mixed midpoint => tender', () => {
    const r = summarizeDtmTopicGriefDepth([
      { topic: 'values', signal: 'mourning' },
      { topic: 'values', signal: 'shielded' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tender');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGriefDepth([{ topic: 'x', signal: 'mourning' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGriefDepth([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGriefDepth([
      { topic: 'values', signal: 'mourning' },
      { topic: 'values', signal: 'tender' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('shieldedDtmTopics filter', () => {
    const r = summarizeDtmTopicGriefDepth([
      { topic: 'values', signal: 'shielded' },
      { topic: 'family', signal: 'tender' },
      { topic: 'finance', signal: 'mourning' },
    ]);
    expect(shieldedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGriefDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGriefDepth([
      { topic: 'values', signal: 'mourning' },
      { topic: 'family', signal: 'shielded' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
