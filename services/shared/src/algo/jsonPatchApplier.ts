/**
 * RFC 6902 JSON Patch (add, remove, replace, move, copy, test) over plain
 * JSON values. Operates immutably (returns a fresh document).
 *
 * Paths use JSON Pointer (RFC 6901) with `/` and `-` (end-of-array) tokens.
 * Returns `{ ok: true, doc }` on success or `{ ok: false, op, index, reason }`
 * on the first failing operation (atomic; failed patches do not partial-apply).
 */

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export type JsonPatchOp =
  | { op: 'add'; path: string; value: JsonValue }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: JsonValue }
  | { op: 'move'; path: string; from: string }
  | { op: 'copy'; path: string; from: string }
  | { op: 'test'; path: string; value: JsonValue };

export type JsonPatchFailure =
  | 'path_not_found'
  | 'invalid_path'
  | 'invalid_index'
  | 'invalid_op'
  | 'test_failed'
  | 'move_into_self';

export type JsonPatchResult =
  | { ok: true; doc: JsonValue }
  | { ok: false; op: JsonPatchOp | null; index: number; reason: JsonPatchFailure };

function clone<T extends JsonValue>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => clone(x as JsonValue)) as unknown as T;
  const out: Record<string, JsonValue> = {};
  for (const [k, val] of Object.entries(v)) out[k] = clone(val as JsonValue);
  return out as unknown as T;
}

function parsePointer(path: string): string[] | null {
  if (typeof path !== 'string') return null;
  if (path === '') return [];
  if (path[0] !== '/') return null;
  return path
    .slice(1)
    .split('/')
    .map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function deepEquals(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i] as JsonValue)) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEquals((a as Record<string, JsonValue>)[k], (b as Record<string, JsonValue>)[k]))
      return false;
  }
  return true;
}

function isArrayIndex(token: string, len: number, allowAppend: boolean): number | null {
  if (token === '-') return allowAppend ? len : null;
  if (!/^(0|[1-9]\d*)$/.test(token)) return null;
  const n = Number(token);
  if (allowAppend) return n <= len ? n : null;
  return n < len ? n : null;
}

function getAt(doc: JsonValue, tokens: string[]): { ok: true; value: JsonValue } | { ok: false } {
  let cur: JsonValue = doc;
  for (const t of tokens) {
    if (Array.isArray(cur)) {
      const i = isArrayIndex(t, cur.length, false);
      if (i == null) return { ok: false };
      cur = cur[i];
    } else if (cur !== null && typeof cur === 'object') {
      if (!Object.prototype.hasOwnProperty.call(cur, t)) return { ok: false };
      cur = (cur as Record<string, JsonValue>)[t];
    } else {
      return { ok: false };
    }
  }
  return { ok: true, value: cur };
}

