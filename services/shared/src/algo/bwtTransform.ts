// Burrows-Wheeler Transform.
// Encode: returns { transformed, primaryIndex } so the inverse can be recovered
// without using a sentinel character.

export interface BwtResult {
  transformed: string;
  primaryIndex: number;
}

export function bwtEncode(input: string): BwtResult {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  if (input.length === 0) return { transformed: '', primaryIndex: 0 };
  const n = input.length;
  // build rotation indices and sort by rotation lexicographically
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => {
    for (let i = 0; i < n; i += 1) {
      const ca = input.charCodeAt((a + i) % n);
      const cb = input.charCodeAt((b + i) % n);
      if (ca !== cb) return ca - cb;
    }
    return 0;
  });
  let primary = 0;
  const out = new Array<string>(n);
  for (let i = 0; i < n; i += 1) {
    const start = indices[i];
    out[i] = input[(start + n - 1) % n];
    if (start === 0) primary = i;
  }
  return { transformed: out.join(''), primaryIndex: primary };
}

export function bwtDecode(transformed: string, primaryIndex: number): string {
  if (typeof transformed !== 'string') throw new TypeError('transformed must be a string');
  if (!Number.isInteger(primaryIndex) || primaryIndex < 0) {
    throw new RangeError('primaryIndex must be a non-negative integer');
  }
  const n = transformed.length;
  if (n === 0) return '';
  if (primaryIndex >= n) throw new RangeError('primaryIndex out of range');
  // build first column: sorted transformed
  const order = Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => transformed.charCodeAt(a) - transformed.charCodeAt(b));
  // T[i] = index in transformed (= last column) whose rotation comes next
  const t = new Array<number>(n);
  for (let i = 0; i < n; i += 1) t[i] = order[i];
  // reconstruct original by following T n times from primaryIndex
  const out = new Array<string>(n);
  let cur = t[primaryIndex];
  for (let i = 0; i < n; i += 1) {
    out[i] = transformed[cur];
    cur = t[cur];
  }
  return out.join('');
}
