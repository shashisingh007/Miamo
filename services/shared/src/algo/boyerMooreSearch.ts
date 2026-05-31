function buildBadCharTable(pattern: string): Map<string, number> {
  const table = new Map<string, number>();
  for (let i = 0; i < pattern.length - 1; i++) {
    table.set(pattern[i], pattern.length - 1 - i);
  }
  return table;
}

export function boyerMooreSearch(text: string, pattern: string): number {
  if (pattern.length === 0) return 0;
  if (pattern.length > text.length) return -1;
  const m = pattern.length;
  const n = text.length;
  const bad = buildBadCharTable(pattern);
  let i = m - 1;
  while (i < n) {
    let j = m - 1;
    let k = i;
    while (j >= 0 && text[k] === pattern[j]) {
      j -= 1;
      k -= 1;
    }
    if (j < 0) return k + 1;
    const shift = bad.get(text[i]) ?? m;
    i += shift;
  }
  return -1;
}

export function boyerMooreSearchAll(text: string, pattern: string): number[] {
  const out: number[] = [];
  if (pattern.length === 0) return out;
  let from = 0;
  while (from <= text.length - pattern.length) {
    const idx = boyerMooreSearch(text.slice(from), pattern);
    if (idx < 0) break;
    out.push(from + idx);
    from += idx + 1;
  }
  return out;
}