function setAt(
  doc: JsonValue,
  tokens: string[],
  value: JsonValue,
  mode: 'add' | 'replace' | 'remove'
): { ok: true; doc: JsonValue; removed?: JsonValue } | { ok: false; reason: JsonPatchFailure } {
  if (tokens.length === 0) {
    if (mode === 'remove') return { ok: false, reason: 'invalid_op' };
    return { ok: true, doc: clone(value) };
  }
  const newDoc = clone(doc);
  const parentTokens = tokens.slice(0, -1);
  const leaf = tokens[tokens.length - 1];
  // walk to parent in newDoc
  let parent: JsonValue = newDoc;
  for (const t of parentTokens) {
    if (Array.isArray(parent)) {
      const i = isArrayIndex(t, parent.length, false);
      if (i == null) return { ok: false, reason: 'path_not_found' };
      parent = parent[i];
    } else if (parent !== null && typeof parent === 'object') {
      if (!Object.prototype.hasOwnProperty.call(parent, t))
        return { ok: false, reason: 'path_not_found' };
      parent = (parent as Record<string, JsonValue>)[t];
    } else {
      return { ok: false, reason: 'path_not_found' };
    }
  }
  if (Array.isArray(parent)) {
    if (mode === 'add') {
      const i = isArrayIndex(leaf, parent.length, true);
      if (i == null) return { ok: false, reason: 'invalid_index' };
      parent.splice(i, 0, clone(value));
      return { ok: true, doc: newDoc };
    }
    if (mode === 'replace') {
      const i = isArrayIndex(leaf, parent.length, false);
      if (i == null) return { ok: false, reason: 'invalid_index' };
      parent[i] = clone(value);
      return { ok: true, doc: newDoc };
    }
    // remove
    const i = isArrayIndex(leaf, parent.length, false);
    if (i == null) return { ok: false, reason: 'invalid_index' };
    const [removed] = parent.splice(i, 1);
    return { ok: true, doc: newDoc, removed };
  }
  if (parent !== null && typeof parent === 'object') {
    const obj = parent as Record<string, JsonValue>;
    if (mode === 'add' || mode === 'replace') {
      if (mode === 'replace' && !Object.prototype.hasOwnProperty.call(obj, leaf)) {
        return { ok: false, reason: 'path_not_found' };
      }
      obj[leaf] = clone(value);
      return { ok: true, doc: newDoc };
    }
    if (!Object.prototype.hasOwnProperty.call(obj, leaf))
      return { ok: false, reason: 'path_not_found' };
    const removed = obj[leaf];
    delete obj[leaf];
    return { ok: true, doc: newDoc, removed };
  }
  return { ok: false, reason: 'path_not_found' };
}

export function applyJsonPatch(
  doc: JsonValue,
  patch: readonly JsonPatchOp[]
): JsonPatchResult {
  let cur: JsonValue = clone(doc);
  for (let i = 0; i < patch.length; i++) {
    const op = patch[i];
    const tokens = parsePointer(op.path);
    if (tokens === null) return { ok: false, op, index: i, reason: 'invalid_path' };
    switch (op.op) {
      case 'add': {
        const r = setAt(cur, tokens, op.value, 'add');
        if (!r.ok) return { ok: false, op, index: i, reason: r.reason };
        cur = r.doc;
        break;
      }
      case 'replace': {
        const r = setAt(cur, tokens, op.value, 'replace');
        if (!r.ok) return { ok: false, op, index: i, reason: r.reason };
        cur = r.doc;
        break;
      }
      case 'remove': {
        const r = setAt(cur, tokens, null, 'remove');
        if (!r.ok) return { ok: false, op, index: i, reason: r.reason };
        cur = r.doc;
        break;
      }
      case 'test': {
        const g = getAt(cur, tokens);
        if (!g.ok) return { ok: false, op, index: i, reason: 'path_not_found' };
        if (!deepEquals(g.value, op.value))
          return { ok: false, op, index: i, reason: 'test_failed' };
        break;
      }
      case 'move': {
        const fromTokens = parsePointer(op.from);
        if (fromTokens === null)
          return { ok: false, op, index: i, reason: 'invalid_path' };
        if (
          fromTokens.length <= tokens.length &&
          fromTokens.every((t, idx) => t === tokens[idx])
        ) {
          return { ok: false, op, index: i, reason: 'move_into_self' };
        }
        const removed = setAt(cur, fromTokens, null, 'remove');
        if (!removed.ok) return { ok: false, op, index: i, reason: removed.reason };
        const added = setAt(removed.doc, tokens, removed.removed!, 'add');
        if (!added.ok) return { ok: false, op, index: i, reason: added.reason };
        cur = added.doc;
        break;
      }
      case 'copy': {
        const fromTokens = parsePointer(op.from);
        if (fromTokens === null)
          return { ok: false, op, index: i, reason: 'invalid_path' };
        const g = getAt(cur, fromTokens);
        if (!g.ok) return { ok: false, op, index: i, reason: 'path_not_found' };
        const added = setAt(cur, tokens, clone(g.value), 'add');
        if (!added.ok) return { ok: false, op, index: i, reason: added.reason };
        cur = added.doc;
        break;
      }
      default:
        return { ok: false, op, index: i, reason: 'invalid_op' };
    }
  }
  return { ok: true, doc: cur };
}
