import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicResolutionRate,
  unresolvedDtmTopics,
} from '../dtmTopicResolutionRate';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicResolutionRate', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicResolutionRate([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => all untested', () => {
    for (const r of summarizeDtmTopicResolutionRate([])) expect(r.band).toBe('untested');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicResolutionRate([
      { topic: 'nope', threadId: 't1', status: 'resolved', ts: 0 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores invalid status', () => {
    const r = summarizeDtmTopicResolutionRate([
      { topic: 'values', threadId: 't1', status: 'bogus' as any, ts: 0 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('ignores empty threadId', () => {
    const r = summarizeDtmTopicResolutionRate([
      { topic: 'values', threadId: '', status: 'resolved', ts: 0 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('untested');
  });

  it('latest status per thread wins', () => {
    const r = summarizeDtmTopicResolutionRate([
      { topic: 'family', threadId: 't1', status: 'open', ts: 0 },
      { topic: 'family', threadId: 't1', status: 'resolved', ts: 10 },
    ]);
    const f = r.find((x) => x.topic === 'family')!;
    expect(f.threads).toBe(1);
    expect(f.resolved).toBe(1);
    expect(f.open).toBe(0);
  });

  it('all resolved => closed', () => {
    const r = summarizeDtmTopicResolutionRate([
      { topic: 'finance', threadId: 't1', status: 'resolved', ts: 0 },
      { topic: 'finance', threadId: 't2', status: 'resolved', ts: 1 },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('closed');
  });

  it('70% resolved => resolved band', () => {
    const events: any[] = [];
    for (let i = 0; i < 7; i++) events.push({ topic: 'growth', threadId: 't' + i, status: 'resolved', ts: i });
    for (let i = 7; i < 10; i++) events.push({ topic: 'growth', threadId: 't' + i, status: 'open', ts: i });
    expect(summarizeDtmTopicResolutionRate(events).find((x) => x.topic === 'growth')!.band).toBe('resolved');
  });

  it('30% resolved => partial', () => {
    const events: any[] = [];
    for (let i = 0; i < 3; i++) events.push({ topic: 'conflict', threadId: 't' + i, status: 'resolved', ts: i });
    for (let i = 3; i < 10; i++) events.push({ topic: 'conflict', threadId: 't' + i, status: 'open', ts: i });
    expect(summarizeDtmTopicResolutionRate(events).find((x) => x.topic === 'conflict')!.band).toBe('partial');
  });

  it('low resolution => open band', () => {
    const events: any[] = [];
    for (let i = 0; i < 10; i++) events.push({ topic: 'intimacy', threadId: 't' + i, status: 'open', ts: i });
    expect(summarizeDtmTopicResolutionRate(events).find((x) => x.topic === 'intimacy')!.band).toBe('open');
  });

  it('tabled counted but not resolved', () => {
    const r = summarizeDtmTopicResolutionRate([
      { topic: 'leisure', threadId: 't1', status: 'tabled', ts: 0 },
      { topic: 'leisure', threadId: 't2', status: 'resolved', ts: 0 },
    ]);
    const l = r.find((x) => x.topic === 'leisure')!;
    expect(l.threads).toBe(2);
    expect(l.resolved).toBe(1);
    expect(l.tabled).toBe(1);
    expect(l.resolutionRate).toBe(0.5);
    expect(l.band).toBe('partial');
  });

  it('exact boundary 0.95 => closed', () => {
    const events: any[] = [];
    for (let i = 0; i < 19; i++) events.push({ topic: 'social', threadId: 't' + i, status: 'resolved', ts: i });
    events.push({ topic: 'social', threadId: 't19', status: 'open', ts: 19 });
    expect(summarizeDtmTopicResolutionRate(events).find((x) => x.topic === 'social')!.band).toBe('closed');
  });

  it('exact boundary 0.6 => resolved', () => {
    const events: any[] = [];
    for (let i = 0; i < 6; i++) events.push({ topic: 'faith', threadId: 't' + i, status: 'resolved', ts: i });
    for (let i = 6; i < 10; i++) events.push({ topic: 'faith', threadId: 't' + i, status: 'open', ts: i });
    expect(summarizeDtmTopicResolutionRate(events).find((x) => x.topic === 'faith')!.band).toBe('resolved');
  });

  it('thread counted once even with many events', () => {
    const events: any[] = [];
    for (let i = 0; i < 20; i++) events.push({ topic: 'autonomy', threadId: 't1', status: i === 19 ? 'resolved' : 'open', ts: i });
    expect(summarizeDtmTopicResolutionRate(events).find((x) => x.topic === 'autonomy')!.threads).toBe(1);
  });

  it('unresolvedDtmTopics returns open + partial', () => {
    const evs: any[] = [];
    for (let i = 0; i < 10; i++) evs.push({ topic: 'conflict', threadId: 't' + i, status: 'open', ts: i });
    for (let i = 0; i < 3; i++) evs.push({ topic: 'growth', threadId: 'g' + i, status: 'resolved', ts: i });
    for (let i = 3; i < 10; i++) evs.push({ topic: 'growth', threadId: 'g' + i, status: 'open', ts: i });
    for (let i = 0; i < 10; i++) evs.push({ topic: 'family', threadId: 'f' + i, status: 'resolved', ts: i });
    const rows = summarizeDtmTopicResolutionRate(evs);
    const un = unresolvedDtmTopics(rows);
    expect(un).toContain('conflict');
    expect(un).toContain('growth');
    expect(un).not.toContain('family');
  });

  it('events with non-finite ts ignored', () => {
    const r = summarizeDtmTopicResolutionRate([
      { topic: 'health', threadId: 't1', status: 'resolved', ts: NaN },
    ]);
    expect(r.find((x) => x.topic === 'health')!.threads).toBe(0);
  });

  it('all 16 topics independent', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) evs.push({ topic: t, threadId: 'x', status: 'resolved', ts: 0 });
    for (const r of summarizeDtmTopicResolutionRate(evs)) expect(r.band).toBe('closed');
  });
});
