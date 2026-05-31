import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicIntegrityWeight, compromisedDtmTopics } from '../dtmTopicIntegrityWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicIntegrityWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicIntegrityWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicIntegrityWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('sound => sound', () => {
    const r = summarizeDtmTopicIntegrityWeight([{ topic: 'values', signal: 'sound' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sound');
  });

  it('aligned => mixed', () => {
    const r = summarizeDtmTopicIntegrityWeight([{ topic: 'values', signal: 'aligned' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicIntegrityWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('conflicted => compromised', () => {
    const r = summarizeDtmTopicIntegrityWeight([{ topic: 'values', signal: 'conflicted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('compromised');
  });

  it('compromised => compromised', () => {
    const r = summarizeDtmTopicIntegrityWeight([{ topic: 'values', signal: 'compromised' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('compromised');
  });

  it('mid => conflicted', () => {
    const r = summarizeDtmTopicIntegrityWeight([
      { topic: 'values', signal: 'sound' },
      { topic: 'values', signal: 'compromised' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('conflicted');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicIntegrityWeight([{ topic: 'x', signal: 'sound' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicIntegrityWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicIntegrityWeight([
      { topic: 'values', signal: 'sound' },
      { topic: 'values', signal: 'conflicted' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('compromisedDtmTopics filter', () => {
    const r = summarizeDtmTopicIntegrityWeight([
      { topic: 'values', signal: 'compromised' },
      { topic: 'family', signal: 'conflicted' },
      { topic: 'finance', signal: 'sound' },
    ]);
    expect(compromisedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicIntegrityWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicIntegrityWeight([
      { topic: 'values', signal: 'sound' },
      { topic: 'family', signal: 'compromised' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
