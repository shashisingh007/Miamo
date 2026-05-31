import { describe, it, expect } from 'vitest';
import { boyerMooreMajorityVote } from '../boyerMooreMajorityVote';

describe('boyerMooreMajorityVote', () => {
  it('empty => null', () => {
    expect(boyerMooreMajorityVote([])).toBeNull();
  });

  it('single element => that element', () => {
    expect(boyerMooreMajorityVote([42])).toBe(42);
  });

  it('majority numeric', () => {
    expect(boyerMooreMajorityVote([1, 2, 1, 1, 3])).toBe(1);
  });

  it('no majority => null', () => {
    expect(boyerMooreMajorityVote([1, 2, 3, 4, 5])).toBeNull();
  });

  it('exactly half is not majority', () => {
    expect(boyerMooreMajorityVote([1, 1, 2, 2])).toBeNull();
  });

  it('strict majority strings', () => {
    expect(boyerMooreMajorityVote(['a', 'b', 'a', 'a'])).toBe('a');
  });

  it('all same', () => {
    expect(boyerMooreMajorityVote([7, 7, 7, 7])).toBe(7);
  });

  it('long run with tail mismatches', () => {
    expect(boyerMooreMajorityVote([5, 5, 5, 5, 5, 1, 2, 3])).toBe(5);
  });

  it('majority near end', () => {
    expect(boyerMooreMajorityVote([1, 2, 3, 2, 2, 2])).toBe(2);
  });

  it('alternating pattern no majority', () => {
    expect(boyerMooreMajorityVote([1, 2, 1, 2, 1, 2])).toBeNull();
  });

  it('majority at threshold n=5 with 3 occurrences', () => {
    expect(boyerMooreMajorityVote([1, 1, 1, 2, 3])).toBe(1);
  });

  it('does not pick last element falsely', () => {
    expect(boyerMooreMajorityVote([1, 2, 3])).toBeNull();
  });

  it('handles boolean true majority', () => {
    expect(boyerMooreMajorityVote([true, false, true, true])).toBe(true);
  });

  it('handles negative numbers', () => {
    expect(boyerMooreMajorityVote([-1, -1, -1, 2])).toBe(-1);
  });
});
