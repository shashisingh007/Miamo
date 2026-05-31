import { describe, it, expect } from 'vitest';
import { scanDependencies, type Advisory } from '../dependencyAdvisory';

const ADV: Advisory[] = [
  { pkg: 'left-pad', introducedIn: '0.0.0', fixedIn: '1.3.0', severity: 'high', advisoryId: 'GHSA-1' },
  { pkg: 'lodash',   introducedIn: '4.0.0', fixedIn: '4.17.21', severity: 'critical', advisoryId: 'GHSA-2' },
  { pkg: 'minimist', introducedIn: '1.0.0', fixedIn: '1.2.6', severity: 'moderate', advisoryId: 'GHSA-3' },
];

describe('dependencyAdvisory', () => {
  it('reports no hits on clean tree', () => {
    const r = scanDependencies({ 'left-pad': '1.3.0', lodash: '4.17.21' }, ADV);
    expect(r.hits).toEqual([]);
    expect(r.worst).toBe('none');
  });

  it('detects a single vulnerable dependency', () => {
    const r = scanDependencies({ 'left-pad': '1.2.9' }, ADV);
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0].pkg).toBe('left-pad');
    expect(r.worst).toBe('high');
  });

  it('skips deps newer than fixedIn (exclusive upper bound)', () => {
    const r = scanDependencies({ 'left-pad': '1.3.0', lodash: '4.17.21' }, ADV);
    expect(r.hits).toEqual([]);
  });

  it('handles ^ / ~ / leading "v" prefixes', () => {
    const r = scanDependencies({ lodash: '^4.17.20', minimist: '~1.2.5' }, ADV);
    expect(r.hits.map(h => h.pkg).sort()).toEqual(['lodash', 'minimist']);
  });

  it('sorts hits by severity desc then pkg asc', () => {
    const r = scanDependencies({ 'left-pad': '1.0.0', lodash: '4.17.10', minimist: '1.0.0' }, ADV);
    expect(r.hits.map(h => h.pkg)).toEqual(['lodash', 'left-pad', 'minimist']);
    expect(r.worst).toBe('critical');
  });

  it('ignores packages not present in deps', () => {
    const r = scanDependencies({ express: '4.18.2' }, ADV);
    expect(r.hits).toEqual([]);
  });

  it('ignores advisories with unparseable versions', () => {
    const bad: Advisory[] = [{ pkg: 'foo', introducedIn: 'not-semver', fixedIn: '1.0.0', severity: 'low', advisoryId: 'X' }];
    expect(scanDependencies({ foo: '0.9.0' }, bad).hits).toEqual([]);
  });

  it('ignores installed versions that are unparseable', () => {
    expect(scanDependencies({ lodash: 'git+ssh://example.com/lodash' }, ADV).hits).toEqual([]);
  });

  it('reports installed string verbatim in the hit', () => {
    const r = scanDependencies({ lodash: '^4.10.0' }, ADV);
    expect(r.hits[0].installed).toBe('^4.10.0');
    expect(r.hits[0].fixedIn).toBe('4.17.21');
    expect(r.hits[0].advisoryId).toBe('GHSA-2');
  });
});
