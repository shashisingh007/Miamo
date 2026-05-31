import { describe, it, expect } from 'vitest';
import { cipollaSqrt } from '../cipollaSqrt';

describe('cipollaSqrt', () => {
  it('rejects p < 2', () => {
    expect(() => cipollaSqrt(1, 1)).toThrow();
  });

  it('rejects composite p', () => {
    expect(() => cipollaSqrt(1, 9)).toThrow();
  });

  it('p=2 trivial', () => {
    const r = cipollaSqrt(1, 2)!;
    expect(r.root).toBe(1n);
  });

  it('n=0 => root 0', () => {
    const r = cipollaSqrt(0, 13)!;
    expect(r.root).toBe(0n);
  });

  it('non-residue returns null', () => {
    // 3 is non-residue mod 7
    expect(cipollaSqrt(3, 7)).toBeNull();
  });

  it('p ≡ 3 mod 4 path: sqrt(2) mod 7', () => {
    // 2 is QR mod 7, roots are 3 and 4
    const r = cipollaSqrt(2, 7)!;
    expect((r.root * r.root) % 7n).toBe(2n);
    expect((r.other * r.other) % 7n).toBe(2n);
    expect(r.root + r.other).toBe(7n);
  });

  it('p ≡ 1 mod 4 path: sqrt(2) mod 17', () => {
    const r = cipollaSqrt(2, 17)!;
    expect((r.root * r.root) % 17n).toBe(2n);
  });

  it('p ≡ 1 mod 4: sqrt(8) mod 41', () => {
    const r = cipollaSqrt(8, 41)!;
    expect((r.root * r.root) % 41n).toBe(8n);
  });

  it('handles all QRs mod 13', () => {
    // 13 ≡ 1 mod 4
    for (const a of [1, 3, 4, 9, 10, 12]) {
      const r = cipollaSqrt(a, 13)!;
      expect((r.root * r.root) % 13n).toBe(BigInt(a));
    }
  });

  it('two roots sum to p', () => {
    const r = cipollaSqrt(5, 29)!;
    expect((r.root + r.other) % 29n).toBe(0n);
  });

  it('larger prime p=101 ≡ 1 mod 4', () => {
    const r = cipollaSqrt(36, 101)!;
    expect((r.root * r.root) % 101n).toBe(36n);
  });

  it('bigint inputs', () => {
    const r = cipollaSqrt(10n, 13n)!;
    expect((r.root * r.root) % 13n).toBe(10n);
  });
});
