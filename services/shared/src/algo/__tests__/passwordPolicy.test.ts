import { describe, it, expect } from 'vitest';
import { checkPassword } from '../passwordPolicy';

describe('passwordPolicy', () => {
  it('accepts a strong password', () => {
    const r = checkPassword({ password: 'Tr0pic@l-Vines!92' });
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.score).toBe(4);
  });

  it('flags too-short', () => {
    expect(checkPassword({ password: 'Ab1!x' }).issues).toContain('too_short');
  });

  it('flags too-long', () => {
    expect(checkPassword({ password: 'A1!' + 'a'.repeat(200), maxLen: 64 }).issues).toContain('too_long');
  });

  it('flags missing classes', () => {
    const r = checkPassword({ password: 'alllowercase' });
    expect(r.issues).toEqual(expect.arrayContaining(['missing_upper', 'missing_digit', 'missing_symbol']));
  });

  it('flags common password', () => {
    const r = checkPassword({ password: 'P@ssw0rd1234', commonList: ['p@ssw0rd1234'] });
    expect(r.issues).toContain('common');
  });

  it('flags containing personal data', () => {
    const r = checkPassword({ password: 'AlexSmith#2026!', personal: ['alex'] });
    expect(r.issues).toContain('contains_personal');
  });

  it('flags long-run repeats', () => {
    expect(checkPassword({ password: 'Aaaaa1234!Bz' }).issues).toContain('repeats');
  });

  it('flags sequential ascending', () => {
    expect(checkPassword({ password: 'Tropic#abc987X' }).issues).toContain('sequential');
  });

  it('flags sequential descending', () => {
    expect(checkPassword({ password: 'Tropic#321ZyxW' }).issues).toContain('sequential');
  });

  it('ignores personal fragments shorter than 3 chars', () => {
    const r = checkPassword({ password: 'Tr0pic@l-Vines!92', personal: ['a', 'bo'] });
    expect(r.issues).not.toContain('contains_personal');
  });

  it('score degrades with issue count', () => {
    expect(checkPassword({ password: 'short' }).score).toBeLessThan(3);
    expect(checkPassword({ password: 'allloweeerrcaseeee' }).score).toBeLessThanOrEqual(2);
  });

  it('handles non-string input safely', () => {
    const r = checkPassword({ password: undefined as any });
    expect(r.ok).toBe(false);
    expect(r.issues).toContain('too_short');
  });
});
