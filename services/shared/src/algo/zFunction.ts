// Z-function: for a string S of length n, z[i] = length of longest substring
// starting at i that matches a prefix of S. z[0] is defined as n.

export function zFunction(s: string): number[] {
  if (typeof s !== 'string') throw new TypeError('s must be a string');
  const n = s.length;
  const z = new Array<number>(n).fill(0);
  if (n === 0) return z;
  z[0] = n;
  let l = 0;
  let r = 0;
  for (let i = 1; i < n; i += 1) {
    if (i < r) z[i] = Math.min(r - i, z[i - l]);
    while (i + z[i] < n && s.charCodeAt(z[i]) === s.charCodeAt(i + z[i])) z[i] += 1;
    if (i + z[i] > r) {
      l = i;
      r = i + z[i];
    }
  }
  return z;
}

// Pattern search via z-function on pattern + sep + text. Returns 0-based
// indices in text where pattern occurs.
export function zSearch(text: string, pattern: string): number[] {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');
  if (pattern.length === 0) return [];
  const sep = '\u0001';
  if (pattern.includes(sep) || text.includes(sep)) {
    throw new RangeError('inputs must not contain U+0001 separator');
  }
  const combined = pattern + sep + text;
  const z = zFunction(combined);
  const out: number[] = [];
  const offset = pattern.length + 1;
  for (let i = offset; i < combined.length; i += 1) {
    if (z[i] >= pattern.length) out.push(i - offset);
  }
  return out;
}
