function lcsTable(a: string, b: string): { length: number; endA: number } {
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return { length: 0, endA: 0 };
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);
  let best = 0;
  let endA = 0;
  for (let i = 1; i <= m; i++) {
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      if (ai === b.charCodeAt(j - 1)) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > best) {
          best = curr[j];
          endA = i;
        }
      } else {
        curr[j] = 0;
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return { length: best, endA };
}

export function longestCommonSubstringLength(a: string, b: string): number {
  if (typeof a !== 'string' || typeof b !== 'string') throw new Error('inputs must be strings');
  return lcsTable(a, b).length;
}

export function longestCommonSubstring(a: string, b: string): string {
  if (typeof a !== 'string' || typeof b !== 'string') throw new Error('inputs must be strings');
  const { length, endA } = lcsTable(a, b);
  return a.slice(endA - length, endA);
}
