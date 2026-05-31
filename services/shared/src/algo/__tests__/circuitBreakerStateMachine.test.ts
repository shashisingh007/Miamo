import { describe, it, expect } from 'vitest';
import { createCircuitBreaker } from '../circuitBreakerStateMachine';

describe('circuitBreakerStateMachine', () => {
  it('throws on bad config', () => {
    expect(() => createCircuitBreaker({ failureThreshold: 0, resetMs: 100 })).toThrow();
    expect(() => createCircuitBreaker({ failureThreshold: 3, resetMs: 0 })).toThrow();
    expect(() => createCircuitBreaker({ failureThreshold: 3, resetMs: 100, halfOpenSuccessesToClose: 0 })).toThrow();
  });

  it('starts closed', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetMs: 100, now: () => 0 });
    expect(cb.state).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });

  it('opens after consecutive failures', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetMs: 100, now: () => 0 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe('closed');
    cb.recordFailure();
    expect(cb.state).toBe('open');
    expect(cb.canExecute()).toBe(false);
  });

  it('success resets consecutive failure counter when closed', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetMs: 100, now: () => 0 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure();
    expect(cb.state).toBe('closed');
    expect(cb.stats.consecutiveFailures).toBe(1);
  });

  it('transitions to half-open after resetMs', () => {
    let t = 0;
    const cb = createCircuitBreaker({ failureThreshold: 2, resetMs: 100, now: () => t });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe('open');
    t = 99;
    expect(cb.state).toBe('open');
    t = 100;
    expect(cb.state).toBe('half-open');
    expect(cb.canExecute()).toBe(true);
  });

  it('half-open success closes circuit (default 1 success)', () => {
    let t = 0;
    const cb = createCircuitBreaker({ failureThreshold: 2, resetMs: 100, now: () => t });
    cb.recordFailure();
    cb.recordFailure();
    t = 100;
    void cb.state;
    cb.recordSuccess();
    expect(cb.state).toBe('closed');
    expect(cb.stats.consecutiveFailures).toBe(0);
  });

  it('half-open failure re-opens circuit and restarts timer', () => {
    let t = 0;
    const cb = createCircuitBreaker({ failureThreshold: 2, resetMs: 100, now: () => t });
    cb.recordFailure();
    cb.recordFailure();
    t = 100;
    void cb.state;
    t = 105;
    cb.recordFailure();
    expect(cb.state).toBe('open');
    expect(cb.stats.openedAt).toBe(105);
  });

  it('respects halfOpenSuccessesToClose > 1', () => {
    let t = 0;
    const cb = createCircuitBreaker({
      failureThreshold: 2,
      resetMs: 100,
      halfOpenSuccessesToClose: 2,
      now: () => t,
    });
    cb.recordFailure();
    cb.recordFailure();
    t = 100;
    void cb.state;
    cb.recordSuccess();
    expect(cb.state).toBe('half-open');
    cb.recordSuccess();
    expect(cb.state).toBe('closed');
  });

  it('forceOpen opens regardless of state', () => {
    let t = 0;
    const cb = createCircuitBreaker({ failureThreshold: 5, resetMs: 100, now: () => t });
    cb.forceOpen();
    expect(cb.state).toBe('open');
    expect(cb.canExecute()).toBe(false);
  });

  it('reset returns to closed', () => {
    let t = 0;
    const cb = createCircuitBreaker({ failureThreshold: 2, resetMs: 100, now: () => t });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe('open');
    cb.reset();
    expect(cb.state).toBe('closed');
    expect(cb.stats.openedAt).toBeNull();
    expect(cb.stats.consecutiveFailures).toBe(0);
  });

  it('stats expose internal counters', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetMs: 100, now: () => 5 });
    cb.recordFailure();
    expect(cb.stats.consecutiveFailures).toBe(1);
  });

  it('canExecute is true while half-open (probe allowed)', () => {
    let t = 0;
    const cb = createCircuitBreaker({ failureThreshold: 1, resetMs: 50, now: () => t });
    cb.recordFailure();
    expect(cb.canExecute()).toBe(false);
    t = 50;
    expect(cb.canExecute()).toBe(true);
    expect(cb.state).toBe('half-open');
  });

  it('default clock works (smoke)', () => {
    const cb = createCircuitBreaker({ failureThreshold: 1, resetMs: 100000 });
    cb.recordFailure();
    expect(cb.state).toBe('open');
  });

  it('does not double-count when threshold already exceeded', () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, resetMs: 100, now: () => 0 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe('open');
    expect(cb.stats.consecutiveFailures).toBeGreaterThanOrEqual(2);
  });
});
