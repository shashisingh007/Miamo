import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSeenSensing,
  invisibleDtmTopics,
} from '../dtmTopicSeenSensing';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSeenSensing', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicSeenSensing([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSeenSensing([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully-seen => seen', () => {
    const r = summarizeDtmTopicSeenSensing([{ topic: 'values', signal: 'fully-seen' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('seen');
  });

  it('reflected (0.8) => glimpsed', () => {
    const r = summarizeDtmTopicSeenSensing([{ topic: 'values', signal: 'reflected' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('glimpsed');
  });

  it('glimpsed => glimpsed', () => {
    const r = summarizeDtmTopicSeenSensing([{ topic: 'values', signal: 'glimpsed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('glimpsed');
  });

  it('overlooked => invisible', () => {
    const r = summarizeDtmTopicSeenSensing([{ topic: 'values', signal: 'overlooked' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('invisible');
  });

  it('invisible => invisible', () => {
    const r = summarizeDtmTopicSeenSensing([{ topic: 'values', signal: 'invisible' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('invisible');
  });

  it('mixed 0.5 => overlooked', () => {
    const r = summarizeDtmTopicSeenSensing([
      { topic: 'values', signal: 'fully-seen' },
      { topic: 'values', signal: 'invisible' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('overlooked');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSeenSensing([{ topic: 'q', signal: 'fully-seen' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSeenSensing([
      { topic: 'values', signal: 'x' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSeenSensing([
      { topic: 'values', signal: 'reflected' },
      { topic: 'values', signal: 'glimpsed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('invisibleDtmTopics filters', () => {
    const r = summarizeDtmTopicSeenSensing([
      { topic: 'values', signal: 'invisible' },
      { topic: 'family', signal: 'overlooked' },
      { topic: 'finance', signal: 'fully-seen' },
    ]);
    expect(invisibleDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSeenSensing([
      { topic: 'values', signal: 'fully-seen' },
      { topic: 'family', signal: 'invisible' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicSeenSensing([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
