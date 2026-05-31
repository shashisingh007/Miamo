import { describe, it, expect } from 'vitest';
import { estimatePasswordEntropy } from '../passwordEntropy';

describe('passwordEntropy', () => {
  it('empty -> 0 bits very_weak', () => {
    const r = estimatePasswordEntropy('');
    expect(r.bits).toBe(0);
    expect(r.tier).toBe('very_weak');
  });

  it('non-string -> 0 bits', () => {
    expect(estimatePasswordEntropy(undefined as any).bits).toBe(0);
  });

  it('short lowercase weak', () => {
    const r = estimatePasswordEntropy('abcde');
    expect(r.tier).toBe('very_weak');
  });

  it('mixed-case + digits + symbols boosts charset bits', () => {
    const lower = estimatePasswordEntropy('abcdefghij');
    const mixed = estimatePasswordEntropy('Abcd1!ghIJ');
    expect(mixed.charsetBits).toBeGreaterThan(lower.charsetBits);
  });

  it('long random-ish gets strong/very_strong', () => {
    const r = estimatePasswordEntropy('J7$kQpL!2nXa9Y');
    expect(['strong', 'very_strong']).toContain(r.tier);
  });

  it('repeated chars penalised', () => {
    const a = estimatePasswordEntropy('AbcDef12!@');
    const b = estimatePasswordEntropy('aaaaaaaaaa');
    expect(a.bits).toBeGreaterThan(b.bits);
  });

  it('sequential runs penalised vs scrambled', () => {
    const seq = estimatePasswordEntropy('abcdefghij');
    const scr = estimatePasswordEntropy('ahcbedgfji');
    expect(scr.bits).toBeGreaterThanOrEqual(seq.bits);
  });

  it('charsetBits monotonic in classes', () => {
    expect(estimatePasswordEntropy('abc').charsetBits).toBeLessThan(estimatePasswordEntropy('Abc').charsetBits);
    expect(estimatePasswordEntropy('Abc').charsetBits).toBeLessThan(estimatePasswordEntropy('Abc1').charsetBits);
    expect(estimatePasswordEntropy('Abc1').charsetBits).toBeLessThan(estimatePasswordEntropy('Abc1!').charsetBits);
  });

  it('tier boundaries map sensibly', () => {
    expect(estimatePasswordEntropy('a').tier).toBe('very_weak');
    expect(['fair', 'strong']).toContain(estimatePasswordEntropy('Tr0ub4dor&3xy').tier);
  });

  it('very_strong achievable', () => {
    const r = estimatePasswordEntropy('Zx9@kMq2!nVp7$LwR3#tYbE4&Hf');
    expect(r.tier).toBe('very_strong');
  });
});
