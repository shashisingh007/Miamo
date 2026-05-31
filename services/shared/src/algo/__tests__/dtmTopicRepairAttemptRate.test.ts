import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRepairAttempts,
  fragileRepairDtmTopics,
} from '../dtmTopicRepairAttemptRate';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicRepairAttemptRate', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicRepairAttempts([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('no events => silent', () => {
    for (const r of summarizeDtmTopicRepairAttempts([])) expect(r.band).toBe('silent');
  });

  it('all accepted => resilient', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'conflict', outcome: 'accepted' },
      { topic: 'conflict', outcome: 'accepted' },
      { topic: 'conflict', outcome: 'accepted' },
      { topic: 'conflict', outcome: 'accepted' },
    ]);
    const c = r.find((x) => x.topic === 'conflict')!;
    expect(c.acceptanceRate).toBe(1);
    expect(c.band).toBe('resilient');
  });

  it('all rejected => fragile', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'finance', outcome: 'rejected' },
      { topic: 'finance', outcome: 'rejected' },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('fragile');
  });

  it('half accepted => recovering', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'family', outcome: 'accepted' },
      { topic: 'family', outcome: 'accepted' },
      { topic: 'family', outcome: 'rejected' },
      { topic: 'family', outcome: 'rejected' },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('recovering');
  });

  it('ignored counts as attempt', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'intimacy', outcome: 'ignored' },
      { topic: 'intimacy', outcome: 'ignored' },
    ]);
    const i = r.find((x) => x.topic === 'intimacy')!;
    expect(i.attempts).toBe(2);
    expect(i.ignored).toBe(2);
    expect(i.band).toBe('fragile');
  });

  it('attempted only counts as attempt', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'growth', outcome: 'attempted' },
    ]);
    const g = r.find((x) => x.topic === 'growth')!;
    expect(g.attempts).toBe(1);
    expect(g.accepted).toBe(0);
    expect(g.band).toBe('fragile');
  });

  it('mixed bucket counts', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'leisure', outcome: 'accepted' },
      { topic: 'leisure', outcome: 'rejected' },
      { topic: 'leisure', outcome: 'ignored' },
      { topic: 'leisure', outcome: 'attempted' },
    ]);
    const l = r.find((x) => x.topic === 'leisure')!;
    expect(l.attempts).toBe(4);
    expect(l.accepted).toBe(1);
    expect(l.rejected).toBe(1);
    expect(l.ignored).toBe(1);
    expect(l.acceptanceRate).toBe(0.25);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicRepairAttempts([{ topic: 'nope', outcome: 'accepted' }]);
    expect(r.find((x) => x.topic === 'values')!.attempts).toBe(0);
  });

  it('ignores invalid outcome', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'values', outcome: 'wat' as any },
    ]);
    expect(r.find((x) => x.topic === 'values')!.attempts).toBe(0);
  });

  it('boundary 0.4 => recovering', () => {
    // 2/5 = 0.4
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'social', outcome: 'accepted' },
      { topic: 'social', outcome: 'accepted' },
      { topic: 'social', outcome: 'rejected' },
      { topic: 'social', outcome: 'rejected' },
      { topic: 'social', outcome: 'rejected' },
    ]);
    expect(r.find((x) => x.topic === 'social')!.band).toBe('recovering');
  });

  it('boundary 0.75 => resilient', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'health', outcome: 'accepted' },
      { topic: 'health', outcome: 'accepted' },
      { topic: 'health', outcome: 'accepted' },
      { topic: 'health', outcome: 'rejected' },
    ]);
    expect(r.find((x) => x.topic === 'health')!.band).toBe('resilient');
  });

  it('all 16 topics handled', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, outcome: 'accepted' });
    const r = summarizeDtmTopicRepairAttempts(evs);
    for (const row of r) expect(row.band).toBe('resilient');
  });

  it('fragileRepairDtmTopics returns fragile only', () => {
    const r = summarizeDtmTopicRepairAttempts([
      { topic: 'conflict', outcome: 'rejected' },
      { topic: 'family', outcome: 'accepted' },
      { topic: 'family', outcome: 'accepted' },
      { topic: 'family', outcome: 'accepted' },
      { topic: 'family', outcome: 'accepted' },
    ]);
    const f = fragileRepairDtmTopics(r);
    expect(f).toContain('conflict');
    expect(f).not.toContain('family');
  });

  it('empty fragile list when none fragile', () => {
    const r = summarizeDtmTopicRepairAttempts([]);
    expect(fragileRepairDtmTopics(r)).toEqual([]);
  });

  it('acceptanceRate is 0 when attempts=0', () => {
    for (const row of summarizeDtmTopicRepairAttempts([])) {
      expect(row.acceptanceRate).toBe(0);
    }
  });

  it('readonly events parameter', () => {
    const evs: ReadonlyArray<any> = Object.freeze([
      { topic: 'faith', outcome: 'accepted' },
    ]);
    const r = summarizeDtmTopicRepairAttempts(evs);
    expect(r.find((x) => x.topic === 'faith')!.attempts).toBe(1);
  });
});
