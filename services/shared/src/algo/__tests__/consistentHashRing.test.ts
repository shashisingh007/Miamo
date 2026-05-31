import { describe, it, expect } from 'vitest';
import { ConsistentHashRing } from '../consistentHashRing';

describe('ConsistentHashRing', () => {
  it('throws on non-positive virtuals', () => {
    expect(() => new ConsistentHashRing(0)).toThrow(RangeError);
    expect(() => new ConsistentHashRing(-1)).toThrow(RangeError);
  });

  it('throws on non-integer virtuals', () => {
    expect(() => new ConsistentHashRing(1.5)).toThrow(RangeError);
  });

  it('empty ring returns undefined', () => {
    const r = new ConsistentHashRing(8);
    expect(r.getNode('anything')).toBeUndefined();
    expect(r.nodeCount).toBe(0);
  });

  it('single node always selected', () => {
    const r = new ConsistentHashRing(8);
    r.addNode('A');
    expect(r.getNode('foo')).toBe('A');
    expect(r.getNode('bar')).toBe('A');
    expect(r.nodeCount).toBe(1);
  });

  it('multiple nodes', () => {
    const r = new ConsistentHashRing(64);
    r.addNode('A');
    r.addNode('B');
    r.addNode('C');
    expect(r.nodeCount).toBe(3);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(r.getNode(`k${i}`)!);
    expect(seen.size).toBe(3);
  });

  it('idempotent addNode', () => {
    const r = new ConsistentHashRing(8);
    r.addNode('A');
    r.addNode('A');
    expect(r.nodeCount).toBe(1);
  });

  it('removeNode reroutes', () => {
    const r = new ConsistentHashRing(64);
    r.addNode('A');
    r.addNode('B');
    const before = r.getNode('key-42');
    r.removeNode(before!);
    expect(r.nodeCount).toBe(1);
    const after = r.getNode('key-42');
    expect(after).not.toBe(before);
  });

  it('removeNode returns false for missing', () => {
    const r = new ConsistentHashRing(8);
    expect(r.removeNode('A')).toBe(false);
  });

  it('throws on non-string node', () => {
    const r = new ConsistentHashRing(8);
    expect(() => r.addNode('')).toThrow(TypeError);
    expect(() => r.addNode(null as any)).toThrow(TypeError);
  });

  it('same key always maps to same node', () => {
    const r = new ConsistentHashRing(64);
    ['A', 'B', 'C', 'D'].forEach((n) => r.addNode(n));
    const a = r.getNode('user-123');
    const b = r.getNode('user-123');
    expect(a).toBe(b);
  });

  it('adding new node remaps only fraction of keys', () => {
    const r = new ConsistentHashRing(128);
    ['A', 'B', 'C'].forEach((n) => r.addNode(n));
    const keys = Array.from({ length: 500 }, (_, i) => `key-${i}`);
    const before = keys.map((k) => r.getNode(k));
    r.addNode('D');
    const after = keys.map((k) => r.getNode(k));
    let moved = 0;
    for (let i = 0; i < keys.length; i += 1) if (before[i] !== after[i]) moved += 1;
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(keys.length);
  });

  it('virtualCount grows with nodes', () => {
    const r = new ConsistentHashRing(16);
    r.addNode('A');
    const v1 = r.virtualCount;
    r.addNode('B');
    expect(r.virtualCount).toBeGreaterThan(v1);
  });

  it('custom hash function', () => {
    const r = new ConsistentHashRing(8, (s) => s.length);
    r.addNode('A');
    r.addNode('BB');
    expect(r.getNode('xx')).toBeDefined();
  });

  it('reasonable balance across nodes', () => {
    const r = new ConsistentHashRing(256);
    ['A', 'B', 'C', 'D'].forEach((n) => r.addNode(n));
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i += 1) {
      const n = r.getNode(`k${i}`)!;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    for (const c of counts.values()) {
      expect(c).toBeGreaterThan(200);
      expect(c).toBeLessThan(2200);
    }
  });
});
