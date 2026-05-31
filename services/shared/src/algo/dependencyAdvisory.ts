/**
 * dependencyAdvisory \u2014 Phase 20 OWASP A06 (vulnerable / outdated deps).
 *
 * Pure: given a parsed `package.json` dependency map and a list of
 * advisories (e.g. fetched offline from GitHub / Snyk), returns the
 * affected packages with a precise severity bucket.
 *
 * Version match uses inclusive lower-bound + exclusive upper-bound
 * (`fixedIn`). Supports plain semver `x.y.z` only \u2014 ranges, ^/~, and
 * pre-release tags are normalised to the leading numeric segments.
 */
export type Advisory = {
  pkg: string;
  /** First vulnerable version, inclusive. e.g. "0.0.0" for "anything below fixedIn". */
  introducedIn: string;
  /** First fixed version, exclusive. Match means installed < fixedIn. */
  fixedIn: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  advisoryId: string;
};

export type DependencyMap = Record<string, string>; // name -> version string

export type AdvisoryHit = {
  pkg: string;
  installed: string;
  fixedIn: string;
  severity: Advisory['severity'];
  advisoryId: string;
};

export type DependencyScanResult = {
  hits: AdvisoryHit[];
  worst: Advisory['severity'] | 'none';
};

const SEVERITY_RANK: Record<Advisory['severity'], number> = {
  low: 1, moderate: 2, high: 3, critical: 4,
};

function parseSemver(v: string): [number, number, number] | null {
  if (typeof v !== 'string') return null;
  const cleaned = v.trim().replace(/^[\^~>=<v\s]+/, '');
  const m = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function cmp(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function scanDependencies(deps: DependencyMap, advisories: Advisory[]): DependencyScanResult {
  const hits: AdvisoryHit[] = [];
  for (const adv of advisories) {
    const installed = deps[adv.pkg];
    if (!installed) continue;
    const i = parseSemver(installed);
    const lo = parseSemver(adv.introducedIn);
    const hi = parseSemver(adv.fixedIn);
    if (!i || !lo || !hi) continue;
    if (cmp(i, lo) >= 0 && cmp(i, hi) < 0) {
      hits.push({
        pkg: adv.pkg,
        installed,
        fixedIn: adv.fixedIn,
        severity: adv.severity,
        advisoryId: adv.advisoryId,
      });
    }
  }
  let worstRank = 0;
  let worst: Advisory['severity'] | 'none' = 'none';
  for (const h of hits) {
    const r = SEVERITY_RANK[h.severity];
    if (r > worstRank) { worstRank = r; worst = h.severity; }
  }
  // Stable ordering: highest severity first, then pkg name.
  hits.sort((a, b) => (SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]) || a.pkg.localeCompare(b.pkg));
  return { hits, worst };
}
