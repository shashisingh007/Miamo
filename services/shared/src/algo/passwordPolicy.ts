/**
 * passwordPolicy \u2014 Phase 20 OWASP A07 password strength check (pure).
 *
 * Pure validator (no hashing, no DB lookup). Caller composes this with
 * an external HIBP check + their hasher.
 *
 * Rules (configurable):
 *  - length \u2208 [minLen, maxLen] (default 12, 128)
 *  - at least one upper, one lower, one digit, one symbol
 *  - not in `commonList` (case-insensitive)
 *  - not equal to / containing `personal` info (email-local, name, dob)
 *  - no run of \u22654 identical chars or sequential a-b-c / 1-2-3
 */
export type PasswordPolicyInputs = {
  password: string;
  minLen?: number;
  maxLen?: number;
  commonList?: string[];        // pre-loaded top-N (e.g. rockyou.short)
  personal?: string[];          // [email local, first name, dob digits...]
};

export type PasswordPolicyIssue =
  | 'too_short' | 'too_long' | 'missing_upper' | 'missing_lower'
  | 'missing_digit' | 'missing_symbol' | 'common' | 'contains_personal'
  | 'repeats' | 'sequential';

export type PasswordPolicyResult = {
  ok: boolean;
  issues: PasswordPolicyIssue[];
  score: 0 | 1 | 2 | 3 | 4; // weak..strong
};

function hasSequential(p: string): boolean {
  const s = p.toLowerCase();
  for (let i = 0; i + 2 < s.length; i++) {
    const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
    if (b === a + 1 && c === b + 1) return true;
    if (b === a - 1 && c === b - 1) return true;
  }
  return false;
}

function hasLongRun(p: string): boolean {
  let run = 1;
  for (let i = 1; i < p.length; i++) {
    if (p[i] === p[i - 1]) { run++; if (run >= 4) return true; } else run = 1;
  }
  return false;
}

export function checkPassword(inp: PasswordPolicyInputs): PasswordPolicyResult {
  const p = typeof inp.password === 'string' ? inp.password : '';
  const minLen = inp.minLen ?? 12;
  const maxLen = inp.maxLen ?? 128;
  const issues: PasswordPolicyIssue[] = [];

  if (p.length < minLen) issues.push('too_short');
  if (p.length > maxLen) issues.push('too_long');
  if (!/[A-Z]/.test(p)) issues.push('missing_upper');
  if (!/[a-z]/.test(p)) issues.push('missing_lower');
  if (!/[0-9]/.test(p)) issues.push('missing_digit');
  if (!/[^A-Za-z0-9]/.test(p)) issues.push('missing_symbol');

  if (inp.commonList?.some(c => c.toLowerCase() === p.toLowerCase())) issues.push('common');

  if (inp.personal?.length) {
    const lc = p.toLowerCase();
    for (const piece of inp.personal) {
      if (typeof piece === 'string' && piece.length >= 3 && lc.includes(piece.toLowerCase())) {
        issues.push('contains_personal');
        break;
      }
    }
  }

  if (hasLongRun(p)) issues.push('repeats');
  if (hasSequential(p)) issues.push('sequential');

  const score = Math.max(0, 4 - Math.min(4, issues.length)) as 0 | 1 | 2 | 3 | 4;
  return { ok: issues.length === 0, issues, score };
}
