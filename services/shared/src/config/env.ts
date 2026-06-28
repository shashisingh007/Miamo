/**
 * Phase 13 \u2014 boot-time env-var validator.
 *
 * Run once at service start; throw a clear error before the server begins
 * listening. Prevents silent misconfiguration (e.g. CSRF_SECRET unset in
 * staging \u2192 token verification silently returns false).
 *
 * Pure validator: takes a `Record<string,string|undefined>` (caller passes
 * `process.env`) and a schema describing each required var. Returns a
 * report; caller decides whether to throw.
 */

export type EnvRule =
  | { kind: 'string';  required: boolean; minLen?: number; pattern?: RegExp }
  | { kind: 'number';  required: boolean; min?: number; max?: number }
  | { kind: 'boolean'; required: boolean }
  | { kind: 'enum';    required: boolean; values: ReadonlyArray<string> };

export type EnvSchema = Record<string, EnvRule>;

export type EnvIssue = { name: string; code: string; detail: string };
export type EnvReport = { ok: boolean; issues: EnvIssue[]; values: Record<string, unknown> };

const TRUE  = new Set(['1', 'true', 'yes', 'on']);
const FALSE = new Set(['0', 'false', 'no', 'off']);

export function validateEnv(env: Record<string, string | undefined>, schema: EnvSchema): EnvReport {
  const issues: EnvIssue[] = [];
  const values: Record<string, unknown> = {};

  for (const [name, rule] of Object.entries(schema)) {
    const raw = env[name];
    if (raw == null || raw === '') {
      if (rule.required) issues.push({ name, code: 'missing', detail: 'required env var unset' });
      continue;
    }
    const parsed = parseValue(name, raw, rule, issues);
    if (parsed !== undefined) values[name] = parsed;
  }
  return { ok: issues.length === 0, issues, values };
}

function parseValue(name: string, raw: string, rule: EnvRule, issues: EnvIssue[]): unknown {
  switch (rule.kind) {
    case 'string': {
      if (rule.minLen != null && raw.length < rule.minLen) {
        issues.push({ name, code: 'too_short', detail: `min length ${rule.minLen}, got ${raw.length}` });
        return undefined;
      }
      if (rule.pattern && !rule.pattern.test(raw)) {
        issues.push({ name, code: 'pattern_mismatch', detail: `does not match ${rule.pattern}` });
        return undefined;
      }
      return raw;
    }
    case 'number': {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        issues.push({ name, code: 'not_a_number', detail: `value=${raw}` });
        return undefined;
      }
      if (rule.min != null && n < rule.min) {
        issues.push({ name, code: 'below_min', detail: `min=${rule.min}, got ${n}` });
        return undefined;
      }
      if (rule.max != null && n > rule.max) {
        issues.push({ name, code: 'above_max', detail: `max=${rule.max}, got ${n}` });
        return undefined;
      }
      return n;
    }
    case 'boolean': {
      const lower = raw.toLowerCase();
      if (TRUE.has(lower))  return true;
      if (FALSE.has(lower)) return false;
      issues.push({ name, code: 'not_a_boolean', detail: `value=${raw}` });
      return undefined;
    }
    case 'enum': {
      if (!rule.values.includes(raw)) {
        issues.push({ name, code: 'not_in_enum', detail: `allowed=${rule.values.join(',')}, got ${raw}` });
        return undefined;
      }
      return raw;
    }
  }
}

/** Convenience: throw a formatted error if the report is not ok. */
export function assertEnv(report: EnvReport): void {
  if (report.ok) return;
  const lines = report.issues.map((i) => `  - ${i.name}: ${i.code} (${i.detail})`);
  throw new Error(`Environment validation failed:\n${lines.join('\n')}`);
}
