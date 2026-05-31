import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicRecoveryLatency,
  unresolvedDtmTopics,
} from '../dtmTopicRecoveryLatency';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('dtmTopicRecoveryLatency', () => {
  it('canonical order, length 16', () => {
    const r = summarizeDtmTopicRecoveryLatency([]);
    expect(r.map((x) => x.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty input => all untested', () => {
    const r = summarizeDtmTopicRecoveryLatency([]);
    for (const row of r) {
      expect(row.band).toBe('untested');
      expect(row.avgLatencyMs).toBe(0);
      expect(row.ruptures).toBe(0);
    }
  });

  it('throws on bad band thresholds', () => {
    expect(() =>
      summarizeDtmTopicRecoveryLatency([], { quickMs: HOUR, slowMs: HOUR })
    ).toThrow();
    expect(() =>
      summarizeDtmTopicRecoveryLatency([], { quickMs: DAY, slowMs: HOUR })
    ).toThrow();
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'nope', kind: 'rupture', ts: 0 },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('untested');
  });

  it('rupture without repair => unresolved', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'finance', kind: 'rupture', ts: 0 },
    ]).find((x) => x.topic === 'finance')!;
    expect(r.ruptures).toBe(1);
    expect(r.unrepaired).toBe(1);
    expect(r.band).toBe('unresolved');
  });

  it('rupture then repair within quickMs => quick', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'values', kind: 'rupture', ts: 0 },
      { topic: 'values', kind: 'repair', ts: 5 * 60 * 1000 },
    ]).find((x) => x.topic === 'values')!;
    expect(r.repairs).toBe(1);
    expect(r.unrepaired).toBe(0);
    expect(r.avgLatencyMs).toBe(5 * 60 * 1000);
    expect(r.band).toBe('quick');
  });

  it('repair after quickMs => slow', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'family', kind: 'rupture', ts: 0 },
      { topic: 'family', kind: 'repair', ts: 6 * HOUR },
    ]).find((x) => x.topic === 'family')!;
    expect(r.band).toBe('slow');
  });

  it('repair after slowMs => stuck', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'growth', kind: 'rupture', ts: 0 },
      { topic: 'growth', kind: 'repair', ts: 3 * DAY },
    ]).find((x) => x.topic === 'growth')!;
    expect(r.band).toBe('stuck');
  });

  it('multiple rupture/repair sequences averaged', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'intimacy', kind: 'rupture', ts: 0 },
      { topic: 'intimacy', kind: 'repair', ts: 10 * 60 * 1000 },
      { topic: 'intimacy', kind: 'rupture', ts: 1_000_000 },
      { topic: 'intimacy', kind: 'repair', ts: 1_000_000 + 20 * 60 * 1000 },
    ]).find((x) => x.topic === 'intimacy')!;
    expect(r.avgLatencyMs).toBe(15 * 60 * 1000);
    expect(r.band).toBe('quick');
  });

  it('repair without prior rupture is ignored as pair', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'health', kind: 'repair', ts: 0 },
    ]).find((x) => x.topic === 'health')!;
    expect(r.ruptures).toBe(0);
    expect(r.repairs).toBe(1);
    expect(r.band).toBe('untested');
  });

  it('back-to-back ruptures mark previous as unrepaired', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'finance', kind: 'rupture', ts: 0 },
      { topic: 'finance', kind: 'rupture', ts: 1_000 },
      { topic: 'finance', kind: 'repair', ts: 2_000 },
    ]).find((x) => x.topic === 'finance')!;
    expect(r.ruptures).toBe(2);
    expect(r.unrepaired).toBe(1);
    // unrepaired == latencies.length (both 1) => stuck
    expect(r.band).toBe('stuck');
  });

  it('events sorted by ts internally', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'leisure', kind: 'repair', ts: 5_000 },
      { topic: 'leisure', kind: 'rupture', ts: 0 },
    ]).find((x) => x.topic === 'leisure')!;
    expect(r.avgLatencyMs).toBe(5_000);
  });

  it('unresolvedDtmTopics returns stuck + unresolved', () => {
    const rows = summarizeDtmTopicRecoveryLatency([
      { topic: 'finance', kind: 'rupture', ts: 0 },
      { topic: 'finance', kind: 'repair', ts: 3 * DAY },
      { topic: 'health', kind: 'rupture', ts: 0 },
    ]);
    const u = unresolvedDtmTopics(rows);
    expect(u).toContain('finance');
    expect(u).toContain('health');
    expect(u).not.toContain('values');
  });

  it('quick events excluded from unresolvedDtmTopics', () => {
    const rows = summarizeDtmTopicRecoveryLatency([
      { topic: 'parenting', kind: 'rupture', ts: 0 },
      { topic: 'parenting', kind: 'repair', ts: 60_000 },
    ]);
    expect(unresolvedDtmTopics(rows)).not.toContain('parenting');
  });

  it('avgLatencyMs is zero when no completed pairs', () => {
    const r = summarizeDtmTopicRecoveryLatency([
      { topic: 'faith', kind: 'rupture', ts: 0 },
      { topic: 'faith', kind: 'rupture', ts: 1 },
    ]).find((x) => x.topic === 'faith')!;
    expect(r.avgLatencyMs).toBe(0);
    expect(r.band).toBe('unresolved');
  });

  it('custom thresholds respected', () => {
    const r = summarizeDtmTopicRecoveryLatency(
      [
        { topic: 'social', kind: 'rupture', ts: 0 },
        { topic: 'social', kind: 'repair', ts: 100 },
      ],
      { quickMs: 50, slowMs: 500 }
    ).find((x) => x.topic === 'social')!;
    expect(r.band).toBe('slow');
  });
});
