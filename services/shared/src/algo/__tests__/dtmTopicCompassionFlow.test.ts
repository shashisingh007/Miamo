import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCompassionFlow, callousDtmTopics } from '../dtmTopicCompassionFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCompassionFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCompassionFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCompassionFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('tender => compassionate', () => {
    const r = summarizeDtmTopicCompassionFlow([{ topic: 'values', signal: 'tender' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('compassionate');
  });

  it('caring => sympathetic', () => {
    const r = summarizeDtmTopicCompassionFlow([{ topic: 'values', signal: 'caring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sympathetic');
  });

  it('sympathetic => sympathetic', () => {
    const r = summarizeDtmTopicCompassionFlow([{ topic: 'values', signal: 'sympathetic' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sympathetic');
  });

  it('detached => callous', () => {
    const r = summarizeDtmTopicCompassionFlow([{ topic: 'values', signal: 'detached' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('callous');
  });

  it('callous => callous', () => {
    const r = summarizeDtmTopicCompassionFlow([{ topic: 'values', signal: 'callous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('callous');
  });

  it('mixed 0.5 => detached', () => {
    const r = summarizeDtmTopicCompassionFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'callous' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('detached');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCompassionFlow([{ topic: 'x', signal: 'tender' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCompassionFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCompassionFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'values', signal: 'detached' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('callousDtmTopics filter', () => {
    const r = summarizeDtmTopicCompassionFlow([
      { topic: 'values', signal: 'callous' },
      { topic: 'family', signal: 'detached' },
      { topic: 'finance', signal: 'tender' },
    ]);
    expect(callousDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicCompassionFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicCompassionFlow([
      { topic: 'values', signal: 'tender' },
      { topic: 'family', signal: 'callous' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
