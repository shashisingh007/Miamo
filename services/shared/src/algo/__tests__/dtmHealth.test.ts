import { describe, it, expect } from 'vitest';
import '../dtmV6'; // ensure dtmV6 is registered
import { dtmHealthCheck } from '../dtmHealth';

describe('dtmHealthCheck', () => {
  it('reports healthy when invariants hold', () => {
    const r = dtmHealthCheck();
    expect(r.healthy).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('returns the canonical issue shape', () => {
    const r = dtmHealthCheck();
    expect(Array.isArray(r.issues)).toBe(true);
    for (const i of r.issues) {
      expect(typeof i.code).toBe('string');
      expect(typeof i.detail).toBe('string');
    }
  });
});
