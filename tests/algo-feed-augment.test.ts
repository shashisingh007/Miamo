/**
 * Mirrors the Phase F /api/v1/feed v4 wire-up: with chronological source order
 * a post by an author with stronger forYou fit should bubble up.
 */
import { describe, it, expect } from 'vitest';
import { rerankFeed } from '../services/shared/src/algo/feedAugment';

describe('feedAugment ordering (Phase F)', () => {
  const items = [
    { id: 'p1', sourceScore: 1.00, forYouScore: 20, itemAgeSec: 60 },        // top, weak author
    { id: 'p2', sourceScore: 0.80, forYouScore: 95, itemAgeSec: 300 },       // mid, strong author
    { id: 'p3', sourceScore: 0.50, forYouScore: 50, itemAgeSec: 3 * 3600 },  // mid, mid
  ];

  it('strong forYou author can outrank a slightly newer weak author', () => {
    const scored = items
      .map((it) => ({ ...it, v4: rerankFeed(it) }))
      .sort((a, b) => b.v4 - a.v4);
    // p2 should land at or above p1 because forYou weight (.30) > recency edge between 60s vs 300s
    const p1Rank = scored.findIndex((s) => s.id === 'p1');
    const p2Rank = scored.findIndex((s) => s.id === 'p2');
    expect(p2Rank).toBeLessThanOrEqual(p1Rank);
  });

  it('produces deterministic scores in 0..100 range', () => {
    for (const it of items) {
      const a = rerankFeed(it);
      const b = rerankFeed(it);
      expect(a).toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(100);
    }
  });
});
