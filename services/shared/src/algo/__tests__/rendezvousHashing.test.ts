import { describe, it, expect } from 'vitest';
import { RendezvousHashing } from '../rendezvousHashing';

describe('RendezvousHashing', () => {
  it('empty returns undefined', () => {
    const r = new RendezvousHashing();
    expect(r.pick('any')).toBeUndefined();
  });

  it('rejects empty/non-string node', () => {
    const r = new RendezvousHashing();
    expect(() => r.addNode('')).toThrow(TypeError);
    expect(() => r.addNode(123 as any)).toThrow(TypeError);
  });

  it('rejects non-string key', () => {
    const r = new RendezvousHashing();
    r.addNode('a');
    expect(() => r.pick(42 as any)).toThrow(TypeError);
  });

  it('single node always picked', () => {
    const r = new RendezvousHashing();
    r.addNode('only');
    expect(r.pick('k1')).toBe('only');
    expect(r.pick('k2')).toBe('only');
  });

  it('deterministic for same key', () => {
    const r = new RendezvousHashing();
    ['a', 'b', 'c', 'd'].forEach((n) => r.addNode(n));
    const first = r.pick('hello');
    for (let i = 0; i < 10; i += 1) expect(r.pick('hello')).toBe(first);
  });

  it('returns one of registered nodes', () => {
    const r = new RendezvousHashing();
    const nodes = ['a', 'b', 'c'];
    nodes.forEach((n) => r.addNode(n));
    for (const k of ['x', 'y', 'z', 'foo', 'bar']) {
      expect(nodes).toContain(r.pick(k));
    }
  });

  it('distributes across nodes', () => {
    const r = new RendezvousHashing();
    const nodes = ['n1', 'n2', 'n3', 'n4'];
    nodes.forEach((n) => r.addNode(n));
    const counts = new Map(nodes.map((n) => [n, 0]));
    for (let i = 0; i < 4000; i += 1) {
      const n = r.pick(`k${i}`)!;
      counts.set(n, counts.get(n)! + 1);
    }
    for (const c of counts.values()) {
      expect(c).toBeGreaterThan(200);
      expect(c).toBeLessThan(2200);
    }
  });

  it('minimal disruption on removal', () => {
    const r = new RendezvousHashing();
    ['a', 'b', 'c', 'd'].forEach((n) => r.addNode(n));
    const before = new Map<string, string>();
    for (let i = 0; i < 500; i += 1) {
      const k = `k${i}`;
      before.set(k, r.pick(k)!);
    }
    r.removeNode('a');
    let moved = 0;
    for (const [k, v] of before) {
      if (r.pick(k) !== v && v !== 'a') moved += 1;
    }
    expect(moved).toBe(0);
  });

  it('pickN returns top-n distinct ordered nodes', () => {
    const r = new RendezvousHashing();
    ['a', 'b', 'c', 'd'].forEach((n) => r.addNode(n));
    const top = r.pickN('hello', 3);
    expect(top).toHaveLength(3);
    expect(new Set(top).size).toBe(3);
  });

  it('pickN clamps to nodes.length', () => {
    const r = new RendezvousHashing();
    ['a', 'b'].forEach((n) => r.addNode(n));
    expect(r.pickN('k', 10)).toHaveLength(2);
  });

  it('pickN rejects bad n', () => {
    const r = new RendezvousHashing();
    r.addNode('a');
    expect(() => r.pickN('k', -1)).toThrow(RangeError);
    expect(() => r.pickN('k', 1.5)).toThrow(RangeError);
  });

  it('pickN n=0 returns empty', () => {
    const r = new RendezvousHashing();
    r.addNode('a');
    expect(r.pickN('k', 0)).toEqual([]);
  });

  it('first of pickN equals pick', () => {
    const r = new RendezvousHashing();
    ['a', 'b', 'c'].forEach((n) => r.addNode(n));
    expect(r.pickN('xyz', 1)[0]).toBe(r.pick('xyz'));
  });

  it('removeNode returns boolean', () => {
    const r = new RendezvousHashing();
    r.addNode('a');
    expect(r.removeNode('a')).toBe(true);
    expect(r.removeNode('a')).toBe(false);
  });

  it('size tracks nodes', () => {
    const r = new RendezvousHashing();
    expect(r.size()).toBe(0);
    r.addNode('a');
    r.addNode('b');
    expect(r.size()).toBe(2);
    r.removeNode('a');
    expect(r.size()).toBe(1);
  });

  it('custom hash respected', () => {
    const r = new RendezvousHashing({ hash: (s) => s.length });
    ['a', 'bb'].forEach((n) => r.addNode(n));
    expect(['a', 'bb']).toContain(r.pick('zzz'));
  });
});
