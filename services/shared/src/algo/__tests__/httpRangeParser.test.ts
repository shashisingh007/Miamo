import { describe, it, expect } from 'vitest';
import {
  parseRangeHeader,
  contentRangeHeader,
  unsatisfiableContentRange,
} from '../httpRangeParser';

describe('httpRangeParser', () => {
  it('returns null for absent header', () => {
    expect(parseRangeHeader(undefined, 100)).toBeNull();
    expect(parseRangeHeader(null, 100)).toBeNull();
  });

  it('rejects non-bytes unit', () => {
    expect(parseRangeHeader('items=0-10', 100)).toBeNull();
  });

  it('parses simple range', () => {
    const r = parseRangeHeader('bytes=0-99', 1000);
    expect(r?.ranges).toEqual([{ start: 0, end: 99, length: 100 }]);
    expect(r?.satisfiable).toBe(true);
  });

  it('open-ended range fills to end', () => {
    const r = parseRangeHeader('bytes=500-', 1000);
    expect(r?.ranges).toEqual([{ start: 500, end: 999, length: 500 }]);
  });

  it('suffix range returns last N bytes', () => {
    const r = parseRangeHeader('bytes=-200', 1000);
    expect(r?.ranges).toEqual([{ start: 800, end: 999, length: 200 }]);
  });

  it('suffix larger than file clamps to whole file', () => {
    const r = parseRangeHeader('bytes=-9999', 1000);
    expect(r?.ranges[0]).toEqual({ start: 0, end: 999, length: 1000 });
  });

  it('clamps end past EOF', () => {
    const r = parseRangeHeader('bytes=0-9999', 100);
    expect(r?.ranges).toEqual([{ start: 0, end: 99, length: 100 }]);
  });

  it('marks unsatisfiable when start past EOF', () => {
    const r = parseRangeHeader('bytes=500-600', 100);
    expect(r?.satisfiable).toBe(false);
    expect(r?.ranges).toEqual([]);
  });

  it('parses multipart ranges', () => {
    const r = parseRangeHeader('bytes=0-9,90-99', 100);
    expect(r?.ranges).toHaveLength(2);
    expect(r?.ranges[0].length).toBe(10);
    expect(r?.ranges[1].length).toBe(10);
  });

  it('drops invalid specs but keeps valid ones', () => {
    const r = parseRangeHeader('bytes=0-9,abc,50-59', 100);
    expect(r?.ranges).toHaveLength(2);
  });

  it('rejects start > end', () => {
    const r = parseRangeHeader('bytes=50-10', 100);
    expect(r?.satisfiable).toBe(false);
  });

  it('rejects empty list', () => {
    expect(parseRangeHeader('bytes=', 100)).toBeNull();
  });

  it('rejects negative start', () => {
    const r = parseRangeHeader('bytes=-0', 100);
    // suffix with 0 bytes is invalid
    expect(r?.satisfiable).toBe(false);
  });

  it('formats content-range header', () => {
    expect(contentRangeHeader({ start: 0, end: 99, length: 100 }, 1000)).toBe(
      'bytes 0-99/1000'
    );
  });

  it('formats unsatisfiable content-range', () => {
    expect(unsatisfiableContentRange(500)).toBe('bytes */500');
  });

  it('rejects negative total size', () => {
    expect(parseRangeHeader('bytes=0-10', -1)).toBeNull();
  });
});
