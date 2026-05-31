// Boyer-Moore-Horspool string search. Simpler than full Boyer-Moore: uses
// only the bad-character shift table. Returns all match indices in left-to-
// right order.

export function boyerMooreHorspoolSearch(text: string, pattern: string): number[] {
  if (typeof text !== 'string' || typeof pattern !== 'string') {
    throw new TypeError('text and pattern must be strings');
  }
  const n = text.length;
  const m = pattern.length;
  if (m === 0) {
    const out: number[] = [];
    for (let i = 0; i <= n; i += 1) out.push(i);
    return out;
  }
  if (m > n) return [];

  // Bad character shift table (default shift = m).
  const shift = new Map<number, number>();
  for (let i = 0; i < m - 1; i += 1) {
    shift.set(pattern.charCodeAt(i), m - 1 - i);
  }

  const out: number[] = [];
  let i = 0;
  while (i <= n - m) {
    let j = m - 1;
    while (j >= 0 && pattern.charCodeAt(j) === text.charCodeAt(i + j)) j -= 1;
    if (j < 0) {
      out.push(i);
      i += m === 1 ? 1 : (shift.get(text.charCodeAt(i + m - 1)) ?? m);
    } else {
      i += shift.get(text.charCodeAt(i + m - 1)) ?? m;
    }
  }
  return out;
}
