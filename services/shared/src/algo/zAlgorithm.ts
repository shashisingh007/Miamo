// Z-algorithm: for a string S, computes Z[i] = length of the longest substring
// starting at i that matches a prefix of S. Useful for pattern matching:
// occurrences of pattern P in text T are positions in z(P + '$' + T) where the
// Z value equals P.length.

export function zAlgorithm(s: string): number[] {
  if (typeof s !== 'string') throw new Error('zAlgorithm: input must be a string');
  const n = s.length;
  const z = new Array<number>(n).fill(0);
  if (n === 0) return z;
  z[0] = n;
  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i += 1) {
    if (i < r) z[i] = Math.min(r - i, z[i - l]);
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i] += 1;
    if (i + z[i] > r) {
      l = i;
      r = i + z[i];
    }
  }
  return z;
}

export function zAlgorithmFindAll(text: string, pattern: string, sep = '\u0001'): number[] {
  if (typeof text !== 'string' || typeof pattern !== 'string') {
    throw new Error('zAlgorithm: text and pattern must be strings');
  }
  if (pattern.length === 0) return [];
  if (text.indexOf(sep) !== -1 || pattern.indexOf(sep) !== -1) {
    throw new Error('zAlgorithm: text/pattern contains separator character');
  }
  const combined = pattern + sep + text;
  const z = zAlgorithm(combined);
  const out: number[] = [];
  const offset = pattern.length + 1;
  for (let i = offset; i < combined.length; i += 1) {
    if (z[i] >= pattern.length) out.push(i - offset);
  }
  return out;
}
