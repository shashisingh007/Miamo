export interface PalindromeResult {
  start: number;
  length: number;
  value: string;
}

export function manacherLongestPalindrome(text: string): PalindromeResult {
  if (text.length === 0) return { start: 0, length: 0, value: '' };
  const t: string[] = ['^'];
  for (const ch of text) {
    t.push('#');
    t.push(ch);
  }
  t.push('#');
  t.push('$');

  const n = t.length;
  const p = new Array<number>(n).fill(0);
  let center = 0;
  let right = 0;

  for (let i = 1; i < n - 1; i++) {
    const mirror = 2 * center - i;
    if (i < right) p[i] = Math.min(right - i, p[mirror]);
    while (t[i + 1 + p[i]] === t[i - 1 - p[i]]) p[i] += 1;
    if (i + p[i] > right) {
      center = i;
      right = i + p[i];
    }
  }

  let maxCenter = 0;
  let maxLen = 0;
  for (let i = 1; i < n - 1; i++) {
    if (p[i] > maxLen) {
      maxLen = p[i];
      maxCenter = i;
    }
  }
  const start = Math.floor((maxCenter - maxLen) / 2);
  return { start, length: maxLen, value: text.slice(start, start + maxLen) };
}

export function manacherAllPalindromeRadii(text: string): number[] {
  if (text.length === 0) return [];
  const t: string[] = ['^'];
  for (const ch of text) {
    t.push('#');
    t.push(ch);
  }
  t.push('#');
  t.push('$');
  const n = t.length;
  const p = new Array<number>(n).fill(0);
  let center = 0;
  let right = 0;
  for (let i = 1; i < n - 1; i++) {
    const mirror = 2 * center - i;
    if (i < right) p[i] = Math.min(right - i, p[mirror]);
    while (t[i + 1 + p[i]] === t[i - 1 - p[i]]) p[i] += 1;
    if (i + p[i] > right) {
      center = i;
      right = i + p[i];
    }
  }
  return p.slice(1, n - 1);
}
