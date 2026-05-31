import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicAttunementWindow,
  obliviousAttunementDtmTopics,
} from '../dtmTopicAttunementWindow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const S = 1000;

describe('dtmTopicAttunementWindow', () => {
  it('canonical order', () => {
    expect(summarizeDtmTopicAttunementWindow([]).map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty => untested', () => {
    for (const r of summarizeDtmTopicAttunementWindow([])) expect(r.band).toBe('untested');
  });

  it('all toward within 1min => tuned', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'communication', kind: 'bid', at: 0 },
      { topic: 'communication', kind: 'turn-toward', at: 10 * S },
      { topic: 'communication', kind: 'bid', at: 100 * S },
      { topic: 'communication', kind: 'turn-toward', at: 110 * S },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('tuned');
  });

  it('all turn-away => oblivious', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'finance', kind: 'bid', at: 0 },
      { topic: 'finance', kind: 'turn-away', at: 10 * S },
    ]);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('oblivious');
  });

  it('all turn-against => oblivious', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'conflict', kind: 'bid', at: 0 },
      { topic: 'conflict', kind: 'turn-against', at: 10 * S },
    ]);
    expect(r.find((x) => x.topic === 'conflict')!.band).toBe('oblivious');
  });

  it('attentive band', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'family', kind: 'bid', at: 0 },
      { topic: 'family', kind: 'turn-toward', at: 10 * S },
      { topic: 'family', kind: 'bid', at: 100 * S },
      { topic: 'family', kind: 'turn-toward', at: 110 * S },
      { topic: 'family', kind: 'bid', at: 200 * S },
      { topic: 'family', kind: 'turn-away', at: 210 * S },
    ]);
    expect(r.find((x) => x.topic === 'family')!.band).toBe('attentive');
  });

  it('sluggish band', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'health', kind: 'bid', at: 0 },
      { topic: 'health', kind: 'turn-toward', at: 10 * S },
      { topic: 'health', kind: 'bid', at: 100 * S },
      { topic: 'health', kind: 'turn-away', at: 110 * S },
      { topic: 'health', kind: 'bid', at: 200 * S },
    ]);
    expect(r.find((x) => x.topic === 'health')!.band).toBe('sluggish');
  });

  it('response after window counts as ignored', () => {
    const r = summarizeDtmTopicAttunementWindow(
      [
        { topic: 'growth', kind: 'bid', at: 0 },
        { topic: 'growth', kind: 'turn-toward', at: 1e9 },
      ],
      { windowMs: 60 * S }
    );
    expect(r.find((x) => x.topic === 'growth')!.responded).toBe(0);
    expect(r.find((x) => x.topic === 'growth')!.ignored).toBe(1);
  });

  it('counts bids', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'social', kind: 'bid', at: 0 },
      { topic: 'social', kind: 'bid', at: 100 * S },
      { topic: 'social', kind: 'bid', at: 200 * S },
    ]);
    expect(r.find((x) => x.topic === 'social')!.bids).toBe(3);
  });

  it('median latency null when no toward', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'autonomy', kind: 'bid', at: 0 },
    ]);
    expect(r.find((x) => x.topic === 'autonomy')!.medianLatencyMs).toBeNull();
  });

  it('median latency exact', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'leisure', kind: 'bid', at: 0 },
      { topic: 'leisure', kind: 'turn-toward', at: 5 * S },
      { topic: 'leisure', kind: 'bid', at: 100 * S },
      { topic: 'leisure', kind: 'turn-toward', at: 115 * S },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.medianLatencyMs).toBe(10 * S);
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'nope', kind: 'bid', at: 0 },
    ]);
    for (const row of r) expect(row.bids).toBe(0);
  });

  it('ignores invalid kind', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'values', kind: 'wat' as any, at: 0 },
    ]);
    expect(r.find((x) => x.topic === 'values')!.bids).toBe(0);
  });

  it('rejects bad windowMs', () => {
    expect(() => summarizeDtmTopicAttunementWindow([], { windowMs: 0 })).toThrow();
    expect(() => summarizeDtmTopicAttunementWindow([], { windowMs: -1 })).toThrow();
  });

  it('obliviousAttunementDtmTopics filter', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'parenting', kind: 'bid', at: 0 },
      { topic: 'parenting', kind: 'turn-away', at: 10 * S },
      { topic: 'faith', kind: 'bid', at: 0 },
      { topic: 'faith', kind: 'turn-toward', at: 10 * S },
    ]);
    const oblivious = obliviousAttunementDtmTopics(r);
    expect(oblivious).toContain('parenting');
    expect(oblivious).not.toContain('faith');
  });

  it('all 16 topics work', () => {
    const evs: any[] = [];
    for (const t of DTM_TOPIC_KEYS) {
      evs.push({ topic: t, kind: 'bid', at: 0 });
      evs.push({ topic: t, kind: 'turn-toward', at: 5 * S });
    }
    for (const r of summarizeDtmTopicAttunementWindow(evs)) expect(r.band).toBe('tuned');
  });

  it('slow but high response rate => attentive (not tuned)', () => {
    const r = summarizeDtmTopicAttunementWindow([
      { topic: 'intimacy', kind: 'bid', at: 0 },
      { topic: 'intimacy', kind: 'turn-toward', at: 120 * S },
      { topic: 'intimacy', kind: 'bid', at: 300 * S },
      { topic: 'intimacy', kind: 'turn-toward', at: 420 * S },
    ], { windowMs: 5 * 60 * S });
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('attentive');
  });
});
