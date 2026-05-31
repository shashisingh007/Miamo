// Minimal SemVer 2.0.0 parser + comparator. New symbols only.

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[]; // dot-separated identifiers
  build: string[]; // build metadata (ignored for precedence)
}

const NUMERIC = /^(?:0|[1-9][0-9]*)$/;
const IDENT = /^[0-9A-Za-z-]+$/;

export function parseSemVer(input: string): SemVer | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().replace(/^v/, '');
  if (!s) return null;
  // split build metadata
  let core = s;
  let build: string[] = [];
  const plus = s.indexOf('+');
  if (plus >= 0) {
    build = s.slice(plus + 1).split('.');
    core = s.slice(0, plus);
    if (build.some((p) => !p || !IDENT.test(p))) return null;
  }
  // split prerelease
  let prerelease: string[] = [];
  const dash = core.indexOf('-');
  let main = core;
  if (dash >= 0) {
    prerelease = core.slice(dash + 1).split('.');
    main = core.slice(0, dash);
    if (prerelease.some((p) => !p || !IDENT.test(p))) return null;
    // numeric prerelease identifiers MUST NOT have leading zeros
    if (prerelease.some((p) => /^[0-9]+$/.test(p) && p.length > 1 && p[0] === '0')) return null;
  }
  const parts = main.split('.');
  if (parts.length !== 3) return null;
  if (parts.some((p) => !NUMERIC.test(p))) return null;
  const [maj, min, pat] = parts.map((p) => Number(p));
  return { major: maj, minor: min, patch: pat, prerelease, build };
}

export function isValidSemVer(input: string): boolean {
  return parseSemVer(input) !== null;
}

export function compareSemVer(a: SemVer | string, b: SemVer | string): number {
  const pa = typeof a === 'string' ? parseSemVer(a) : a;
  const pb = typeof b === 'string' ? parseSemVer(b) : b;
  if (!pa || !pb) throw new Error('invalid semver');
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  // prerelease precedence: present < absent
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;
  if (pa.prerelease.length === 0) return 1;
  if (pb.prerelease.length === 0) return -1;
  const n = Math.max(pa.prerelease.length, pb.prerelease.length);
  for (let i = 0; i < n; i++) {
    const x = pa.prerelease[i];
    const y = pb.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^[0-9]+$/.test(x);
    const yn = /^[0-9]+$/.test(y);
    if (xn && yn) {
      const xi = Number(x);
      const yi = Number(y);
      if (xi !== yi) return xi < yi ? -1 : 1;
    } else if (xn && !yn) {
      return -1; // numeric < alpha
    } else if (!xn && yn) {
      return 1;
    } else {
      if (x !== y) return x < y ? -1 : 1;
    }
  }
  return 0;
}

export function sortSemVerAscending(versions: ReadonlyArray<string>): string[] {
  const valid = versions.filter(isValidSemVer);
  return [...valid].sort((a, b) => compareSemVer(a, b));
}

export function maxSemVer(versions: ReadonlyArray<string>): string | null {
  const sorted = sortSemVerAscending(versions);
  return sorted.length === 0 ? null : sorted[sorted.length - 1];
}
