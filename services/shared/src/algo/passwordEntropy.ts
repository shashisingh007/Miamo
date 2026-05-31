/**
 * passwordEntropy \u2014 Phase 20 OWASP A07 password entropy estimator (pure).
 *
 * Distinct from `passwordPolicy` (rule-based). This computes a Shannon-
 * style bits-of-entropy estimate, lightly penalising character repetition
 * and predictable substrings, then maps to a strength tier.
 */
export type EntropyResult = {
  bits: number;
  tier: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  charsetBits: number;
};

function detectCharsetSize(pw: string): number {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/[0-9]/.test(pw)) size += 10;
  if (/[^A-Za-z0-9]/.test(pw)) size += 33;
  return size || 1;
}

function repetitionPenalty(pw: string): number {
  // Fraction of duplicate chars; 0..1 multiplier on length.
  if (pw.length === 0) return 0;
  const seen = new Set<string>();
  let dup = 0;
  for (const ch of pw) {
    if (seen.has(ch)) dup++;
    else seen.add(ch);
  }
  return 1 - 0.5 * (dup / pw.length);
}

function sequentialRunPenalty(pw: string): number {
  // crude: count length of monotonic ascending/descending char-code runs >= 3
  let pen = 0;
  let run = 1;
  let dir = 0;
  for (let i = 1; i < pw.length; i++) {
    const d = pw.charCodeAt(i) - pw.charCodeAt(i - 1);
    if (d === dir && (d === 1 || d === -1)) {
      run++;
      if (run >= 3) pen++;
    } else {
      run = 1;
      dir = d === 1 || d === -1 ? d : 0;
    }
  }
  return Math.max(0.3, 1 - 0.05 * pen);
}

export function estimatePasswordEntropy(pw: string): EntropyResult {
  if (typeof pw !== 'string' || pw.length === 0) {
    return { bits: 0, tier: 'very_weak', charsetBits: 0 };
  }
  const charset = detectCharsetSize(pw);
  const charsetBits = Math.log2(charset);
  const effectiveLen = pw.length * repetitionPenalty(pw) * sequentialRunPenalty(pw);
  const bits = Math.max(0, effectiveLen * charsetBits);
  let tier: EntropyResult['tier'];
  if (bits < 28) tier = 'very_weak';
  else if (bits < 36) tier = 'weak';
  else if (bits < 60) tier = 'fair';
  else if (bits < 96) tier = 'strong';
  else tier = 'very_strong';
  return { bits, tier, charsetBits };
}
