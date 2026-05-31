import { describe, it, expect } from 'vitest';
import { karatsubaMultiply } from '../karatsubaMultiply';

describe('karatsubaMultiply', () => {
  it('rejects non-string', () => {
    expect(() => karatsubaMultiply(42 as any, '5')).toThrow(TypeError);
  });

  it('rejects non-digits', () => {
    expect(() => karatsubaMultiply('12a', '3')).toThrow(RangeError);
    expect(() => karatsubaMultiply('-5', '3')).toThrow(RangeError);
  });

  it('multiplies small ints', () => {
    expect(karatsubaMultiply('6', '7')).toBe('42');
  });

  it('zero anything is zero', () => {
    expect(karatsubaMultiply('0', '12345')).toBe('0');
    expect(karatsubaMultiply('98765', '0')).toBe('0');
  });

  it('identity', () => {
    expect(karatsubaMultiply('1', '12345')).toBe('12345');
    expect(karatsubaMultiply('12345', '1')).toBe('12345');
  });

  it('strips leading zeros', () => {
    expect(karatsubaMultiply('007', '006')).toBe('42');
  });

  it('big numbers match BigInt', () => {
    const a = '12345678901234567890';
    const b = '98765432109876543210';
    expect(karatsubaMultiply(a, b)).toBe((BigInt(a) * BigInt(b)).toString());
  });

  it('triggers karatsuba path (>=32 digits)', () => {
    const a = '1'.repeat(40);
    const b = '2'.repeat(40);
    expect(karatsubaMultiply(a, b)).toBe((BigInt(a) * BigInt(b)).toString());
  });

  it('asymmetric lengths', () => {
    const a = '9'.repeat(50);
    const b = '7'.repeat(10);
    expect(karatsubaMultiply(a, b)).toBe((BigInt(a) * BigInt(b)).toString());
  });

  it('random products match BigInt', () => {
    for (let t = 0; t < 10; t += 1) {
      const lenA = 30 + Math.floor(Math.random() * 60);
      const lenB = 30 + Math.floor(Math.random() * 60);
      let a = '';
      let b = '';
      for (let i = 0; i < lenA; i += 1) a += String(Math.floor(Math.random() * 10));
      for (let i = 0; i < lenB; i += 1) b += String(Math.floor(Math.random() * 10));
      if (a[0] === '0') a = '1' + a.slice(1);
      if (b[0] === '0') b = '1' + b.slice(1);
      expect(karatsubaMultiply(a, b)).toBe((BigInt(a) * BigInt(b)).toString());
    }
  });

  it('100-digit products', () => {
    const a = '9'.repeat(100);
    const b = '9'.repeat(100);
    expect(karatsubaMultiply(a, b)).toBe((BigInt(a) * BigInt(b)).toString());
  });

  it('commutative', () => {
    const a = '1234567890123456789012345678901234567890';
    const b = '9876543210987654321098765432109876543210';
    expect(karatsubaMultiply(a, b)).toBe(karatsubaMultiply(b, a));
  });

  it('powers of ten', () => {
    expect(karatsubaMultiply('1' + '0'.repeat(40), '1' + '0'.repeat(40))).toBe(
      '1' + '0'.repeat(80),
    );
  });

  it('returns canonical decimal (no leading zeros)', () => {
    const r = karatsubaMultiply('0001', '0002');
    expect(r).toBe('2');
  });
});
