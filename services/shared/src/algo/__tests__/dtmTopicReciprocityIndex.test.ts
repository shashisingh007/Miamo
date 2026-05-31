import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReciprocity, oneSidedDtmTopics } from '../dtmTopicReciprocityIndex';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('dtmTopicReciprocityIndex', () => {
  it('returns one row per canonical topic in order', () => {
    const rows = summarizeDtmTopicReciprocity([]);
    expect(rows.map((r) => r.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty events => zeros and one-sided band', () => {
    const rows = summarizeDtmTopicReciprocity([]);
    for (const r of rows) {
      expect(r.selfInitiates + r.partnerInitiates + r.selfResponds + r.partnerResponds).toBe(0);
      expect(r.reciprocity).toBe(0);
      expect(r.initiationBalance).toBe(0);
      expect(r.band).toBe('one-sided');
    }
  });

  it('ignores unknown topics', () => {
    const rows = summarizeDtmTopicReciprocity([
      { topic: 'nope', speaker: 'self', kind: 'initiate', ts: 0 },
    ]);
    const finance = rows.find((r) => r.topic === 'finance')!;
    expect(finance.selfInitiates).toBe(0);
  });

  it('only self initiates => initiationBalance=+1, one-sided', () => {
    const rows = summarizeDtmTopicReciprocity([
      { topic: 'finance', speaker: 'self', kind: 'initiate', ts: 0 },
      { topic: 'finance', speaker: 'self', kind: 'initiate', ts: 1 },
      { topic: 'finance', speaker: 'self', kind: 'initiate', ts: 2 },
    ]);
    const r = rows.find((x) => x.topic === 'finance')!;
    expect(r.initiationBalance).toBe(1);
    expect(r.band).toBe('one-sided');
  });

  it('only partner initiates => initiationBalance=-1, one-sided', () => {
    const rows = summarizeDtmTopicReciprocity([
      { topic: 'values', speaker: 'partner', kind: 'initiate', ts: 0 },
      { topic: 'values', speaker: 'partner', kind: 'initiate', ts: 1 },
    ]);
    const r = rows.find((x) => x.topic === 'values')!;
    expect(r.initiationBalance).toBe(-1);
    expect(r.band).toBe('one-sided');
  });

  it('perfect alternation initiate+respond => mutual', () => {
    const evs = [];
    for (let i = 0; i < 5; i++) {
      evs.push({ topic: 'intimacy' as const, speaker: 'self' as const, kind: 'initiate' as const, ts: i });
      evs.push({ topic: 'intimacy' as const, speaker: 'partner' as const, kind: 'respond' as const, ts: i });
      evs.push({ topic: 'intimacy' as const, speaker: 'partner' as const, kind: 'initiate' as const, ts: i });
      evs.push({ topic: 'intimacy' as const, speaker: 'self' as const, kind: 'respond' as const, ts: i });
    }
    const r = summarizeDtmTopicReciprocity(evs).find((x) => x.topic === 'intimacy')!;
    expect(r.reciprocity).toBe(1);
    expect(r.initiationBalance).toBe(0);
    expect(r.band).toBe('mutual');
  });

  it('mostly self-initiates with some partner responses => lopsided/balanced range', () => {
    const evs: any[] = [];
    for (let i = 0; i < 6; i++) evs.push({ topic: 'growth', speaker: 'self', kind: 'initiate', ts: i });
    for (let i = 0; i < 4; i++) evs.push({ topic: 'growth', speaker: 'partner', kind: 'respond', ts: i });
    for (let i = 0; i < 2; i++) evs.push({ topic: 'growth', speaker: 'partner', kind: 'initiate', ts: i });
    const r = summarizeDtmTopicReciprocity(evs).find((x) => x.topic === 'growth')!;
    expect(r.initiationBalance).toBeGreaterThan(0);
    expect(['lopsided', 'balanced']).toContain(r.band);
  });

  it('reciprocity capped at 1', () => {
    const evs: any[] = [
      { topic: 'leisure', speaker: 'self', kind: 'initiate', ts: 0 },
      { topic: 'leisure', speaker: 'partner', kind: 'respond', ts: 0 },
    ];
    const r = summarizeDtmTopicReciprocity(evs).find((x) => x.topic === 'leisure')!;
    expect(r.reciprocity).toBeLessThanOrEqual(1);
    expect(r.reciprocity).toBeGreaterThan(0);
  });

  it('balanced initiations but no responses => non-mutual', () => {
    const evs: any[] = [
      { topic: 'family', speaker: 'self', kind: 'initiate', ts: 0 },
      { topic: 'family', speaker: 'partner', kind: 'initiate', ts: 1 },
    ];
    const r = summarizeDtmTopicReciprocity(evs).find((x) => x.topic === 'family')!;
    expect(r.initiationBalance).toBe(0);
    expect(r.reciprocity).toBe(0);
    expect(r.band).not.toBe('mutual');
  });

  it('oneSidedDtmTopics filters topics with any events whose band=one-sided', () => {
    const rows = summarizeDtmTopicReciprocity([
      { topic: 'finance', speaker: 'self', kind: 'initiate', ts: 0 },
      { topic: 'finance', speaker: 'self', kind: 'initiate', ts: 1 },
    ]);
    expect(oneSidedDtmTopics(rows)).toContain('finance');
    // empty topics excluded
    expect(oneSidedDtmTopics(rows)).not.toContain('values');
  });

  it('initiationBalance bounded in [-1,+1]', () => {
    const evs: any[] = [];
    for (let i = 0; i < 10; i++) evs.push({ topic: 'health', speaker: 'self', kind: 'initiate', ts: i });
    for (let i = 0; i < 3; i++) evs.push({ topic: 'health', speaker: 'partner', kind: 'initiate', ts: i });
    const r = summarizeDtmTopicReciprocity(evs).find((x) => x.topic === 'health')!;
    expect(r.initiationBalance).toBeGreaterThanOrEqual(-1);
    expect(r.initiationBalance).toBeLessThanOrEqual(1);
  });

  it('respond-only on one side does not produce mutual', () => {
    const evs: any[] = [
      { topic: 'faith', speaker: 'self', kind: 'respond', ts: 0 },
      { topic: 'faith', speaker: 'self', kind: 'respond', ts: 1 },
    ];
    const r = summarizeDtmTopicReciprocity(evs).find((x) => x.topic === 'faith')!;
    expect(r.band).not.toBe('mutual');
  });

  it('purely responsive both sides => zero reciprocity (no pairing)', () => {
    const evs: any[] = [
      { topic: 'social', speaker: 'self', kind: 'respond', ts: 0 },
      { topic: 'social', speaker: 'partner', kind: 'respond', ts: 1 },
    ];
    const r = summarizeDtmTopicReciprocity(evs).find((x) => x.topic === 'social')!;
    expect(r.reciprocity).toBe(0);
  });
});
