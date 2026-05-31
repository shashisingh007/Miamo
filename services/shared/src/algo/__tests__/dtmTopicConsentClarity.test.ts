import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicConsentClarity, unclearConsentDtmTopics } from '../dtmTopicConsentClarity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicConsentClarity', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicConsentClarity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicConsentClarity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('explicit', () => {
    const r = summarizeDtmTopicConsentClarity([{ topic: 'values', signal: 'explicit' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('explicit');
  });

  it('clear => mixed', () => {
    const r = summarizeDtmTopicConsentClarity([{ topic: 'values', signal: 'clear' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicConsentClarity([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('ambiguous => absent', () => {
    const r = summarizeDtmTopicConsentClarity([{ topic: 'values', signal: 'ambiguous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('absent', () => {
    const r = summarizeDtmTopicConsentClarity([{ topic: 'values', signal: 'absent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('absent');
  });

  it('mid', () => {
    const r = summarizeDtmTopicConsentClarity([
      { topic: 'values', signal: 'explicit' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('ambiguous');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicConsentClarity([{ topic: 'x', signal: 'explicit' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicConsentClarity([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicConsentClarity([
      { topic: 'values', signal: 'explicit' },
      { topic: 'values', signal: 'absent' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('unclearConsentDtmTopics filter', () => {
    const r = summarizeDtmTopicConsentClarity([
      { topic: 'values', signal: 'absent' },
      { topic: 'family', signal: 'ambiguous' },
      { topic: 'finance', signal: 'explicit' },
    ]);
    expect(unclearConsentDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicConsentClarity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicConsentClarity([
      { topic: 'values', signal: 'explicit' },
      { topic: 'family', signal: 'absent' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
