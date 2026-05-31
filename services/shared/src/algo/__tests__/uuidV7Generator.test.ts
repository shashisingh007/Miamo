import { describe, it, expect } from 'vitest';
import {
  UuidV7Generator,
  isUuidV7,
  extractUuidV7Timestamp,
} from '../uuidV7Generator';

describe('UuidV7Generator', () => {
  it('generates valid v7 string', () => {
    const g = new UuidV7Generator();
    const id = g.next();
    expect(isUuidV7(id)).toBe(true);
  });

  it('returns 36-char dashed format', () => {
    const id = new UuidV7Generator().next();
    expect(id.length).toBe(36);
    expect(id[8]).toBe('-');
    expect(id[13]).toBe('-');
    expect(id[18]).toBe('-');
    expect(id[23]).toBe('-');
  });

  it('version nibble is 7', () => {
    const id = new UuidV7Generator().next();
    expect(id[14]).toBe('7');
  });

  it('variant nibble is 8/9/a/b', () => {
    const id = new UuidV7Generator().next();
    expect('89ab').toContain(id[19]);
  });

  it('isUuidV7 false on bad string', () => {
    expect(isUuidV7('not-a-uuid')).toBe(false);
    expect(isUuidV7('00000000-0000-4000-8000-000000000000')).toBe(false);
  });

  it('isUuidV7 false on non-string', () => {
    expect(isUuidV7(123 as any)).toBe(false);
  });

  it('extracts timestamp', () => {
    const fixed = 1_700_000_000_000;
    const g = new UuidV7Generator({ now: () => fixed });
    const id = g.next();
    expect(extractUuidV7Timestamp(id)).toBe(fixed);
  });

  it('extractUuidV7Timestamp rejects non-v7', () => {
    expect(() => extractUuidV7Timestamp('xxxxxxxx-xxxx-1xxx-xxxx-xxxxxxxxxxxx')).toThrow();
  });

  it('monotonic within same millisecond', () => {
    let t = 1000;
    const g = new UuidV7Generator({ now: () => t });
    const ids: string[] = [];
    for (let i = 0; i < 50; i++) ids.push(g.next());
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i] > ids[i - 1]).toBe(true);
    }
  });

  it('monotonic across millisecond bumps', () => {
    let t = 1000;
    const g = new UuidV7Generator({ now: () => t });
    const a = g.next();
    t = 2000;
    const b = g.next();
    expect(b > a).toBe(true);
  });

  it('different timestamps yield different prefixes', () => {
    const a = new UuidV7Generator({ now: () => 100 }).next();
    const b = new UuidV7Generator({ now: () => 200 }).next();
    expect(a.slice(0, 12)).not.toBe(b.slice(0, 12));
  });

  it('nextBytes returns 16-byte Uint8Array', () => {
    const g = new UuidV7Generator();
    const b = g.nextBytes();
    expect(b).toBeInstanceOf(Uint8Array);
    expect(b.length).toBe(16);
  });

  it('rejects bad clock value', () => {
    const g = new UuidV7Generator({ now: () => NaN });
    expect(() => g.next()).toThrow();
  });

  it('rejects negative clock value', () => {
    const g = new UuidV7Generator({ now: () => -1 });
    expect(() => g.next()).toThrow();
  });

  it('deterministic with fixed random + now', () => {
    let seed = 1;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const g1 = new UuidV7Generator({ now: () => 5000, random: rng });
    const id1 = g1.next();
    seed = 1;
    const rng2 = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const g2 = new UuidV7Generator({ now: () => 5000, random: rng2 });
    const id2 = g2.next();
    expect(id1).toBe(id2);
  });

  it('many sequential ids all valid v7', () => {
    const g = new UuidV7Generator();
    for (let i = 0; i < 50; i++) {
      expect(isUuidV7(g.next())).toBe(true);
    }
  });

  it('timestamp extraction round-trips', () => {
    for (const t of [0, 1, 1000, 1_700_000_000_000]) {
      const g = new UuidV7Generator({ now: () => t });
      expect(extractUuidV7Timestamp(g.next())).toBe(t);
    }
  });

  it('uppercased uuid still validates', () => {
    const id = new UuidV7Generator().next();
    expect(isUuidV7(id.toUpperCase())).toBe(true);
  });

  it('monotonic counter preserves version on bump', () => {
    let t = 1000;
    const g = new UuidV7Generator({ now: () => t });
    g.next();
    const second = g.next();
    expect(second[14]).toBe('7');
    expect('89ab').toContain(second[19]);
  });

  it('returned bytes are independent copies', () => {
    const g = new UuidV7Generator();
    const a = g.nextBytes();
    a[0] = 0xff;
    const b = g.nextBytes();
    // b should not be polluted from a's mutation
    expect(b[0]).not.toBe(0xff);
  });

  it('64+ bumps within same ms remain distinct', () => {
    let t = 9999;
    const g = new UuidV7Generator({ now: () => t });
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(g.next());
    expect(seen.size).toBe(100);
  });
});
