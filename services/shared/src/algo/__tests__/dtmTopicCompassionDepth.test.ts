import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCompassionDepth, callousDtmTopics } from '../dtmTopicCompassionDepth';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCompassionDepth', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCompassionDepth([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCompassionDepth([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('deep => deep', () => {
    const r = summarizeDtmTopicCompassionDepth([{ topic: 'values', signal: 'deep' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('deep');
  });

  it('warm signal => mixed', () => {
    const r = summarizeDtmTopicCompassionDepth([{ topic: 'values', signal: 'warm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicCompassionDepth([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('distant => callous', () => {
    const r = summarizeDtmTopicCompassionDepth([{ topic: 'values', signal: 'distant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('callous');
  });

  it('callous => callous', () => {
    const r = summarizeDtmTopicCompassionDepth([{ topic: 'values', signal: 'callous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('callous');
  });

  it('mixed midpoint => distant', () => {
    const r = summarizeDtmTopicCompassionDepth([
      { topic: 'values', signal: 'deep' },
      { topic: 'values', signal: 'callous' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCompassionDepth([{ topic: 'x', signal: 'deep' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCompassionDepth([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCompassionDepth([
      { topic: 'values', signal: 'deep' },
      { topic: 'values', signal: 'distant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('callousDtmTopics filter', () => {
    const r = summarizeDtmTopicCompassionDepth([
      { topic: 'values', signal: 'callous' },
      { topic: 'family', signal: 'distant' },
      { topic: 'finance', signal: 'deep' },
    ]);
    expect(callousDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCompassionDepth([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCompassionDepth([
      { topic: 'values', signal: 'deep' },
      { topic: 'family', signal: 'callous' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
