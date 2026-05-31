import { describe, it, expect } from 'vitest';
import { kmeansMiniBatch } from '../kmeansMiniBatch';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('kmeansMiniBatch', () => {
  it('recovers two well-separated clusters', () => {
    const pts: number[][] = [];
    for (let i = 0; i < 50; i++) pts.push([Math.cos(i) * 0.1, Math.sin(i) * 0.1]);
    for (let i = 0; i < 50; i++) pts.push([10 + Math.cos(i) * 0.1, Math.sin(i) * 0.1]);
    const { centroids } = kmeansMiniBatch(pts, {
      k: 2,
      batchSize: 20,
      maxIterations: 60,
      rng: seeded(42),
      initialCentroids: [[0, 0], [10, 0]],
    });
    const sorted = centroids.slice().sort((a, b) => a[0] - b[0]);
    expect(sorted[0][0]).toBeCloseTo(0, 0);
    expect(sorted[1][0]).toBeCloseTo(10, 0);
  });

  it('deterministic for fixed rng', () => {
    const pts = [[0, 0], [1, 0], [0, 1], [5, 5], [5, 6], [6, 5]];
    const a = kmeansMiniBatch(pts, { k: 2, batchSize: 5, maxIterations: 20, rng: seeded(7) });
    const b = kmeansMiniBatch(pts, { k: 2, batchSize: 5, maxIterations: 20, rng: seeded(7) });
    expect(a.centroids).toEqual(b.centroids);
  });

  it('respects initialCentroids', () => {
    const pts = [[0, 0], [1, 0]];
    const { centroids } = kmeansMiniBatch(pts, {
      k: 1,
      batchSize: 1,
      maxIterations: 1,
      rng: () => 0,
      initialCentroids: [[100, 100]],
    });
    // 1 iteration over single point => centroid pulls toward [0,0]
    expect(centroids[0][0]).toBeLessThan(100);
  });

  it('1D works', () => {
    const pts = [[0], [1], [10], [11]];
    const { centroids } = kmeansMiniBatch(pts, {
      k: 2,
      batchSize: 8,
      maxIterations: 40,
      rng: seeded(3),
      initialCentroids: [[0], [11]],
    });
    const sorted = centroids.slice().sort((a, b) => a[0] - b[0]);
    expect(sorted[0][0]).toBeLessThan(5);
    expect(sorted[1][0]).toBeGreaterThan(5);
  });

  it('rejects empty points', () => {
    expect(() => kmeansMiniBatch([], { k: 1, batchSize: 1 })).toThrow();
  });

  it('rejects bad k', () => {
    expect(() => kmeansMiniBatch([[1]], { k: 0, batchSize: 1 })).toThrow();
  });

  it('rejects bad batchSize', () => {
    expect(() => kmeansMiniBatch([[1]], { k: 1, batchSize: 0 })).toThrow();
  });

  it('rejects k > n', () => {
    expect(() => kmeansMiniBatch([[1], [2]], { k: 5, batchSize: 1 })).toThrow();
  });

  it('rejects inconsistent dims', () => {
    expect(() => kmeansMiniBatch([[1, 2], [3]], { k: 1, batchSize: 1 })).toThrow();
  });

  it('rejects non-finite', () => {
    expect(() => kmeansMiniBatch([[NaN]], { k: 1, batchSize: 1 })).toThrow();
  });

  it('rejects initialCentroids length mismatch', () => {
    expect(() =>
      kmeansMiniBatch([[1], [2]], { k: 2, batchSize: 1, initialCentroids: [[0]] }),
    ).toThrow();
  });
});
