/**
 * Phase 20 — PII redactor for structured logs.
 *
 * Defence-in-depth: even when we *think* a code path doesn't log PII, this
 * redactor sits between the app and the log sink. It walks JSON-safe values
 * and replaces field values whose key matches a blocklist (case-insensitive
 * substring match), plus pattern-based redaction for email + phone shaped
 * strings anywhere in the tree.
 *
 * Pure: produces a new value; does not mutate input.
 */

const KEY_BLOCKLIST = [
  'password', 'passwd', 'secret', 'token', 'authorization', 'cookie',
  'apikey', 'api_key', 'sessionid', 'jwt', 'ssn',
  'email', 'phone', 'mobile',
  'firstname', 'first_name', 'lastname', 'last_name', 'fullname', 'full_name',
  'address', 'dob', 'birthdate', 'birth_date',
  'card', 'cvv', 'iban', 'pan',
];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?<!\d)\+?\d[\d\s().-]{7,16}\d(?!\d)/g;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 12;

export function redactPII(value: unknown): unknown {
  return walk(value, 0, '');
}

function walk(v: unknown, depth: number, key: string): unknown {
  if (depth > MAX_DEPTH) return '[DEPTH]';
  if (v == null) return v;
  if (isKeyRedacted(key)) return REDACTED;

  if (typeof v === 'string')  return redactString(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v))       return v.map((item) => walk(item, depth + 1, key));

  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = walk(val, depth + 1, k);
    }
    return out;
  }
  return v;
}

function isKeyRedacted(key: string): boolean {
  if (!key) return false;
  const k = key.toLowerCase();
  return KEY_BLOCKLIST.some((bad) => k.includes(bad));
}

function redactString(s: string): string {
  return s.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED);
}

export const PII_KEY_BLOCKLIST = KEY_BLOCKLIST;
