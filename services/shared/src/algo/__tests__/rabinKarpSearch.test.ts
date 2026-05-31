import { describe, it, expect } from 'vitest';
import { rabinKarpSearch, rabinKarpSearchAll } from '../rabinKarpSearch';

describe('rabinKarpSearch', () => {
  it('finds at start', () => {
    expect(rabinKarpSearch('hello world', 'hello')).toBe(0);
  });

  it('finds in middle', () => {
    expect(rabinKarpSearch('hello world', 'world')).toBe(6);
  });

  it('finds at end', () => {
    expect(rabinKarpSearch('abcdef', 'ef')).toBe(4);
  });

  it('returns -1 when not found', () => {
    expect(rabinKarpSearch('hello', 'xyz')).toBe(-1);
  });

  it('empty pattern returns 0', () => {
    expect(rabinKarpSearch('hello', '')).toBe(0);
  });

  it('pattern longer than text returns -1', () => {
    expect(rabinKarpSearch('hi', 'hello')).toBe(-1);
  });

  it('single char match', () => {
    expect(rabinKarpSearch('abcdef', 'd')).toBe(3);
  });

  it('full string match', () => {
    expect(rabinKarpSearch('abc', 'abc')).toBe(0);
  });

  it('repeated pattern returns first', () => {
    expect(rabinKarpSearch('ababab', 'ab')).toBe(0);
  });

  it('empty text non-empty pattern => -1', () => {
    expect(rabinKarpSearch('', 'a')).toBe(-1);
  });

  it('case sensitive', () => {
    expect(rabinKarpSearch('Hello', 'hello')).toBe(-1);
  });

  it('skip-heavy text', () => {
    expect(rabinKarpSearch('THIS IS A SIMPLE EXAMPLE', 'EXAMPLE')).toBe(17);
  });

  it('overlapping pattern returns first', () => {
    expect(rabinKarpSearch('aaaa', 'aa')).toBe(0);
  });
});

describe('rabinKarpSearchAll', () => {
  it('overlapping occurrences', () => {
    expect(rabinKarpSearchAll('aaaa', 'aa')).toEqual([0, 1, 2]);
  });

  it('all three "the" occurrences', () => {
    expect(rabinKarpSearchAll('the cat and the dog and the bird', 'the')).toEqual([0, 12, 24]);
  });

  it('no occurrences => []', () => {
    expect(rabinKarpSearchAll('hello', 'xyz')).toEqual([]);
  });

  it('empty pattern => []', () => {
    expect(rabinKarpSearchAll('hello', '')).toEqual([]);
  });

  it('pattern longer than text => []', () => {
    expect(rabinKarpSearchAll('hi', 'hello')).toEqual([]);
  });

  it('finds single match', () => {
    expect(rabinKarpSearchAll('hello world', 'world')).toEqual([6]);
  });

  it('ababab => [0,2,4]', () => {
    expect(rabinKarpSearchAll('ababab', 'ab')).toEqual([0, 2, 4]);
  });
});
