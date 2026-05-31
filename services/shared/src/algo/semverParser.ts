export type SemverParts = {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: ReadonlyArray<string | number>;
  readonly build: ReadonlyArray<string>;
};

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function parseSemver(input: unknown): SemverParts | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().replace(/^v/i, '');
  const m = SEMVER_RE.exec(trimmed);
  if (!m) return null;
  const prerelease: Array<string | number> = [];
  if (m[4]) {
    for (const part of m[4].split('.')) {
      if (/^\d+$/.test(part)) prerelease.push(Number.parseInt(part, 10));
      else prerelease.push(part);
    }
  }
  const build: string[] = m[5] ? m[5].split('.') : [];
  return {
    major: Number.parseInt(m[1], 10),
    minor: Number.parseInt(m[2], 10),
    patch: Number.parseInt(m[3], 10),
    prerelease,
    build,
  };
}

function comparePrerelease(
  a: ReadonlyArray<string | number>,
  b: ReadonlyArray<string | number>,
): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;  // no prerelease > prerelease
  if (b.length === 0) return -1;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    const xn = typeof x === 'number';
    const yn = typeof y === 'number';
    if (xn && yn) {
      if (x !== y) return (x as number) < (y as number) ? -1 : 1;
    } else if (xn !== yn) {
      return xn ? -1 : 1; // numeric < alphanumeric
    } else {
      const xs = x as string;
      const ys = y as string;
      if (xs !== ys) return xs < ys ? -1 : 1;
    }
  }
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  return 0;
}

export function compareSemver(a: SemverParts, b: SemverParts): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return comparePrerelease(a.prerelease, b.prerelease);
}

export function satisfiesCaret(version: SemverParts, baseline: SemverParts): boolean {
  if (comparePrerelease(version.prerelease, []) !== 0 &&
      !(baseline.major === version.major &&
        baseline.minor === version.minor &&
        baseline.patch === version.patch)) {
    return false;
  }
  if (version.major !== baseline.major) return false;
  if (compareSemver(version, baseline) < 0) return false;
  return true;
}
