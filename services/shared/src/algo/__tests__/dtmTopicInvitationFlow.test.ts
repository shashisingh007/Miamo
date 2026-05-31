import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicInvitationFlow,
  closedDtmTopics,
} from '../dtmTopicInvitationFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicInvitationFlow', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicInvitationFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicInvitationFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('open-invitation => invited', () => {
    const r = summarizeDtmTopicInvitationFlow([
      { topic: 'values', signal: 'open-invitation' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('invited');
  });

  it('invited (0.8) => allowed', () => {
    const r = summarizeDtmTopicInvitationFlow([{ topic: 'values', signal: 'invited' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('allowed');
  });

  it('cool-allowed => allowed', () => {
    const r = summarizeDtmTopicInvitationFlow([
      { topic: 'values', signal: 'cool-allowed' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('allowed');
  });

  it('gated => closed', () => {
    const r = summarizeDtmTopicInvitationFlow([{ topic: 'values', signal: 'gated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('closed-out => closed', () => {
    const r = summarizeDtmTopicInvitationFlow([{ topic: 'values', signal: 'closed-out' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('closed');
  });

  it('mixed 0.5 => gated', () => {
    const r = summarizeDtmTopicInvitationFlow([
      { topic: 'values', signal: 'open-invitation' },
      { topic: 'values', signal: 'closed-out' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('gated');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicInvitationFlow([{ topic: 'q', signal: 'invited' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicInvitationFlow([
      { topic: 'values', signal: 'huh' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicInvitationFlow([
      { topic: 'values', signal: 'invited' },
      { topic: 'values', signal: 'invited' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('closedDtmTopics filters', () => {
    const r = summarizeDtmTopicInvitationFlow([
      { topic: 'values', signal: 'closed-out' },
      { topic: 'family', signal: 'gated' },
      { topic: 'finance', signal: 'open-invitation' },
    ]);
    expect(closedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicInvitationFlow([
      { topic: 'values', signal: 'open-invitation' },
      { topic: 'family', signal: 'closed-out' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicInvitationFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
