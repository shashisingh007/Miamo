import { describe, it, expect } from 'vitest';
import {
  parseSemVer,
  isValidSemVer,
  compareSemVer,
  sortSemVerAscending,
  maxSemVer,
} from '../semverComparator';

describe('semverComparator', () => {
  it('parses canonical x.y.z', () => {
    const v = parseSemVer('1.2.3');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [], build: [] });
  });

  it('strips leading v', () => {
    expect(parseSemVer('v2.0.0')?.major).toBe(2);
  });

  it('parses prerelease + build', () => {
    const v = parseSemVer('1.0.0-alpha.1+build.7')!;
    expect(v.prerelease).toEqual(['alpha', '1']);
    expect(v.build).toEqual(['build', '7']);
  });

  it('rejects non-numeric core', () => {
    expect(isValidSemVer('1.x.0')).toBe(false);
    expect(isValidSemVer('1.2')).toBe(false);
    expect(isValidSemVer('1.2.3.4')).toBe(false);
    expect(isValidSemVer('')).toBe(false);
  });

  it('rejects leading-zero numeric prerelease', () => {
    expect(isValidSemVer('1.0.0-01')).toBe(false);
    expect(isValidSemVer('1.0.0-0')).toBe(true);
  });

  it('rejects empty prerelease/build segments', () => {
    expect(isValidSemVer('1.0.0-')).toBe(false);
    expect(isValidSemVer('1.0.0+')).toBe(false);
    expect(isValidSemVer('1.0.0-a..b')).toBe(false);
  });

  it('compares core precedence', () => {
    expect(compareSemVer('1.0.0', '2.0.0')).toBe(-1);
    expect(compareSemVer('1.2.0', '1.1.9')).toBe(1);
    expect(compareSemVer('1.0.1', '1.0.1')).toBe(0);
  });

  it('prerelease is lower precedence than release', () => {
    expect(compareSemVer('1.0.0-alpha', '1.0.0')).toBe(-1);
    expect(compareSemVer('1.0.0', '1.0.0-rc.1')).toBe(1);
  });

  it('numeric prerelease identifiers compared numerically', () => {
    expect(compareSemVer('1.0.0-alpha.2', '1.0.0-alpha.10')).toBe(-1);
  });

  it('numeric < alpha at same position', () => {
    expect(compareSemVer('1.0.0-1', '1.0.0-alpha')).toBe(-1);
  });

  it('longer prerelease wins when prefix equal', () => {
    expect(compareSemVer('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
  });

  it('build metadata ignored', () => {
    expect(compareSemVer('1.0.0+x', '1.0.0+y')).toBe(0);
  });

  it('sortSemVerAscending follows spec ordering', () => {
    const v = ['1.0.0', '1.0.0-rc.1', '1.0.0-alpha', '1.0.0-alpha.1', '2.0.0'];
    expect(sortSemVerAscending(v)).toEqual([
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-rc.1',
      '1.0.0',
      '2.0.0',
    ]);
  });

  it('maxSemVer returns highest', () => {
    expect(maxSemVer(['0.9.9', '1.2.3', '1.2.3-rc.1'])).toBe('1.2.3');
  });

  it('maxSemVer on empty list', () => {
    expect(maxSemVer([])).toBeNull();
  });

  it('sortSemVerAscending drops invalid', () => {
    expect(sortSemVerAscending(['1.0.0', 'garbage', '0.1.0'])).toEqual(['0.1.0', '1.0.0']);
  });

  it('compareSemVer throws on invalid', () => {
    expect(() => compareSemVer('1.0.0', 'x.y.z')).toThrow();
  });
});
