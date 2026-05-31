// Booth's algorithm: lexicographically smallest rotation index of a string.
// Returns the starting index i such that s.slice(i) + s.slice(0, i) is minimal.

export function boothLeastRotation(s: string): number {
  if (typeof s !== 'string') throw new Error('input must be a string');
  if (s.length === 0) throw new Error('empty string');
  const n = s.length;
  const ss = s + s;
  const f: number[] = new Array(2 * n).fill(-1);
  let k = 0;
  for (let j = 1; j < 2 * n; j++) {
    let i = f[j - k - 1];
    while (i !== -1 && ss.charCodeAt(j) !== ss.charCodeAt(k + i + 1)) {
      if (ss.charCodeAt(j) < ss.charCodeAt(k + i + 1)) k = j - i - 1;
      i = f[i];
    }
    if (i === -1 && ss.charCodeAt(j) !== ss.charCodeAt(k + i + 1)) {
      if (ss.charCodeAt(j) < ss.charCodeAt(k + i + 1)) k = j;
      f[j - k] = -1;
    } else {
      f[j - k] = i + 1;
    }
  }
  return k;
}

export function leastRotationString(s: string): string {
  const k = boothLeastRotation(s);
  return s.slice(k) + s.slice(0, k);
}
