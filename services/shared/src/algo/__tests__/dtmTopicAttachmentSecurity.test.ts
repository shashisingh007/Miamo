import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAttachmentSecurity, insecureAttachmentDtmTopics } from '../dtmTopicAttachmentSecurity';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAttachmentSecurity', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAttachmentSecurity([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAttachmentSecurity([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('secure => secure', () => {
    const r = summarizeDtmTopicAttachmentSecurity([{ topic: 'values', signal: 'secure' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('secure');
  });

  it('available => tentative', () => {
    const r = summarizeDtmTopicAttachmentSecurity([{ topic: 'values', signal: 'available' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tentative');
  });

  it('tentative => tentative', () => {
    const r = summarizeDtmTopicAttachmentSecurity([{ topic: 'values', signal: 'tentative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tentative');
  });

  it('anxious => avoidant', () => {
    const r = summarizeDtmTopicAttachmentSecurity([{ topic: 'values', signal: 'anxious' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('avoidant');
  });

  it('avoidant => avoidant', () => {
    const r = summarizeDtmTopicAttachmentSecurity([{ topic: 'values', signal: 'avoidant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('avoidant');
  });

  it('mixed 0.5 => anxious', () => {
    const r = summarizeDtmTopicAttachmentSecurity([
      { topic: 'values', signal: 'secure' },
      { topic: 'values', signal: 'avoidant' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('anxious');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAttachmentSecurity([{ topic: 'x', signal: 'secure' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAttachmentSecurity([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAttachmentSecurity([
      { topic: 'values', signal: 'secure' },
      { topic: 'values', signal: 'anxious' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('insecureAttachmentDtmTopics filter', () => {
    const r = summarizeDtmTopicAttachmentSecurity([
      { topic: 'values', signal: 'avoidant' },
      { topic: 'family', signal: 'anxious' },
      { topic: 'finance', signal: 'secure' },
    ]);
    expect(insecureAttachmentDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAttachmentSecurity([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAttachmentSecurity([
      { topic: 'values', signal: 'secure' },
      { topic: 'family', signal: 'avoidant' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
