// Miamo Mobile — utils unit tests.
import {
  clamp,
  timeAgo,
  truncate,
  isEmail,
  isIndianPhone,
  formatINR,
  compareDistance,
  initials,
  shuffle,
} from '@lib/utils';

describe('utils', () => {
  it('clamp bounds numbers correctly', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('timeAgo bucketizes ranges', () => {
    const now = new Date();
    expect(timeAgo(now)).toBe('just now');
    const oneHourAgo = new Date(Date.now() - 3600_000);
    expect(timeAgo(oneHourAgo)).toBe('1h');
    const oneDayAgo = new Date(Date.now() - 86_400_000);
    expect(timeAgo(oneDayAgo)).toBe('1d');
    const oneWeekAgo = new Date(Date.now() - 604_800_000);
    expect(timeAgo(oneWeekAgo)).toBe('1w');
  });

  it('truncate adds ellipsis past max', () => {
    expect(truncate('abcdef', 10)).toBe('abcdef');
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });

  it('isEmail matches simple emails', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('a')).toBe(false);
  });

  it('isIndianPhone accepts 10-digit + +91', () => {
    expect(isIndianPhone('9999999999')).toBe(true);
    expect(isIndianPhone('+919999999999')).toBe(true);
    expect(isIndianPhone('12345')).toBe(false);
  });

  it('formatINR uses lakh grouping', () => {
    expect(formatINR(1000)).toBe('1,000');
    expect(formatINR(100000)).toBe('1,00,000');
    expect(formatINR(1234567)).toBe('12,34,567');
  });

  it('compareDistance sorts nulls last', () => {
    const arr = [3, null, 1, 2, null].sort(compareDistance);
    expect(arr[0]).toBe(1);
    expect(arr[arr.length - 1]).toBeNull();
  });

  it('initials extracts letters', () => {
    expect(initials('Priya Rao')).toBe('PR');
    expect(initials('Cher')).toBe('CH');
    expect(initials('')).toBe('?');
  });

  it('shuffle returns same-length array', () => {
    const out = shuffle([1, 2, 3, 4, 5]);
    expect(out).toHaveLength(5);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('shuffle does not mutate input', () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });
});
