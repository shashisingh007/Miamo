import { describe, it, expect } from 'vitest';
import { v6HealthCheck } from '../health';

describe('v6HealthCheck', () => {
  it('reports healthy on the shipped configuration', () => {
    const r = v6HealthCheck();
    if (!r.healthy) console.warn('issues:', r.issues);
    expect(r.healthy).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('issues array is always present', () => {
    expect(Array.isArray(v6HealthCheck().issues)).toBe(true);
  });

  it('healthy flag matches issues length', () => {
    const r = v6HealthCheck();
    expect(r.healthy).toBe(r.issues.length === 0);
  });
});
