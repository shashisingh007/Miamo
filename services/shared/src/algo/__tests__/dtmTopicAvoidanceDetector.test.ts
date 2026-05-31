import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAvoidance, avoidedDtmTopics } from '../dtmTopicAvoidanceDetector';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicAvoidanceDetector', () => {
  it('returns canonical row order', () => {
    const rows = summarizeDtmTopicAvoidance([]);
    expect(rows.map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty input => all untested with rate 0', () => {
    const rows = summarizeDtmTopicAvoidance([]);
    for (const r of rows) {
      expect(r.band).toBe('untested');
      expect(r.avoidanceRate).toBe(0);
    }
  });

  it('ignores unknown topic', () => {
    const rows = summarizeDtmTopicAvoidance([
      { topic: 'nope', action: 'introduced', ts: 0 },
    ]);
    expect(rows.find((r) => r.topic === 'finance')!.introductions).toBe(0);
  });

  it('all engaged => open', () => {
    const evs: any[] = [];
    for (let i = 0; i < 5; i++) {
      evs.push({ topic: 'values', action: 'introduced', ts: i });
      evs.push({ topic: 'values', action: 'engaged', ts: i });
    }
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'values')!;
    expect(r.avoidanceRate).toBe(0);
    expect(r.band).toBe('open');
  });

  it('all deflected => heavily-avoided', () => {
    const evs: any[] = [];
    for (let i = 0; i < 4; i++) {
      evs.push({ topic: 'finance', action: 'introduced', ts: i });
      evs.push({ topic: 'finance', action: 'deflected', ts: i });
    }
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'finance')!;
    expect(r.avoidanceRate).toBe(1);
    expect(r.band).toBe('heavily-avoided');
  });

  it('half deflected => avoidant', () => {
    const evs: any[] = [];
    for (let i = 0; i < 4; i++) evs.push({ topic: 'intimacy', action: 'introduced', ts: i });
    for (let i = 0; i < 2; i++) evs.push({ topic: 'intimacy', action: 'deflected', ts: i });
    for (let i = 0; i < 2; i++) evs.push({ topic: 'intimacy', action: 'engaged', ts: i });
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'intimacy')!;
    expect(r.avoidanceRate).toBe(0.5);
    expect(r.band).toBe('avoidant');
  });

  it('one in four deflected => sometimes', () => {
    const evs: any[] = [];
    for (let i = 0; i < 4; i++) evs.push({ topic: 'family', action: 'introduced', ts: i });
    evs.push({ topic: 'family', action: 'deflected', ts: 99 });
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'family')!;
    expect(r.avoidanceRate).toBe(0.25);
    expect(r.band).toBe('sometimes');
  });

  it('avoidanceRate bounded 0..1+ for over-deflection (more deflections than intros) — allowed', () => {
    const evs: any[] = [
      { topic: 'growth', action: 'introduced', ts: 0 },
      { topic: 'growth', action: 'deflected', ts: 1 },
      { topic: 'growth', action: 'deflected', ts: 2 },
    ];
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'growth')!;
    expect(r.avoidanceRate).toBe(2);
    expect(r.band).toBe('heavily-avoided');
  });

  it('introduced-only counts as fully engaged-rate=0 if no deflections', () => {
    const evs: any[] = [
      { topic: 'leisure', action: 'introduced', ts: 0 },
      { topic: 'leisure', action: 'introduced', ts: 1 },
    ];
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'leisure')!;
    expect(r.avoidanceRate).toBe(0);
    expect(r.band).toBe('open');
  });

  it('avoidedDtmTopics excludes untested and open', () => {
    const evs: any[] = [];
    for (let i = 0; i < 4; i++) evs.push({ topic: 'finance', action: 'introduced', ts: i });
    for (let i = 0; i < 4; i++) evs.push({ topic: 'finance', action: 'deflected', ts: i });
    const rows = summarizeDtmTopicAvoidance(evs);
    expect(avoidedDtmTopics(rows)).toContain('finance');
    expect(avoidedDtmTopics(rows)).not.toContain('values');
  });

  it('avoidedDtmTopics excludes "sometimes"', () => {
    const evs: any[] = [];
    for (let i = 0; i < 4; i++) evs.push({ topic: 'health', action: 'introduced', ts: i });
    evs.push({ topic: 'health', action: 'deflected', ts: 99 });
    const rows = summarizeDtmTopicAvoidance(evs);
    expect(avoidedDtmTopics(rows)).not.toContain('health');
  });

  it('deflections without introductions stay untested', () => {
    const evs: any[] = [
      { topic: 'faith', action: 'deflected', ts: 0 },
      { topic: 'faith', action: 'engaged', ts: 1 },
    ];
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'faith')!;
    expect(r.band).toBe('untested');
  });

  it('band ordering: 0.25 boundary => sometimes (not open)', () => {
    const evs: any[] = [];
    for (let i = 0; i < 4; i++) evs.push({ topic: 'social', action: 'introduced', ts: i });
    evs.push({ topic: 'social', action: 'deflected', ts: 99 });
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'social')!;
    expect(r.band).toBe('sometimes');
  });

  it('band ordering: exactly 0.75 => heavily-avoided', () => {
    const evs: any[] = [];
    for (let i = 0; i < 4; i++) evs.push({ topic: 'parenting', action: 'introduced', ts: i });
    for (let i = 0; i < 3; i++) evs.push({ topic: 'parenting', action: 'deflected', ts: i });
    const r = summarizeDtmTopicAvoidance(evs).find((x) => x.topic === 'parenting')!;
    expect(r.avoidanceRate).toBe(0.75);
    expect(r.band).toBe('heavily-avoided');
  });
});
