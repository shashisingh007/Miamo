export type RfcEmailValidation = {
  readonly valid: boolean;
  readonly normalized: string | null;
  readonly local: string | null;
  readonly domain: string | null;
  readonly reason?:
    | 'not_a_string'
    | 'empty'
    | 'too_long'
    | 'missing_at'
    | 'multiple_at'
    | 'empty_local'
    | 'empty_domain'
    | 'local_too_long'
    | 'invalid_local'
    | 'invalid_domain'
    | 'consecutive_dot'
    | 'leading_or_trailing_dot';
};

const MAX_TOTAL = 254;
const MAX_LOCAL = 64;
const MAX_LABEL = 63;
const LOCAL_CHAR = /^[A-Za-z0-9._%+\-]+$/;
const LABEL_CHAR = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function bad(reason: RfcEmailValidation['reason']): RfcEmailValidation {
  return { valid: false, normalized: null, local: null, domain: null, reason };
}

export function validateEmail(raw: unknown): RfcEmailValidation {
  if (typeof raw !== 'string') return bad('not_a_string');
  const trimmed = raw.trim();
  if (trimmed.length === 0) return bad('empty');
  if (trimmed.length > MAX_TOTAL) return bad('too_long');
  const atCount = (trimmed.match(/@/g) ?? []).length;
  if (atCount === 0) return bad('missing_at');
  if (atCount > 1) return bad('multiple_at');
  const atIdx = trimmed.lastIndexOf('@');
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1).toLowerCase();
  if (local.length === 0) return bad('empty_local');
  if (domain.length === 0) return bad('empty_domain');
  if (local.length > MAX_LOCAL) return bad('local_too_long');
  if (!LOCAL_CHAR.test(local)) return bad('invalid_local');
  if (local.startsWith('.') || local.endsWith('.')) return bad('leading_or_trailing_dot');
  if (local.includes('..')) return bad('consecutive_dot');
  const labels = domain.split('.');
  if (labels.length < 2) return bad('invalid_domain');
  for (const label of labels) {
    if (label.length === 0 || label.length > MAX_LABEL) return bad('invalid_domain');
    if (!LABEL_CHAR.test(label)) return bad('invalid_domain');
  }
  return {
    valid: true,
    normalized: `${local}@${domain}`,
    local,
    domain,
  };
}
