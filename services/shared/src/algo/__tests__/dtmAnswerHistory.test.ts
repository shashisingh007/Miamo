import { describe, it, expect } from 'vitest';
import {
  createAnswerHistory,
  appendAnswer,
  recentByTopic,
  lastAnsweredAt,
  pruneOlderThan,
} from '../dtmAnswerHistory';

describe('dtmAnswerHistory', () => {
  it('starts empty with bounded capacity', () => {
    const h = createAnswerHistory(5);
    expect(h.entries).toEqual([]);
    expect(h.maxEntries).toBe(5);
  });

  it('appends newest-first', () => {
    let h = createAnswerHistory();
    h = appendAnswer(h, { topicKey: 'values', value: 0.5, atMs: 100 });
    h = appendAnswer(h, { topicKey: 'family', value: -0.3, atMs: 200 });
    expect(h.entries[0].topicKey).toBe('family');
    expect(h.entries[1].topicKey).toBe('values');
  });

  it('clamps value into [-1,1]', () => {
    let h = createAnswerHistory();
    h = appendAnswer(h, { topicKey: 'values', value: 5, atMs: 1 });
    h = appendAnswer(h, { topicKey: 'values', value: -9, atMs: 2 });
    expect(h.entries[0].value).toBe(-1);
    expect(h.entries[1].value).toBe(1);
  });

  it('drops invalid entries silently', () => {
    let h = createAnswerHistory();
    h = appendAnswer(h, { topicKey: 'bogus' as any, value: 0.5, atMs: 1 });
    h = appendAnswer(h, { topicKey: 'values', value: NaN, atMs: 1 });
    h = appendAnswer(h, { topicKey: 'values', value: 0.5, atMs: Infinity });
    expect(h.entries).toHaveLength(0);
  });

  it('enforces maxEntries cap', () => {
    let h = createAnswerHistory(3);
    for (let i = 0; i < 10; i++) h = appendAnswer(h, { topicKey: 'values', value: 0.1 * i, atMs: i });
    expect(h.entries).toHaveLength(3);
    expect(h.entries[0].atMs).toBe(9);
  });

  it('recentByTopic filters and limits', () => {
    let h = createAnswerHistory();
    for (let i = 0; i < 5; i++) h = appendAnswer(h, { topicKey: 'values', value: 0, atMs: i });
    for (let i = 0; i < 5; i++) h = appendAnswer(h, { topicKey: 'family', value: 0, atMs: 100 + i });
    expect(recentByTopic(h, 'values', 3)).toHaveLength(3);
    expect(recentByTopic(h, 'family', 100)).toHaveLength(5);
  });

  it('lastAnsweredAt returns the most-recently-appended ts per topic', () => {
    let h = createAnswerHistory();
    h = appendAnswer(h, { topicKey: 'values', value: 0, atMs: 100 });
    h = appendAnswer(h, { topicKey: 'family', value: 0, atMs: 200 });
    h = appendAnswer(h, { topicKey: 'values', value: 0, atMs: 300 });
    const m = lastAnsweredAt(h);
    expect(m.values).toBe(300);
    expect(m.family).toBe(200);
  });

  it('pruneOlderThan drops stale', () => {
    let h = createAnswerHistory();
    for (let i = 0; i < 5; i++) h = appendAnswer(h, { topicKey: 'values', value: 0, atMs: i * 100 });
    const p = pruneOlderThan(h, 200);
    expect(p.entries.every((e) => e.atMs >= 200)).toBe(true);
  });

  it('immutability \u2014 original history unchanged', () => {
    const h = createAnswerHistory();
    const h2 = appendAnswer(h, { topicKey: 'values', value: 0, atMs: 1 });
    expect(h.entries).toHaveLength(0);
    expect(h2.entries).toHaveLength(1);
  });

  it('maxEntries floor is 1', () => {
    const h = createAnswerHistory(0);
    expect(h.maxEntries).toBe(1);
  });
});
