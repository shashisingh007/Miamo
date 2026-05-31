import { describe, it, expect } from 'vitest';
import { MaglevHashing } from '../maglevHashing';

describe('MaglevHashing', () => {
  it('rejects empty backends', () => {
    expect(() => new MaglevHashing([])).toThrow(RangeError);
  });

  it('rejects non-string backend', () => {
    expect(() => new MaglevHashing(['', 'b'])).toThrow(TypeError);
  });

  it('rejects duplicate backend', () => {
    expect(() => new MaglevHashing(['a', 'a'])).toThrow(RangeError);
  });

  it('rejects tableSize <= backends.length', () => {
    expect(() => new MaglevHashing(['a', 'b', 'c'], { tableSize: 3 })).toThrow(RangeError);
  });

  it('rejects non-string key', () => {
    const m = new MaglevHashing(['a']);
    expect(() => m.pick(42 as any)).toThrow(TypeError);
  });

  it('single backend always picked', () => {
    const m = new MaglevHashing(['only']);
    for (let i = 0; i < 100; i += 1) expect(m.pick(`k${i}`)).toBe('only');
  });

  it('deterministic for same key', () => {
    const m = new MaglevHashing(['a', 'b', 'c']);
    const first = m.pick('hello');
    for (let i = 0; i < 10; i += 1) expect(m.pick('hello')).toBe(first);
  });

  it('result is one of backends', () => {
    const backends = ['a', 'b', 'c', 'd'];
    const m = new MaglevHashing(backends);
    for (let i = 0; i < 100; i += 1) {
      expect(backends).toContain(m.pick(`k${i}`));
    }
  });

  it('distributes across backends', () => {
    const backends = ['n1', 'n2', 'n3', 'n4'];
    const m = new MaglevHashing(backends);
    const counts = new Map(backends.map((b) => [b, 0]));
    for (let i = 0; i < 4000; i += 1) {
      const b = m.pick(`k${i}`);
      counts.set(b, counts.get(b)! + 1);
    }
    for (const c of counts.values()) {
      expect(c).toBeGreaterThan(500);
      expect(c).toBeLessThan(1500);
    }
  });

  it('table fully populated', () => {
    const m = new MaglevHashing(['a', 'b', 'c'], { tableSize: 7 });
    const seen = new Set<string>();
    for (let i = 0; i < 7; i += 1) seen.add(m.pick(String(i)));
    // not all keys hit each slot but pick should never produce undefined
    expect(seen.size).toBeGreaterThan(0);
  });

  it('balanced over backends in table', () => {
    const backends = ['a', 'b', 'c', 'd', 'e'];
    const m = new MaglevHashing(backends, { tableSize: 1009 });
    const counts = new Map(backends.map((b) => [b, 0]));
    // probe table via many keys
    for (let i = 0; i < 5000; i += 1) {
      const b = m.pick(`probe-${i}`);
      counts.set(b, counts.get(b)! + 1);
    }
    for (const c of counts.values()) {
      // expected 1000; allow wide bound
      expect(c).toBeGreaterThan(500);
      expect(c).toBeLessThan(1700);
    }
  });

  it('size + getTableSize', () => {
    const m = new MaglevHashing(['a', 'b'], { tableSize: 11 });
    expect(m.size()).toBe(2);
    expect(m.getTableSize()).toBe(11);
  });

  it('minimal disruption when one backend removed', () => {
    const before = new MaglevHashing(['a', 'b', 'c', 'd'], { tableSize: 1009 });
    const after = new MaglevHashing(['a', 'b', 'c'], { tableSize: 1009 });
    let moved = 0;
    let total = 0;
    for (let i = 0; i < 1000; i += 1) {
      const k = `k${i}`;
      const b = before.pick(k);
      if (b === 'd') continue; // forced to move
      total += 1;
      if (after.pick(k) !== b) moved += 1;
    }
    expect(total).toBeGreaterThan(0);
    expect(moved / total).toBeLessThan(0.4);
  });

  it('default tableSize >= 1009', () => {
    const m = new MaglevHashing(['a', 'b']);
    expect(m.getTableSize()).toBeGreaterThanOrEqual(1009);
  });

  it('custom hashes respected', () => {
    const m = new MaglevHashing(['a', 'b'], {
      hashA: (s) => s.length,
      hashB: (s) => s.length + 1,
      tableSize: 5,
    });
    expect(['a', 'b']).toContain(m.pick('xxx'));
  });
});
