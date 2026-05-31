import { describe, it, expect } from 'vitest';
import { parseCursorParams, buildCursorPage } from '../cursorPagination';

const NOW = 1_700_000_000_000;

describe('cursorPagination', () => {
  it('parse defaults: no cursor -> offset 0, default limit 20', () => {
    const d = parseCursorParams({});
    expect(d.offset).toBe(0);
    expect(d.limit).toBe(20);
    expect(d.issuedAtMs).toBeNull();
  });

  it('clamps limit to [1,100]', () => {
    expect(parseCursorParams({ limit: 0 }).limit).toBe(1);
    expect(parseCursorParams({ limit: 999 }).limit).toBe(100);
    expect(parseCursorParams({ limit: -3 }).limit).toBe(1);
  });

  it('limit floor + floor of fractional', () => {
    expect(parseCursorParams({ limit: 7.9 }).limit).toBe(7);
  });

  it('non-finite limit -> default', () => {
    expect(parseCursorParams({ limit: NaN }).limit).toBe(20);
    expect(parseCursorParams({ limit: Infinity }).limit).toBe(20);
  });

  it('invalid cursor string -> offset 0', () => {
    expect(parseCursorParams({ cursor: '@@not-base64@@' }).offset).toBe(0);
  });

  it('round-trip: build -> parse', () => {
    const decoded = parseCursorParams({ limit: 5 });
    const page = buildCursorPage([1, 2, 3, 4, 5, 6], decoded, NOW);
    expect(page.items.length).toBe(5);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).not.toBeNull();
    const parsed = parseCursorParams({ cursor: page.nextCursor!, limit: 5 });
    expect(parsed.offset).toBe(5);
    expect(parsed.issuedAtMs).toBe(NOW);
  });

  it('exact page length -> no nextCursor', () => {
    const decoded = parseCursorParams({ limit: 3 });
    const page = buildCursorPage([1, 2, 3], decoded, NOW);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('empty rows -> no nextCursor', () => {
    const decoded = parseCursorParams({ limit: 5 });
    const page = buildCursorPage([], decoded, NOW);
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('cursor offset advances correctly across pages', () => {
    const d1 = parseCursorParams({ limit: 2 });
    const p1 = buildCursorPage([1, 2, 3], d1, NOW);
    const d2 = parseCursorParams({ cursor: p1.nextCursor!, limit: 2 });
    expect(d2.offset).toBe(2);
    const p2 = buildCursorPage([3, 4, 5], d2, NOW);
    const d3 = parseCursorParams({ cursor: p2.nextCursor!, limit: 2 });
    expect(d3.offset).toBe(4);
  });

  it('rejects cursor with negative offset', () => {
    const bad = Buffer.from(JSON.stringify({ o: -1, t: NOW }), 'utf8').toString('base64url');
    expect(parseCursorParams({ cursor: bad }).offset).toBe(0);
  });

  it('rejects cursor with non-numeric offset', () => {
    const bad = Buffer.from(JSON.stringify({ o: 'abc', t: NOW }), 'utf8').toString('base64url');
    expect(parseCursorParams({ cursor: bad }).offset).toBe(0);
  });

  it('null cursor treated as start', () => {
    expect(parseCursorParams({ cursor: null }).offset).toBe(0);
  });
});
