import { createHash } from 'node:crypto';

export type CanonicalJsonOptions = {
  readonly sortKeys?: boolean;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function canonicalize(value: unknown, sortKeys: boolean): string {
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value as number)) return 'null';
    return JSON.stringify(value);
  }
  if (t === 'boolean' || t === 'string') return JSON.stringify(value);
  if (t === 'bigint') return JSON.stringify((value as bigint).toString());
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalize(v, sortKeys)).join(',') + ']';
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    const ordered = sortKeys ? keys.slice().sort() : keys;
    const parts: string[] = [];
    for (const k of ordered) {
      parts.push(JSON.stringify(k) + ':' + canonicalize(value[k], sortKeys));
    }
    return '{' + parts.join(',') + '}';
  }
  return JSON.stringify(String(value));
}

export function canonicalJsonStringify(
  value: unknown,
  opts: CanonicalJsonOptions = {},
): string {
  const sortKeys = opts.sortKeys !== false;
  return canonicalize(value, sortKeys);
}

export function canonicalJsonHash(value: unknown): string {
  const s = canonicalJsonStringify(value);
  return createHash('sha256').update(s).digest('hex');
}
