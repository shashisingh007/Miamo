import { describe, it, expect } from 'vitest';
import { parseCron, nextCronRun } from '../cronExpressionParser';

const at = (iso: string) => Date.parse(iso);

describe('cronExpressionParser', () => {
  it('parses fully-wildcard cron', () => {
    const s = parseCron('* * * * *');
    expect(s.minute.size).toBe(60);
    expect(s.hour.size).toBe(24);
    expect(s.domDowBothWild).toBe(true);
  });

  it('parses specific minute', () => {
    const s = parseCron('5 * * * *');
    expect(s.minute.has(5)).toBe(true);
    expect(s.minute.size).toBe(1);
  });

  it('parses comma list', () => {
    const s = parseCron('0,15,30,45 * * * *');
    expect(s.minute.size).toBe(4);
    expect(s.minute.has(15)).toBe(true);
  });

  it('parses range with step', () => {
    const s = parseCron('0-30/10 * * * *');
    expect([...s.minute].sort((a, b) => a - b)).toEqual([0, 10, 20, 30]);
  });

  it('parses */step shorthand', () => {
    const s = parseCron('*/15 * * * *');
    expect([...s.minute].sort((a, b) => a - b)).toEqual([0, 15, 30, 45]);
  });

  it('treats dow=7 as Sunday', () => {
    const s = parseCron('0 0 * * 7');
    expect(s.dow.has(0)).toBe(true);
  });

  it('throws when wrong field count', () => {
    expect(() => parseCron('* * * *')).toThrow(RangeError);
    expect(() => parseCron('* * * * * *')).toThrow(RangeError);
  });

  it('throws on out-of-range value', () => {
    expect(() => parseCron('60 * * * *')).toThrow(RangeError);
    expect(() => parseCron('* 24 * * *')).toThrow(RangeError);
  });

  it('throws on bad step', () => {
    expect(() => parseCron('*/0 * * * *')).toThrow(RangeError);
  });

  it('nextCronRun every minute → +1min from now (next whole minute)', () => {
    const s = parseCron('* * * * *');
    const from = at('2024-01-01T00:00:30Z');
    const r = nextCronRun(s, from);
    expect(r).toBe(at('2024-01-01T00:01:00Z'));
  });

  it('nextCronRun finds top-of-hour', () => {
    const s = parseCron('0 * * * *');
    const r = nextCronRun(s, at('2024-01-01T12:34:00Z'));
    expect(r).toBe(at('2024-01-01T13:00:00Z'));
  });

  it('nextCronRun finds specific dom + hour', () => {
    const s = parseCron('0 9 15 * *');
    const r = nextCronRun(s, at('2024-01-01T00:00:00Z'));
    expect(r).toBe(at('2024-01-15T09:00:00Z'));
  });

  it('nextCronRun dow + dom uses OR semantics', () => {
    // every Monday OR every 1st
    const s = parseCron('0 0 1 * 1');
    // Jan 1 2024 is Monday so already matches → next run = next day with rule
    // From Jan 2 (Tue), next match = next Mon (Jan 8) or 1st of Feb → Jan 8
    const r = nextCronRun(s, at('2024-01-02T00:00:00Z'));
    expect(r).toBe(at('2024-01-08T00:00:00Z'));
  });

  it('nextCronRun crosses month boundary', () => {
    const s = parseCron('30 14 1 * *');
    const r = nextCronRun(s, at('2024-01-15T00:00:00Z'));
    expect(r).toBe(at('2024-02-01T14:30:00Z'));
  });

  it('nextCronRun respects month filter', () => {
    const s = parseCron('0 0 1 6 *');
    const r = nextCronRun(s, at('2024-01-15T00:00:00Z'));
    expect(r).toBe(at('2024-06-01T00:00:00Z'));
  });

  it('nextCronRun returns null on non-finite from', () => {
    const s = parseCron('* * * * *');
    expect(nextCronRun(s, Number.NaN)).toBeNull();
  });

  it('nextCronRun returns null when no match within 2-year window', () => {
    // Feb 30 never exists
    const s = parseCron('0 0 30 2 *');
    expect(nextCronRun(s, at('2024-01-01T00:00:00Z'))).toBeNull();
  });
});
