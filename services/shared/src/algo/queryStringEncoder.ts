// WHATWG-compatible query-string codec — additive infra. New symbols only.

export type QueryPrimitive = string | number | boolean | null | undefined;
export type QueryValue = QueryPrimitive | ReadonlyArray<QueryPrimitive>;
export interface QueryObject {
  readonly [key: string]: QueryValue;
}

export interface EncodeQueryStringOptions {
  // Include keys whose value is null/undefined as bare keys (key=). Default false (omit).
  includeNullish?: boolean;
  // Sort keys alphabetically for stable output. Default false (insertion order).
  sortKeys?: boolean;
  // Skip empty arrays. Default true.
  skipEmptyArrays?: boolean;
}

function encodeComponent(v: string): string {
  // application/x-www-form-urlencoded uses '+' for space; encodeURIComponent uses %20.
  return encodeURIComponent(v).replace(/%20/g, '+');
}

function decodeComponent(v: string): string {
  return decodeURIComponent(v.replace(/\+/g, ' '));
}

function stringifyValue(v: QueryPrimitive): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return null;
}

export function encodeQueryString(obj: QueryObject, opts: EncodeQueryStringOptions = {}): string {
  const includeNullish = opts.includeNullish ?? false;
  const skipEmptyArrays = opts.skipEmptyArrays ?? true;
  const keys = Object.keys(obj);
  if (opts.sortKeys) keys.sort();
  const parts: string[] = [];
  for (const k of keys) {
    const ek = encodeComponent(k);
    const value = obj[k];
    if (Array.isArray(value)) {
      if (value.length === 0 && skipEmptyArrays) continue;
      for (const item of value) {
        const s = stringifyValue(item);
        if (s === null) {
          if (includeNullish) parts.push(ek + '=');
          continue;
        }
        parts.push(ek + '=' + encodeComponent(s));
      }
    } else {
      const s = stringifyValue(value as QueryPrimitive);
      if (s === null) {
        if (includeNullish) parts.push(ek + '=');
        continue;
      }
      parts.push(ek + '=' + encodeComponent(s));
    }
  }
  return parts.join('&');
}

export interface DecodedQueryString {
  [key: string]: string | string[];
}

export function decodeQueryString(input: string): DecodedQueryString {
  if (typeof input !== 'string') throw new Error('input must be a string');
  const s = input.startsWith('?') ? input.slice(1) : input;
  const out: DecodedQueryString = {};
  if (!s) return out;
  const segs = s.split('&');
  for (const seg of segs) {
    if (!seg) continue;
    const eq = seg.indexOf('=');
    let rawKey: string;
    let rawVal: string;
    if (eq < 0) {
      rawKey = seg;
      rawVal = '';
    } else {
      rawKey = seg.slice(0, eq);
      rawVal = seg.slice(eq + 1);
    }
    let key: string;
    let val: string;
    try {
      key = decodeComponent(rawKey);
      val = decodeComponent(rawVal);
    } catch {
      // malformed escape — skip this segment
      continue;
    }
    if (key in out) {
      const existing = out[key];
      if (Array.isArray(existing)) existing.push(val);
      else out[key] = [existing, val];
    } else {
      out[key] = val;
    }
  }
  return out;
}
