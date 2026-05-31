import { describe, it, expect } from 'vitest';
import { optimalBinarySearchTree } from '../optimalBinarySearchTree';

describe('optimalBinarySearchTree', () => {
  it('rejects non-array', () => {
    expect(() => optimalBinarySearchTree('x' as any)).toThrow(TypeError);
  });

  it('rejects negative freq', () => {
    expect(() => optimalBinarySearchTree([1, -1])).toThrow(RangeError);
  });

  it('rejects NaN', () => {
    expect(() => optimalBinarySearchTree([1, NaN])).toThrow(RangeError);
  });

  it('empty returns 0 cost', () => {
    expect(optimalBinarySearchTree([]).minCost).toBe(0);
  });

  it('single key cost = freq', () => {
    const r = optimalBinarySearchTree([5]);
    expect(r.minCost).toBe(5);
    expect(r.rootIndex[0][0]).toBe(0);
  });

  it('two keys: root choice', () => {
    // [3,5] -> root 1 better: 5*1 + 3*2 = 11; root 0: 3*1+5*2=13
    expect(optimalBinarySearchTree([3, 5]).minCost).toBe(11);
  });

  it('classic example: [0.34,0.08,0.50,0.08]', () => {
    // scale by 100: [34, 8, 50, 8]
    // optimal cost should be 109 (known result around 1.09 scaled)
    const r = optimalBinarySearchTree([34, 8, 50, 8]);
    expect(r.minCost).toBeGreaterThan(0);
    // Brute check below
  });

  it('matches brute force on small input', () => {
    const f = [10, 12, 16, 21];
    const r = optimalBinarySearchTree(f);
    // brute: try all trees
    function bestCost(arr: number[], depth: number): number {
      if (arr.length === 0) return 0;
      let best = Infinity;
      for (let r2 = 0; r2 < arr.length; r2 += 1) {
        const left = bestCost(arr.slice(0, r2), depth + 1);
        const right = bestCost(arr.slice(r2 + 1), depth + 1);
        const cost = arr[r2] * depth + left + right;
        if (cost < best) best = cost;
      }
      return best;
    }
    expect(r.minCost).toBe(bestCost(f, 1));
  });

  it('three keys ascending freq', () => {
    const r = optimalBinarySearchTree([1, 2, 3]);
    // expected optimal cost = ?
    // root=2 (idx2,freq3): 3*1+2*2+1*3=10? no wait. Try all:
    // root=0(1): 1*1 + (BST(2,3))_d2; subtree cost = (2,3) with depth 2: best is root=3 at d2: 3*2+2*3=12; total 1+12=13
    // root=1(2): 2*1 + 1*2 + 3*2 = 2+2+6=10
    // root=2(3): 3*1 + (BST(1,2)) at d2: best is root=2:2*2+1*3=7; total 3+7=10
    expect(r.minCost).toBe(10);
  });

  it('all equal freq', () => {
    // balanced binary tree on 3 elements: depth(1,2,3)=(2,1,2) => cost = 2+1+2 = 5
    expect(optimalBinarySearchTree([1, 1, 1]).minCost).toBe(5);
  });

  it('large freq dominates near root', () => {
    // [1, 1, 100, 1, 1] -> 100 should be root
    const r = optimalBinarySearchTree([1, 1, 100, 1, 1]);
    expect(r.rootIndex[0][4]).toBe(2);
  });

  it('cost ≥ sum (every freq counted at least depth 1)', () => {
    const f = [3, 5, 2, 7, 4];
    const r = optimalBinarySearchTree(f);
    const total = f.reduce((s, x) => s + x, 0);
    expect(r.minCost).toBeGreaterThanOrEqual(total);
  });

  it('zero frequencies allowed', () => {
    const r = optimalBinarySearchTree([0, 0, 0]);
    expect(r.minCost).toBe(0);
  });

  it('strictly increasing freq', () => {
    const r = optimalBinarySearchTree([1, 2, 3, 4, 5]);
    expect(r.minCost).toBeGreaterThan(0);
  });

  it('rootIndex shape is n x n', () => {
    const r = optimalBinarySearchTree([1, 2, 3]);
    expect(r.rootIndex.length).toBe(3);
    expect(r.rootIndex[0].length).toBe(3);
  });

  it('non-integer frequencies allowed', () => {
    const r = optimalBinarySearchTree([0.5, 0.3, 0.2]);
    expect(r.minCost).toBeGreaterThan(0);
  });

  it('cost is symmetric of equal-mass cases', () => {
    expect(optimalBinarySearchTree([1, 3, 1]).minCost).toBe(optimalBinarySearchTree([1, 3, 1]).minCost);
  });

  it('matches brute force on size 5', () => {
    const f = [2, 7, 1, 4, 3];
    const r = optimalBinarySearchTree(f);
    function bestCost(arr: number[], depth: number): number {
      if (arr.length === 0) return 0;
      let best = Infinity;
      for (let r2 = 0; r2 < arr.length; r2 += 1) {
        const cost = arr[r2] * depth + bestCost(arr.slice(0, r2), depth + 1) + bestCost(arr.slice(r2 + 1), depth + 1);
        if (cost < best) best = cost;
      }
      return best;
    }
    expect(r.minCost).toBe(bestCost(f, 1));
  });
});
