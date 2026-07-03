import { describe, it, expect } from 'vitest';
import { _internals } from '../compat';
import { hashUid } from '../forget';

const { chronoOverlap, behaviorSim, compose } = _internals;

describe('compat scoring', () => {
  it('chronoOverlap: identical = 1, mixed = 0.6, disjoint = 0.2', () => {
    expect(chronoOverlap('morning', 'morning')).toBe(1);
    expect(chronoOverlap('mixed', 'evening')).toBe(0.6);
    expect(chronoOverlap('morning', 'evening')).toBe(0.2);
    expect(chronoOverlap(null, 'morning')).toBe(0.5);
  });

  it('behaviorSim: two calm readers score high; one ragey scores lower', () => {
    const calmA = { uidHash: 'a', chronotype: null, attentionProfile: 'reader', rageClickRate: 0.01, deadClickRate: 0.02 };
    const calmB = { uidHash: 'b', chronotype: null, attentionProfile: 'reader', rageClickRate: 0.02, deadClickRate: 0.01 };
    const ragey = { uidHash: 'c', chronotype: null, attentionProfile: 'scanner', rageClickRate: 0.4, deadClickRate: 0.1 };
    const high = behaviorSim(calmA, calmB);
    const low = behaviorSim(calmA, ragey);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThanOrEqual(0.8);
    expect(low).toBeLessThan(high);
  });

  it('compose: weighted sum, rounded to 3 decimals', () => {
    const s = compose(1, 1, 1);
    expect(s).toBeGreaterThan(0.99);
    expect(s).toBeLessThanOrEqual(1.0);
    const zero = compose(0, 0, 0);
    expect(zero).toBe(0);
  });
});

describe('hashUid', () => {
  it('returns 22-char base64url for non-empty input', () => {
    const h = hashUid('user_abc');
    expect(h).toHaveLength(22);
    expect(h).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('returns empty for empty input', () => {
    expect(hashUid('')).toBe('');
  });
  it('is deterministic for same secret', () => {
    expect(hashUid('x')).toBe(hashUid('x'));
  });
});
