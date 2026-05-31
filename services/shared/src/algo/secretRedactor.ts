/**
 * secretRedactor \u2014 Phase 20 OWASP A09 log-output secret redactor (pure).
 *
 * Replaces common secret-looking substrings before they hit logs or
 * error surfaces. Intentionally conservative: prefers false-positive
 * redaction over leaking a credential. Operates on strings only; pair
 * with `safeJson` for structured payloads.
 */
const PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  // Authorization: Bearer <token>
  { name: 'bearer', re: /(authorization\s*:\s*bearer\s+)([A-Za-z0-9._\-+/=]{8,})/gi },
  // JWT (three dot-separated base64url chunks, second segment long enough to be a real payload)
  { name: 'jwt', re: /\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{8,}\b/g },
  // Generic key=value with secret-y keys
  { name: 'kv', re: /\b(password|passwd|pwd|secret|api[_-]?key|token|access[_-]?key)\s*[=:]\s*["']?([^"'\s,;]{4,})["']?/gi },
  // Stripe-ish keys
  { name: 'stripe', re: /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{16,}\b/g },
  // AWS access key id
  { name: 'aws', re: /\bAKIA[0-9A-Z]{16}\b/g },
  // Common 32+ hex (often api keys/hashes) \u2014 only when preceded by key-ish context
  { name: 'hex32', re: /\b([a-f0-9]{32,})\b/g },
];

const MASK = '[REDACTED]';

export type RedactStats = { redactions: number; matched: string[] };

export function redactSecrets(input: string): string {
  return redactSecretsWithStats(input).output;
}

export function redactSecretsWithStats(input: string): { output: string; stats: RedactStats } {
  if (typeof input !== 'string' || input.length === 0) {
    return { output: input ?? '', stats: { redactions: 0, matched: [] } };
  }
  let out = input;
  const matched: string[] = [];
  let count = 0;
  for (const p of PATTERNS) {
    out = out.replace(p.re, (full, g1, g2) => {
      count++;
      matched.push(p.name);
      // Pattern with two capture groups (kv, bearer): preserve prefix
      if (typeof g1 === 'string' && typeof g2 === 'string' && full.includes(g2)) {
        return `${g1}${MASK}`;
      }
      return MASK;
    });
  }
  return { output: out, stats: { redactions: count, matched } };
}
