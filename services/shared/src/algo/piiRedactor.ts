/**
 * PII redactor: scrubs emails, phone numbers, credit-card-like sequences,
 * IPv4 / IPv6 addresses, and JWT-shaped tokens from free text.
 *
 * Designed for log scrubbing — best-effort, not a guarantee.
 */

export type PiiKind =
  | 'email'
  | 'phone'
  | 'credit_card'
  | 'ipv4'
  | 'ipv6'
  | 'jwt';

export interface PiiHit {
  kind: PiiKind;
  start: number;
  end: number;
  match: string;
}

export interface PiiRedactResult {
  text: string;
  hits: PiiHit[];
  counts: Record<PiiKind, number>;
}

export interface PiiRedactOptions {
  mask?: string; // default '[REDACTED:<kind>]'
  kinds?: ReadonlyArray<PiiKind>;
}

const PATTERNS: Array<{ kind: PiiKind; re: RegExp }> = [
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  // JWT before phone/credit_card so digit-rich segments don't get matched first
  { kind: 'jwt', re: /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  // IPs before phone so dotted-quads aren't swallowed by the phone pattern
  {
    kind: 'ipv4',
    re: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
  },
  {
    kind: 'ipv6',
    re: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
  },
  {
    kind: 'credit_card',
    re: /\b(?:\d[ -]?){13,19}\b/g,
  },
  // Phone: +? optional, with separators; 7–15 digits total
  {
    kind: 'phone',
    re: /(?<![\w.])\+?(?:\d[ \-().]?){6,14}\d(?![\w.])/g,
  },
];

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function defaultMask(kind: PiiKind): string {
  return `[REDACTED:${kind}]`;
}

function overlaps(a: PiiHit, b: { start: number; end: number }): boolean {
  return !(a.end <= b.start || a.start >= b.end);
}

export function detectPii(
  text: string,
  kinds?: ReadonlyArray<PiiKind>
): PiiHit[] {
  if (typeof text !== 'string' || text === '') return [];
  const allow = kinds ? new Set(kinds) : null;
  const hits: PiiHit[] = [];
  for (const { kind, re } of PATTERNS) {
    if (allow && !allow.has(kind)) continue;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      if (kind === 'credit_card') {
        const digits = raw.replace(/[^0-9]/g, '');
        if (digits.length < 13 || digits.length > 19) continue;
        if (!luhnValid(digits)) continue;
      }
      const hit: PiiHit = {
        kind,
        start: m.index,
        end: m.index + raw.length,
        match: raw,
      };
      if (hits.some((h) => overlaps(h, hit))) continue;
      hits.push(hit);
    }
  }
  hits.sort((a, b) => a.start - b.start);
  return hits;
}

export function redactPii(
  text: string,
  opts: PiiRedactOptions = {}
): PiiRedactResult {
  const counts: Record<PiiKind, number> = {
    email: 0,
    phone: 0,
    credit_card: 0,
    ipv4: 0,
    ipv6: 0,
    jwt: 0,
  };
  if (typeof text !== 'string' || text === '') {
    return { text: text ?? '', hits: [], counts };
  }
  const hits = detectPii(text, opts.kinds);
  if (hits.length === 0) return { text, hits, counts };
  let out = '';
  let cur = 0;
  for (const h of hits) {
    out += text.slice(cur, h.start);
    out += opts.mask ?? defaultMask(h.kind);
    cur = h.end;
    counts[h.kind]++;
  }
  out += text.slice(cur);
  return { text: out, hits, counts };
}
