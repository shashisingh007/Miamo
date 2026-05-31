import { describe, it, expect } from 'vitest';
import { aggregateHealth } from '../healthCheckAggregator';

describe('healthCheckAggregator', () => {
  it('empty -> unknown', () => {
    const r = aggregateHealth([]);
    expect(r.overall).toBe('unknown');
    expect(r.components).toEqual([]);
  });

  it('all up -> up', () => {
    const r = aggregateHealth([
      { name: 'db', state: 'up' },
      { name: 'redis', state: 'up' },
    ]);
    expect(r.overall).toBe('up');
  });

  it('critical down -> overall down', () => {
    const r = aggregateHealth([
      { name: 'db', state: 'down', criticality: 'critical' },
      { name: 'redis', state: 'up' },
    ]);
    expect(r.overall).toBe('down');
    expect(r.downCritical).toEqual(['db']);
  });

  it('optional down -> overall degraded (not down)', () => {
    const r = aggregateHealth([
      { name: 'analytics', state: 'down', criticality: 'optional' },
      { name: 'db', state: 'up' },
    ]);
    expect(r.overall).toBe('degraded');
    expect(r.downOptional).toEqual(['analytics']);
  });

  it('degraded component -> overall degraded', () => {
    const r = aggregateHealth([
      { name: 'db', state: 'up' },
      { name: 'queue', state: 'degraded' },
    ]);
    expect(r.overall).toBe('degraded');
    expect(r.degraded).toEqual(['queue']);
  });

  it('worst-wins across many', () => {
    const r = aggregateHealth([
      { name: 'a', state: 'up' },
      { name: 'b', state: 'degraded' },
      { name: 'c', state: 'down' },
      { name: 'd', state: 'unknown' },
    ]);
    expect(r.overall).toBe('down');
  });

  it('unknown bumps overall above up but below degraded', () => {
    const r = aggregateHealth([
      { name: 'a', state: 'up' },
      { name: 'b', state: 'unknown' },
    ]);
    expect(r.overall).toBe('unknown');
  });

  it('default criticality is critical', () => {
    const r = aggregateHealth([{ name: 'a', state: 'down' }]);
    expect(r.overall).toBe('down');
    expect(r.components[0].criticality).toBe('critical');
  });

  it('multiple critical downs collected', () => {
    const r = aggregateHealth([
      { name: 'db', state: 'down' },
      { name: 'auth', state: 'down' },
      { name: 'redis', state: 'up' },
    ]);
    expect(r.downCritical).toEqual(['db', 'auth']);
  });

  it('mixed optional-down + degraded -> degraded', () => {
    const r = aggregateHealth([
      { name: 'tracking', state: 'down', criticality: 'optional' },
      { name: 'queue', state: 'degraded' },
    ]);
    expect(r.overall).toBe('degraded');
    expect(r.downOptional).toEqual(['tracking']);
    expect(r.degraded).toEqual(['queue']);
  });

  it('critical down beats optional down', () => {
    const r = aggregateHealth([
      { name: 'tracking', state: 'down', criticality: 'optional' },
      { name: 'db', state: 'down', criticality: 'critical' },
    ]);
    expect(r.overall).toBe('down');
  });
});
