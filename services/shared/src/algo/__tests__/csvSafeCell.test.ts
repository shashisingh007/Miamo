import { describe, it, expect } from 'vitest';
import { csvSafeCell, csvSafeRow } from '../csvSafeCell';

describe('csvSafeCell', () => {
  it('passes through plain text', () => {
    expect(csvSafeCell('hello')).toBe('hello');
    expect(csvSafeCell('Alex Smith')).toBe('Alex Smith');
  });

  it('prefixes formula-leading characters', () => {
    expect(csvSafeCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvSafeCell('+1234')).toBe("'+1234");
    expect(csvSafeCell('-cmd')).toBe("'-cmd");
    expect(csvSafeCell('@import')).toBe("'@import");
    expect(csvSafeCell('\tboom')).toBe("'\tboom");
    // \r triggers both prefix (leading dangerous char) AND CSV-quote (newline class)
    expect(csvSafeCell('\rboom')).toBe('"\'\rboom"');
  });

  it('quotes cells containing commas / quotes / newlines', () => {
    expect(csvSafeCell('a,b')).toBe('"a,b"');
    expect(csvSafeCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvSafeCell('line1\nline2')).toBe('"line1\nline2"');
    // \r in the middle: doesn't trigger prefix, only the quote wrap
    expect(csvSafeCell('a\rb')).toBe('"a\rb"');
  });

  it('handles null / undefined as empty', () => {
    expect(csvSafeCell(null)).toBe('');
    expect(csvSafeCell(undefined)).toBe('');
  });

  it('stringifies numbers and booleans', () => {
    expect(csvSafeCell(42)).toBe('42');
    expect(csvSafeCell(true)).toBe('true');
    expect(csvSafeCell(false)).toBe('false');
    expect(csvSafeCell(3.14)).toBe('3.14');
  });

  it('JSON-stringifies objects', () => {
    expect(csvSafeCell({ a: 1 })).toBe('"{""a"":1}"');
  });

  it('combination of formula prefix + comma triggers both protections', () => {
    expect(csvSafeCell('=A,B')).toBe('"\'=A,B"');
  });

  it('csvSafeRow joins with commas', () => {
    expect(csvSafeRow(['Alice', 30, '=NOW()'])).toBe("Alice,30,'=NOW()");
  });

  it('empty string passes through', () => {
    expect(csvSafeCell('')).toBe('');
  });

  it('non-leading dangerous characters are not prefixed', () => {
    expect(csvSafeCell('a=b')).toBe('a=b');
    expect(csvSafeCell('x+1')).toBe('x+1');
  });
});
