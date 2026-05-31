// Longest Common Subsequence (LCS) of two sequences. Returns both the length
// and one canonical LCS string/array reconstructed from the DP table.
//
// Strings are treated as sequences of UTF-16 code units; arrays as sequences
// of any equality-comparable values (compared with ===).

export interface LcsResult<T> {
  length: number;
  sequence: T[];
}

export function longestCommonSubsequence<T = string>(
  a: T[] | string,
  b: T[] | string,
): LcsResult<T> {
  if (typeof a === 'string' && typeof b === 'string') {
    const res = lcsCore(Array.from(a) as unknown as T[], Array.from(b) as unknown as T[]);
    return res;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return lcsCore(a, b);
  }
  throw new TypeError('inputs must both be strings or both be arrays');
}

function lcsCore<T>(a: T[], b: T[]): LcsResult<T> {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return { length: 0, sequence: [] };

  // dp[i][j] = LCS length of a[..i) and b[..j)
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i += 1) dp[i] = new Uint32Array(m + 1);

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        const up = dp[i - 1][j];
        const left = dp[i][j - 1];
        dp[i][j] = up >= left ? up : left;
      }
    }
  }

  // reconstruct
  const seq: T[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      seq.push(a[i - 1]);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  seq.reverse();
  return { length: dp[n][m], sequence: seq };
}

// Convenience: LCS length only (saves the reconstruction pass).
export function lcsLength<T>(a: T[] | string, b: T[] | string): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return lcsLengthCore(Array.from(a) as unknown as T[], Array.from(b) as unknown as T[]);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return lcsLengthCore(a, b);
  }
  throw new TypeError('inputs must both be strings or both be arrays');
}

function lcsLengthCore<T>(a: T[], b: T[]): number {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return 0;
  let prev = new Uint32Array(m + 1);
  let cur = new Uint32Array(m + 1);
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) cur[j] = prev[j - 1] + 1;
      else cur[j] = prev[j] >= cur[j - 1] ? prev[j] : cur[j - 1];
    }
    const tmp = prev;
    prev = cur;
    cur = tmp;
    cur.fill(0);
  }
  return prev[m];
}
