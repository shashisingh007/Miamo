import { describe, it, expect } from 'vitest';
import { decideJwksRotation, mergeJwksRetainActive } from '../jwksRotationPolicy';

const k = (kid: string, extra: Record<string, unknown> = {}) => ({ kid, alg: 'RS256', ...extra });

describe('jwksRotationPolicy', () => {
  it('no_change when sets equal', () => {
    const d = decideJwksRotation({ current: [k('a'), k('b')], incoming: [k('b'), k('a')] });
    expect(d.rotated).toBe(false);
    if (!d.rotated) expect(d.reason).toBe('no_change');
  });

  it('no_change when incoming empty', () => {
    const d = decideJwksRotation({ current: [k('a')], incoming: [] });
    expect(d.rotated).toBe(false);
  });

  it('rotates when adding new kid', () => {
    const d = decideJwksRotation({ current: [k('a')], incoming: [k('a'), k('b')] });
    expect(d.rotated).toBe(true);
    if (d.rotated) {
      expect(d.added).toEqual(['b']);
      expect(d.removed).toEqual([]);
      expect(d.replaced).toBe(false);
    }
  });

  it('rotates when removing kid', () => {
    const d = decideJwksRotation({ current: [k('a'), k('b')], incoming: [k('a')] });
    expect(d.rotated).toBe(true);
    if (d.rotated) expect(d.removed).toEqual(['b']);
  });

  it('replaced=true when both added and removed', () => {
    const d = decideJwksRotation({ current: [k('a')], incoming: [k('b')] });
    expect(d.rotated && d.replaced).toBe(true);
  });

  it('kid_mismatch_safe when active not in incoming', () => {
    const d = decideJwksRotation({
      current: [k('a'), k('active')],
      incoming: [k('a'), k('b')],
      activeKid: 'active',
    });
    expect(d.rotated).toBe(false);
    if (!d.rotated) expect(d.reason).toBe('kid_mismatch_safe');
  });

  it('rotates safely when active still present', () => {
    const d = decideJwksRotation({
      current: [k('a'), k('active')],
      incoming: [k('active'), k('b')],
      activeKid: 'active',
    });
    expect(d.rotated).toBe(true);
  });

  it('dedupes duplicate kids in inputs', () => {
    const d = decideJwksRotation({ current: [k('a'), k('a')], incoming: [k('a'), k('a')] });
    expect(d.rotated).toBe(false);
  });

  it('ignores entries with missing kid', () => {
    const d = decideJwksRotation({
      current: [k('a')],
      incoming: [{ kid: '' } as any, k('a')],
    });
    expect(d.rotated).toBe(false);
  });

  it('mergeJwksRetainActive keeps active if missing', () => {
    const merged = mergeJwksRetainActive({
      current: [k('active')],
      incoming: [k('b')],
      activeKid: 'active',
    });
    expect(merged.map((x) => x.kid)).toEqual(['active', 'b']);
  });

  it('mergeJwksRetainActive returns incoming if active present', () => {
    const merged = mergeJwksRetainActive({
      current: [k('active')],
      incoming: [k('active'), k('b')],
      activeKid: 'active',
    });
    expect(merged.map((x) => x.kid)).toEqual(['active', 'b']);
  });

  it('mergeJwksRetainActive without activeKid just dedupes incoming', () => {
    const merged = mergeJwksRetainActive({
      current: [],
      incoming: [k('a'), k('a'), k('b')],
    });
    expect(merged.map((x) => x.kid)).toEqual(['a', 'b']);
  });
});
