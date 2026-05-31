import { describe, it, expect } from 'vitest';
import {
  parseDelimitedTabular,
  parseDelimitedRecords,
} from '../delimitedTabularParser';

describe('delimitedTabularParser', () => {
  it('parses simple CSV', () => {
    expect(parseDelimitedTabular('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with delimiter inside', () => {
    expect(parseDelimitedTabular('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
  });

  it('handles escaped quotes ""', () => {
    expect(parseDelimitedTabular('"he said ""hi"""')).toEqual([['he said "hi"']]);
  });

  it('handles CRLF newlines', () => {
    expect(parseDelimitedTabular('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles CR-only newlines', () => {
    expect(parseDelimitedTabular('a,b\r1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles LF-only', () => {
    expect(parseDelimitedTabular('a\nb\nc')).toEqual([['a'], ['b'], ['c']]);
  });

  it('preserves embedded newlines in quotes', () => {
    expect(parseDelimitedTabular('"line1\nline2",x')).toEqual([['line1\nline2', 'x']]);
  });

  it('TSV via custom delimiter', () => {
    expect(parseDelimitedTabular('a\tb\tc\n1\t2\t3', { delimiter: '\t' })).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('pipe delimiter', () => {
    expect(parseDelimitedTabular('a|b|c', { delimiter: '|' })).toEqual([['a', 'b', 'c']]);
  });

  it('custom quote char', () => {
    expect(parseDelimitedTabular("'a,b',c", { quote: "'" })).toEqual([['a,b', 'c']]);
  });

  it('trim option strips whitespace', () => {
    expect(parseDelimitedTabular(' a , b ', { trim: true })).toEqual([['a', 'b']]);
  });

  it('skipEmptyLines removes blank rows', () => {
    expect(parseDelimitedTabular('a\n\nb', { skipEmptyLines: true })).toEqual([['a'], ['b']]);
  });

  it('does not skip empty rows by default', () => {
    expect(parseDelimitedTabular('a\n\nb')).toEqual([['a'], [''], ['b']]);
  });

  it('empty input returns []', () => {
    expect(parseDelimitedTabular('')).toEqual([]);
  });

  it('throws on unterminated quote', () => {
    expect(() => parseDelimitedTabular('"abc,def')).toThrow();
  });

  it('throws when delimiter equals quote', () => {
    expect(() => parseDelimitedTabular('a', { delimiter: '"', quote: '"' })).toThrow();
  });

  it('throws on multi-char delimiter', () => {
    expect(() => parseDelimitedTabular('a', { delimiter: ',,' })).toThrow();
  });

  it('preserves empty trailing field', () => {
    expect(parseDelimitedTabular('a,b,')).toEqual([['a', 'b', '']]);
  });

  it('preserves empty leading field', () => {
    expect(parseDelimitedTabular(',a,b')).toEqual([['', 'a', 'b']]);
  });

  it('non-string input throws', () => {
    expect(() => parseDelimitedTabular(123 as any)).toThrow();
  });

  it('parseDelimitedRecords pairs header with row', () => {
    expect(parseDelimitedRecords('id,name\n1,alice\n2,bob')).toEqual([
      { id: '1', name: 'alice' },
      { id: '2', name: 'bob' },
    ]);
  });

  it('parseDelimitedRecords fills missing fields with empty string', () => {
    expect(parseDelimitedRecords('a,b,c\n1,2')).toEqual([{ a: '1', b: '2', c: '' }]);
  });

  it('parseDelimitedRecords returns [] on empty', () => {
    expect(parseDelimitedRecords('')).toEqual([]);
  });
});
