// Duval's algorithm for Lyndon decomposition / smallest rotation.
// A Lyndon word is a non-empty string strictly smaller than all of its proper
// rotations under lexicographic order. Duval's algorithm produces, in O(n),
// the unique factorization of a string into a non-increasing sequence of
// Lyndon words.

export function lyndonFactorization(s: string): string[] {
  if (typeof s !== 'string') throw new Error('lyndonFactorization: input must be string');
  const n = s.length;
  const out: string[] = [];
  let i = 0;
  while (i < n) {
    let j = i + 1;
    let k = i;
    while (j < n && s[k] <= s[j]) {
      if (s[k] < s[j]) k = i;
      else k += 1;
      j += 1;
    }
    while (i <= k) {
      out.push(s.slice(i, i + j - k));
      i += j - k;
    }
  }
  return out;
}

// Smallest lexicographic rotation, computed via Booth-style Lyndon trick on s+s.
export function smallestRotation(s: string): string {
  if (typeof s !== 'string') throw new Error('smallestRotation: input must be string');
  if (s.length === 0) return '';
  const n = s.length;
  const doubled = s + s;
  let i = 0;
  let ans = 0;
  while (i < n) {
    ans = i;
    let j = i + 1;
    let k = i;
    while (j < 2 * n && doubled[k] <= doubled[j]) {
      if (doubled[k] < doubled[j]) k = i;
      else k += 1;
      j += 1;
    }
    while (i <= k) i += j - k;
  }
  return doubled.slice(ans, ans + n);
}

export function lyndonWordsDuval() {
  return { lyndonFactorization, smallestRotation };
}
