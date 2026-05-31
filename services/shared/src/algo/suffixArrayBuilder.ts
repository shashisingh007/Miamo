export function buildSuffixArray(text: string): number[] {
  const n = text.length;
  if (n === 0) return [];
  const indices: number[] = [];
  for (let i = 0; i < n; i++) indices.push(i);
  indices.sort((a, b) => {
    const sa = text.slice(a);
    const sb = text.slice(b);
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  });
  return indices;
}

export function buildLcpArray(text: string, suffixArray: number[]): number[] {
  const n = suffixArray.length;
  if (n === 0) return [];
  const rank = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) rank[suffixArray[i]] = i;
  const lcp = new Array<number>(n).fill(0);
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = suffixArray[rank[i] - 1];
      while (i + h < n && j + h < n && text[i + h] === text[j + h]) h += 1;
      lcp[rank[i]] = h;
      if (h > 0) h -= 1;
    } else {
      h = 0;
    }
  }
  return lcp;
}

export function suffixArrayContains(text: string, suffixArray: number[], pattern: string): boolean {
  if (pattern.length === 0) return true;
  let lo = 0;
  let hi = suffixArray.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const suf = text.slice(suffixArray[mid], suffixArray[mid] + pattern.length);
    if (suf < pattern) lo = mid + 1;
    else hi = mid;
  }
  if (lo >= suffixArray.length) return false;
  return text.slice(suffixArray[lo], suffixArray[lo] + pattern.length) === pattern;
}
