const BASE = 257;
const MOD = 1_000_000_007;

function pow(base: number, exp: number, mod: number): number {
  let r = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e & 1) r = (r * b) % mod;
    b = (b * b) % mod;
    e >>>= 1;
  }
  return r;
}

export function rabinKarpSearch(text: string, pattern: string): number {
  if (pattern.length === 0) return 0;
  if (pattern.length > text.length) return -1;
  const m = pattern.length;
  const n = text.length;
  let patternHash = 0;
  let windowHash = 0;
  const highPow = pow(BASE, m - 1, MOD);
  for (let i = 0; i < m; i++) {
    patternHash = (patternHash * BASE + pattern.charCodeAt(i)) % MOD;
    windowHash = (windowHash * BASE + text.charCodeAt(i)) % MOD;
  }
  for (let i = 0; i <= n - m; i++) {
    if (patternHash === windowHash) {
      let match = true;
      for (let j = 0; j < m; j++) {
        if (text[i + j] !== pattern[j]) { match = false; break; }
      }
      if (match) return i;
    }
    if (i < n - m) {
      windowHash = ((windowHash - text.charCodeAt(i) * highPow % MOD) % MOD + MOD) % MOD;
      windowHash = (windowHash * BASE + text.charCodeAt(i + m)) % MOD;
    }
  }
  return -1;
}

export function rabinKarpSearchAll(text: string, pattern: string): number[] {
  const out: number[] = [];
  if (pattern.length === 0) return out;
  if (pattern.length > text.length) return out;
  const m = pattern.length;
  const n = text.length;
  let patternHash = 0;
  let windowHash = 0;
  const highPow = pow(BASE, m - 1, MOD);
  for (let i = 0; i < m; i++) {
    patternHash = (patternHash * BASE + pattern.charCodeAt(i)) % MOD;
    windowHash = (windowHash * BASE + text.charCodeAt(i)) % MOD;
  }
  for (let i = 0; i <= n - m; i++) {
    if (patternHash === windowHash) {
      let match = true;
      for (let j = 0; j < m; j++) {
        if (text[i + j] !== pattern[j]) { match = false; break; }
      }
      if (match) out.push(i);
    }
    if (i < n - m) {
      windowHash = ((windowHash - text.charCodeAt(i) * highPow % MOD) % MOD + MOD) % MOD;
      windowHash = (windowHash * BASE + text.charCodeAt(i + m)) % MOD;
    }
  }
  return out;
}
