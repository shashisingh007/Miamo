// Knuth-Morris-Pratt substring search with prefix-function preprocessing.

export function buildKmpFailure(pattern: string): Int32Array {
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');
  const m = pattern.length;
  const fail = new Int32Array(m);
  let k = 0;
  for (let i = 1; i < m; i++) {
    while (k > 0 && pattern.charCodeAt(k) !== pattern.charCodeAt(i)) {
      k = fail[k - 1];
    }
    if (pattern.charCodeAt(k) === pattern.charCodeAt(i)) k++;
    fail[i] = k;
  }
  return fail;
}

export function kmpSearch(text: string, pattern: string): number {
  const all = kmpSearchAll(text, pattern, { limit: 1 });
  return all.length === 0 ? -1 : all[0];
}

export interface KmpSearchAllOptions {
  limit?: number;
  overlap?: boolean; // default true; if false, advance by pattern.length after each match
}

export function kmpSearchAll(
  text: string,
  pattern: string,
  opts: KmpSearchAllOptions = {}
): number[] {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');
  const limit = opts.limit ?? Number.POSITIVE_INFINITY;
  if (!(limit === Number.POSITIVE_INFINITY) && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('limit must be a positive integer');
  }
  const overlap = opts.overlap ?? true;
  const matches: number[] = [];
  if (pattern.length === 0) return matches;
  if (pattern.length > text.length) return matches;
  const fail = buildKmpFailure(pattern);
  const n = text.length;
  const m = pattern.length;
  let i = 0;
  let j = 0;
  while (i < n) {
    if (text.charCodeAt(i) === pattern.charCodeAt(j)) {
      i++;
      j++;
      if (j === m) {
        matches.push(i - m);
        if (matches.length >= limit) return matches;
        if (overlap) j = fail[j - 1];
        else j = 0;
      }
    } else if (j > 0) {
      j = fail[j - 1];
    } else {
      i++;
    }
  }
  return matches;
}
