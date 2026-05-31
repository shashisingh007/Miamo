function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function levenshteinNormalized(a: string, b: string): number {
  if (typeof a !== 'string' || typeof b !== 'string') throw new Error('inputs must be strings');
  if (a.length === 0 && b.length === 0) return 0;
  const d = levenshtein(a, b);
  return d / Math.max(a.length, b.length);
}

export function levenshteinSimilarity(a: string, b: string): number {
  return 1 - levenshteinNormalized(a, b);
}
