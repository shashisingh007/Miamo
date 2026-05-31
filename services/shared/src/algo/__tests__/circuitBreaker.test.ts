import { describe, it, expect } from 'vitest';
import {
  initialBreaker, allow, onSuccess, onFailure,
} from '../circuitBreaker';

const NOW = 1_700_000_000_000;

describe('circuitBreaker — closed state', () => {
  it('starts closed with 0 failures', () => {
    expect(initialBreaker()).toEqual({ state: 'closed', consecutiveFailures: 0, openedAtMs: null });
  });
  it('allows when closed', () => {
    const r = allow(initialBreaker(), NOW);
    expect(r.allowed).toBe(true);
  });
  it('increments failures without opening below threshold', () => {
    let s = initialBreaker();
    for (let i = 0; i < 4; i++) s = onFailure(s, NOW);
    expect(s.state).toBe('closed');
    expect(s.consecutiveFailures).toBe(4);
  });
  it('opens at the threshold (default 5)', () => {
    let s = initialBreaker();
    for (let i = 0; i < 5; i++) s = onFailure(s, NOW);
    expect(s.state).toBe('open');
    expect(s.openedAtMs).toBe(NOW);
  });
  it('success resets the counter', () => {
    let s = initialBreaker();
    s = onFailure(s, NOW);
    s = onSuccess(s);
    expect(s.consecutiveFailures).toBe(0);
    expect(s.state).toBe('closed');
  });
});

describe('circuitBreaker — open state', () => {
  it('short-circuits within the cooldown window', () => {
    const open = { state: 'open' as const, consecutiveFailures: 5, openedAtMs: NOW };
    const r = allow(open, NOW + 1000);
    expect(r.allowed).toBe(false);
    expect(r.next.state).toBe('open');
  });
  it('transitions to half-open after cooldown elapses', () => {
    const open = { state: 'open' as const, consecutiveFailures: 5, openedAtMs: NOW };
    const r = allow(open, NOW + 60_000);
    expect(r.allowed).toBe(true);
    expect(r.next.state).toBe('half-open');
  });
});

describe('circuitBreaker — half-open state', () => {
  it('allows a probe call', () => {
    const ho = { state: 'half-open' as const, consecutiveFailures: 5, openedAtMs: NOW };
    const r = allow(ho, NOW + 60_000);
    expect(r.allowed).toBe(true);
  });
  it('probe success → closed', () => {
    const ho = { state: 'half-open' as const, consecutiveFailures: 5, openedAtMs: NOW };
    const s = onSuccess(ho);
    expect(s.state).toBe('closed');
    expect(s.consecutiveFailures).toBe(0);
  });
  it('probe failure → open with refreshed openedAtMs', () => {
    const ho = { state: 'half-open' as const, consecutiveFailures: 5, openedAtMs: NOW };
    const s = onFailure(ho, NOW + 60_000);
    expect(s.state).toBe('open');
    expect(s.openedAtMs).toBe(NOW + 60_000);
  });
});

describe('circuitBreaker — custom options', () => {
  it('honours a lower failureThreshold', () => {
    let s = initialBreaker();
    s = onFailure(s, NOW, { failureThreshold: 2 });
    s = onFailure(s, NOW, { failureThreshold: 2 });
    expect(s.state).toBe('open');
  });
  it('honours a longer cooldownMs', () => {
    const open = { state: 'open' as const, consecutiveFailures: 5, openedAtMs: NOW };
    const r = allow(open, NOW + 60_000, { cooldownMs: 120_000 });
    expect(r.allowed).toBe(false);
  });
});
