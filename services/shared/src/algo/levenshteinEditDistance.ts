// Levenshtein edit distance (substitution cost 1) + similarity ratio.
// Iterative two-row DP, O(min(m,n)) memory.

export interface LevenshteinOptions {
  caseSensitive?: boolean; // default true
  maxDistance?: number; // early termination upper bound
}

export function levenshteinDistance(
  a: string,
  b: string,
  opts: LevenshteinOptions = {}
): number {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('inputs must be strings');
  }
  let s1 = a;
  let s2 = b;
  if (opts.caseSensitive === false) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  }
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  // Use shorter string for the row to minimize memory
  if (s1.length > s2.length) {
    const t = s1;
    s1 = s2;
    s2 = t;
  }
  const m = s1.length;
  const n = s2.length;
  const maxD =
    opts.maxDistance !== undefined && Number.isFinite(opts.maxDistance)
      ? Math.max(0, Math.floor(opts.maxDistance))
      : Number.POSITIVE_INFINITY;

  let prev = new Array<number>(m + 1);
  let cur = new Array<number>(m + 1);
  for (let i = 0; i <= m; i++) prev[i] = i;

  for (let j = 1; j <= n; j++) {
    cur[0] = j;
    let rowMin = cur[0];
    const cj = s2.charCodeAt(j - 1);
    for (let i = 1; i <= m; i++) {
      const cost = s1.charCodeAt(i - 1) === cj ? 0 : 1;
      const a1 = prev[i] + 1;       // deletion
      const a2 = cur[i - 1] + 1;    // insertion
      const a3 = prev[i - 1] + cost; // substitution
      const v = a1 < a2 ? (a1 < a3 ? a1 : a3) : a2 < a3 ? a2 : a3;
      cur[i] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > maxD) return maxD + 1;
    const t = prev;
    prev = cur;
    cur = t;
  }
  return Math.min(prev[m], maxD + 1);
}

export function levenshteinSimilarity(
  a: string,
  b: string,
  opts: LevenshteinOptions = {}
): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  const d = levenshteinDistance(a, b, opts);
  return 1 - d / longest;
}

export function isWithinLevenshtein(
  a: string,
  b: string,
  threshold: number,
  opts: LevenshteinOptions = {}
): boolean {
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new Error('threshold must be a non-negative integer');
  }
  return levenshteinDistance(a, b, { ...opts, maxDistance: threshold }) <= threshold;
}
