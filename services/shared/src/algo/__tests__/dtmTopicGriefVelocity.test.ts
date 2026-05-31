import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGriefVelocity, frozenGriefDtmTopics } from '../dtmTopicGriefVelocity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGriefVelocity', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGriefVelocity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGriefVelocity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('flowing => moving', () => {
    const r = summarizeDtmTopicGriefVelocity([{ topic: 'values', signal: 'flowing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('moving');
  });

  it('moving => mixed', () => {
    const r = summarizeDtmTopicGriefVelocity([{ topic: 'values', signal: 'moving' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicGriefVelocity([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('sticky => frozen', () => {
    const r = summarizeDtmTopicGriefVelocity([{ topic: 'values', signal: 'sticky' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('frozen');
  });

  it('frozen => frozen', () => {
    const r = summarizeDtmTopicGriefVelocity([{ topic: 'values', signal: 'frozen' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('frozen');
  });

  it('mixed midpoint => sticky', () => {
    const r = summarizeDtmTopicGriefVelocity([
      { topic: 'values', signal: 'flowing' },
      { topic: 'values', signal: 'frozen' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sticky');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGriefVelocity([{ topic: 'x', signal: 'flowing' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGriefVelocity([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGriefVelocity([
      { topic: 'values', signal: 'flowing' },
      { topic: 'values', signal: 'sticky' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('frozenGriefDtmTopics filter', () => {
    const r = summarizeDtmTopicGriefVelocity([
      { topic: 'values', signal: 'frozen' },
      { topic: 'family', signal: 'sticky' },
      { topic: 'finance', signal: 'flowing' },
    ]);
    expect(frozenGriefDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGriefVelocity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGriefVelocity([
      { topic: 'values', signal: 'flowing' },
      { topic: 'family', signal: 'frozen' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
