// Knuth-Morris-Pratt failure function (longest proper prefix that is also a suffix)
// and a search routine built from it. Linear time, O(n+m).

export function kmpFailure(pattern: string): number[] {
  if (typeof pattern !== 'string') throw new Error('kmpFailure: pattern must be string');
  const m = pattern.length;
  const fail = new Array<number>(m).fill(0);
  let k = 0;
  for (let i = 1; i < m; i += 1) {
    while (k > 0 && pattern[k] !== pattern[i]) k = fail[k - 1];
    if (pattern[k] === pattern[i]) k += 1;
    fail[i] = k;
  }
  return fail;
}

export function kmpSearchAll(text: string, pattern: string): number[] {
  if (typeof text !== 'string') throw new Error('kmpSearchAll: text must be string');
  if (typeof pattern !== 'string') throw new Error('kmpSearchAll: pattern must be string');
  const out: number[] = [];
  if (pattern.length === 0) return out;
  const fail = kmpFailure(pattern);
  let q = 0;
  for (let i = 0; i < text.length; i += 1) {
    while (q > 0 && pattern[q] !== text[i]) q = fail[q - 1];
    if (pattern[q] === text[i]) q += 1;
    if (q === pattern.length) {
      out.push(i - pattern.length + 1);
      q = fail[q - 1];
    }
  }
  return out;
}

export function kmpFailureFunction() {
  return { kmpFailure, kmpSearchAll };
}
