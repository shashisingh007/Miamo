import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicNovelty, rankNovelDtmTopics } from '../dtmTopicNoveltyScore';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

const DAY = 24 * 60 * 60 * 1000;

describe('dtmTopicNoveltyScore', () => {
  it('canonical order', () => {
    const r = summarizeDtmTopicNovelty([], 0);
    expect(r.map((x) => x.topic)).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('empty input => all unseen + novelty 1', () => {
    const r = summarizeDtmTopicNovelty([], 1000);
    for (const row of r) {
      expect(row.band).toBe('unseen');
      expect(row.novelty).toBe(1);
      expect(row.ageMs).toBe(Infinity);
    }
  });

  it('throws on bad thresholds', () => {
    expect(() => summarizeDtmTopicNovelty([], 0, { recentMs: 0 })).toThrow();
    expect(() => summarizeDtmTopicNovelty([], 0, { staleMs: 1, recentMs: 2 })).toThrow();
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicNovelty([{ topic: 'nope', ts: 0 }], 100);
    expect(r.find((x) => x.topic === 'finance')!.band).toBe('unseen');
  });

  it('recently touched 3+ times => fresh', () => {
    const now = 100 * DAY;
    const evs = [];
    for (let i = 0; i < 5; i++) evs.push({ topic: 'values', ts: now - i * DAY });
    const r = summarizeDtmTopicNovelty(evs, now).find((x) => x.topic === 'values')!;
    expect(r.band).toBe('fresh');
    expect(r.novelty).toBeCloseTo(0.05);
  });

  it('recently touched 1-2 times => familiar', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty(
      [{ topic: 'family', ts: now - 2 * DAY }],
      now
    ).find((x) => x.topic === 'family')!;
    expect(r.band).toBe('familiar');
    expect(r.novelty).toBeGreaterThan(0.5);
  });

  it('stale topic (> staleMs) => novel band, novelty=1', () => {
    const now = 365 * DAY;
    const r = summarizeDtmTopicNovelty(
      [{ topic: 'leisure', ts: now - 200 * DAY }],
      now
    ).find((x) => x.topic === 'leisure')!;
    expect(r.band).toBe('novel');
    expect(r.novelty).toBe(1);
  });

  it('between recent and stale => ramping novelty', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty(
      [{ topic: 'health', ts: now - 30 * DAY }],
      now,
      { recentMs: 14 * DAY, staleMs: 90 * DAY }
    ).find((x) => x.topic === 'health')!;
    expect(r.novelty).toBeGreaterThan(0);
    expect(r.novelty).toBeLessThan(1);
  });

  it('ageMs correctly computed', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty(
      [{ topic: 'growth', ts: now - 10 * DAY }],
      now
    ).find((x) => x.topic === 'growth')!;
    expect(r.ageMs).toBe(10 * DAY);
  });

  it('uses most recent ts for age', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty(
      [
        { topic: 'finance', ts: now - 60 * DAY },
        { topic: 'finance', ts: now - 1 * DAY },
      ],
      now
    ).find((x) => x.topic === 'finance')!;
    expect(r.ageMs).toBe(1 * DAY);
  });

  it('totalTouches counts every event', () => {
    const now = 100 * DAY;
    const evs = [
      { topic: 'intimacy', ts: now - 1 },
      { topic: 'intimacy', ts: now - 2 },
      { topic: 'intimacy', ts: now - 3 },
    ];
    const r = summarizeDtmTopicNovelty(evs, now).find((x) => x.topic === 'intimacy')!;
    expect(r.totalTouches).toBe(3);
    expect(r.recentTouches).toBe(3);
  });

  it('recentTouches only counts within recentMs', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty(
      [
        { topic: 'social', ts: now - 1 * DAY }, // recent
        { topic: 'social', ts: now - 60 * DAY }, // not recent
      ],
      now
    ).find((x) => x.topic === 'social')!;
    expect(r.totalTouches).toBe(2);
    expect(r.recentTouches).toBe(1);
  });

  it('future events still counted (ts > now)', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty([{ topic: 'parenting', ts: now + 1000 }], now).find(
      (x) => x.topic === 'parenting'
    )!;
    expect(r.totalTouches).toBe(1);
    expect(r.ageMs).toBe(0); // clamped to 0
  });

  it('rankNovelDtmTopics sorts by novelty desc, tie-break alpha', () => {
    const now = 100 * DAY;
    const rows = summarizeDtmTopicNovelty(
      [
        { topic: 'values', ts: now - 1 * DAY },
        { topic: 'values', ts: now - 2 * DAY },
        { topic: 'values', ts: now - 3 * DAY },
      ],
      now
    );
    const ranked = rankNovelDtmTopics(rows);
    // values is fresh (novelty 0.05) — should be last; everything else is unseen (novelty 1)
    expect(ranked[ranked.length - 1]).toBe('values');
  });

  it('honors custom recentMs/staleMs', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty(
      [{ topic: 'autonomy', ts: now - 5 * DAY }],
      now,
      { recentMs: 1 * DAY, staleMs: 10 * DAY }
    ).find((x) => x.topic === 'autonomy')!;
    // outside recent (5d > 1d), within stale (5d < 10d) => ramping
    expect(r.novelty).toBeGreaterThan(0);
    expect(r.novelty).toBeLessThan(1);
  });

  it('novelty bounded [0,1]', () => {
    const now = 100 * DAY;
    const r = summarizeDtmTopicNovelty(
      [
        { topic: 'values', ts: now - 1 },
        { topic: 'family', ts: now - 60 * DAY },
        { topic: 'finance', ts: now - 365 * DAY },
      ],
      now
    );
    for (const row of r) {
      expect(row.novelty).toBeGreaterThanOrEqual(0);
      expect(row.novelty).toBeLessThanOrEqual(1);
    }
  });
});
