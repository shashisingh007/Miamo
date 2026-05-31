import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHopeOrientation, despairingDtmTopics } from '../dtmTopicHopeOrientation';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHopeOrientation', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHopeOrientation([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHopeOrientation([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('hopeful-and-realistic => hopeful', () => {
    const r = summarizeDtmTopicHopeOrientation([{ topic: 'values', signal: 'hopeful-and-realistic' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hopeful');
  });

  it('hopeful => mixed', () => {
    const r = summarizeDtmTopicHopeOrientation([{ topic: 'values', signal: 'hopeful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicHopeOrientation([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('fading => despairing', () => {
    const r = summarizeDtmTopicHopeOrientation([{ topic: 'values', signal: 'fading' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('despairing');
  });

  it('despairing => despairing', () => {
    const r = summarizeDtmTopicHopeOrientation([{ topic: 'values', signal: 'despairing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('despairing');
  });

  it('mixed mean => fading', () => {
    const r = summarizeDtmTopicHopeOrientation([
      { topic: 'values', signal: 'hopeful-and-realistic' },
      { topic: 'values', signal: 'despairing' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('fading');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHopeOrientation([{ topic: 'x', signal: 'hopeful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHopeOrientation([{ topic: 'values', signal: 'z' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHopeOrientation([
      { topic: 'values', signal: 'hopeful' },
      { topic: 'values', signal: 'mixed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('despairingDtmTopics filters', () => {
    const r = summarizeDtmTopicHopeOrientation([
      { topic: 'values', signal: 'despairing' },
      { topic: 'family', signal: 'fading' },
      { topic: 'finance', signal: 'hopeful-and-realistic' },
    ]);
    expect(despairingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicHopeOrientation([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicHopeOrientation([
      { topic: 'values', signal: 'hopeful-and-realistic' },
      { topic: 'family', signal: 'despairing' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
