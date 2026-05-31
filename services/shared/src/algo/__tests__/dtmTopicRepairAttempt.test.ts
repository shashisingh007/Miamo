import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRepairAttempt,
  rejectedDtmTopics,
} from '../dtmTopicRepairAttempt';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRepairAttempt', () => {
  it('returns 16 canonical topics', () => {
    const r = summarizeDtmTopicRepairAttempt([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('all untested empty', () => {
    expect(summarizeDtmTopicRepairAttempt([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('accepted-repair => connecting', () => {
    const r = summarizeDtmTopicRepairAttempt([{ topic: 'conflict', signal: 'accepted-repair' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('connecting');
  });

  it('offered-repair (0.7) => attempted', () => {
    const r = summarizeDtmTopicRepairAttempt([{ topic: 'conflict', signal: 'offered-repair' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('attempted');
  });

  it('partial-accept (0.5) => ignored', () => {
    const r = summarizeDtmTopicRepairAttempt([{ topic: 'conflict', signal: 'partial-accept' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('ignored');
  });

  it('ignored-repair (0.2) => rejected', () => {
    const r = summarizeDtmTopicRepairAttempt([{ topic: 'conflict', signal: 'ignored-repair' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('rejected');
  });

  it('rejected-repair => rejected', () => {
    const r = summarizeDtmTopicRepairAttempt([{ topic: 'conflict', signal: 'rejected-repair' }]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('rejected');
  });

  it('mixed accepted + rejected (0.5) => ignored', () => {
    const r = summarizeDtmTopicRepairAttempt([
      { topic: 'conflict', signal: 'accepted-repair' },
      { topic: 'conflict', signal: 'rejected-repair' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('ignored');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicRepairAttempt([{ topic: 'nope', signal: 'accepted-repair' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicRepairAttempt([{ topic: 'conflict', signal: 'xyz' as any }]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRepairAttempt([
      { topic: 'conflict', signal: 'accepted-repair' },
      { topic: 'conflict', signal: 'partial-accept' },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.n).toBe(2);
  });

  it('rejectedDtmTopics filters', () => {
    const r = summarizeDtmTopicRepairAttempt([
      { topic: 'conflict', signal: 'rejected-repair' },
      { topic: 'family', signal: 'accepted-repair' },
    ]);
    const rj = rejectedDtmTopics(r);
    expect(rj).toHaveLength(1);
    expect(rj[0].topic).toBe('conflict');
  });

  it('scores bounded [0,1]', () => {
    const r = summarizeDtmTopicRepairAttempt([
      { topic: 'conflict', signal: 'accepted-repair' },
      { topic: 'family', signal: 'rejected-repair' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order preserved', () => {
    const r = summarizeDtmTopicRepairAttempt([
      { topic: 'future', signal: 'accepted-repair' },
      { topic: 'values', signal: 'rejected-repair' },
    ]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
