import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWelcomePresence, rejectingDtmTopics } from '../dtmTopicWelcomePresence';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWelcomePresence', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWelcomePresence([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWelcomePresence([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('inviting => welcoming', () => {
    const r = summarizeDtmTopicWelcomePresence([{ topic: 'values', signal: 'inviting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('welcoming');
  });

  it('welcoming => mixed', () => {
    const r = summarizeDtmTopicWelcomePresence([{ topic: 'values', signal: 'welcoming' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicWelcomePresence([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('aloof => rejecting', () => {
    const r = summarizeDtmTopicWelcomePresence([{ topic: 'values', signal: 'aloof' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('rejecting', () => {
    const r = summarizeDtmTopicWelcomePresence([{ topic: 'values', signal: 'rejecting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejecting');
  });

  it('mid', () => {
    const r = summarizeDtmTopicWelcomePresence([
      { topic: 'values', signal: 'inviting' },
      { topic: 'values', signal: 'rejecting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('aloof');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWelcomePresence([{ topic: 'x', signal: 'inviting' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWelcomePresence([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWelcomePresence([
      { topic: 'values', signal: 'inviting' },
      { topic: 'values', signal: 'rejecting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('rejectingDtmTopics filter', () => {
    const r = summarizeDtmTopicWelcomePresence([
      { topic: 'values', signal: 'rejecting' },
      { topic: 'family', signal: 'aloof' },
      { topic: 'finance', signal: 'inviting' },
    ]);
    expect(rejectingDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicWelcomePresence([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicWelcomePresence([
      { topic: 'values', signal: 'inviting' },
      { topic: 'family', signal: 'rejecting' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
