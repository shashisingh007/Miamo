import { describe, it, expect } from 'vitest';
import { parseSemver, compareSemver, satisfiesCaret } from '../semverParser';

describe('semverParser', () => {
  it('parses basic version', () => {
    const v = parseSemver('1.2.3');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [], build: [] });
  });

  it('strips v prefix', () => {
    expect(parseSemver('v1.2.3')!.major).toBe(1);
  });

  it('parses prerelease and build', () => {
    const v = parseSemver('1.0.0-alpha.1+build.42')!;
    expect(v.prerelease).toEqual(['alpha', 1]);
    expect(v.build).toEqual(['build', '42']);
  });

  it('rejects non-strings', () => {
    expect(parseSemver(null)).toBeNull();
    expect(parseSemver(123)).toBeNull();
  });

  it('rejects leading zeros', () => {
    expect(parseSemver('01.0.0')).toBeNull();
  });

  it('rejects partial versions', () => {
    expect(parseSemver('1.2')).toBeNull();
  });

  it('compareSemver core fields', () => {
    expect(compareSemver(parseSemver('1.0.0')!, parseSemver('2.0.0')!)).toBe(-1);
    expect(compareSemver(parseSemver('1.2.0')!, parseSemver('1.1.9')!)).toBe(1);
    expect(compareSemver(parseSemver('1.2.3')!, parseSemver('1.2.3')!)).toBe(0);
  });

  it('prerelease < release', () => {
    expect(compareSemver(parseSemver('1.0.0-rc.1')!, parseSemver('1.0.0')!)).toBe(-1);
  });

  it('numeric prerelease < alphanumeric', () => {
    expect(compareSemver(parseSemver('1.0.0-1')!, parseSemver('1.0.0-alpha')!)).toBe(-1);
  });

  it('longer prerelease > shorter when prefix equal', () => {
    expect(compareSemver(parseSemver('1.0.0-alpha.1')!, parseSemver('1.0.0-alpha')!)).toBe(1);
  });

  it('build metadata ignored in compare', () => {
    expect(compareSemver(parseSemver('1.0.0+a')!, parseSemver('1.0.0+b')!)).toBe(0);
  });

  it('satisfiesCaret allows same-major upgrades', () => {
    const base = parseSemver('1.2.3')!;
    expect(satisfiesCaret(parseSemver('1.9.0')!, base)).toBe(true);
    expect(satisfiesCaret(parseSemver('2.0.0')!, base)).toBe(false);
    expect(satisfiesCaret(parseSemver('1.2.2')!, base)).toBe(false);
  });

  it('satisfiesCaret excludes prerelease of different version', () => {
    expect(satisfiesCaret(parseSemver('1.5.0-rc.1')!, parseSemver('1.2.3')!)).toBe(false);
  });

  it('parses sorted list correctly', () => {
    const versions = ['1.0.0', '1.0.0-alpha', '1.0.0-rc.1', '2.0.0', '1.1.0'].map(
      (s) => parseSemver(s)!,
    );
    versions.sort(compareSemver);
    expect(versions.map((v) => `${v.major}.${v.minor}.${v.patch}${v.prerelease.length ? '-' + v.prerelease.join('.') : ''}`))
      .toEqual(['1.0.0-alpha', '1.0.0-rc.1', '1.0.0', '1.1.0', '2.0.0']);
  });
});
