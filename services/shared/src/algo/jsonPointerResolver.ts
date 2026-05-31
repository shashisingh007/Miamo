// RFC 6901 JSON Pointer resolver — pure read + structural set.
// Pointer grammar: "" | "/" reference-token ( "/" reference-token )*
// Reference-token unescape: "~1" -> "/", "~0" -> "~"

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

function parsePointer(pointer: string): string[] {
  if (typeof pointer !== 'string') throw new TypeError('pointer must be a string');
  if (pointer === '') return [];
  if (pointer[0] !== '/') throw new Error('JSON pointer must start with "/" or be empty');
  return pointer
    .slice(1)
    .split('/')
    .map((tok) => tok.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function resolveJsonPointer(doc: JsonValue, pointer: string): JsonValue | undefined {
  const tokens = parsePointer(pointer);
  let cur: JsonValue | undefined = doc;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      if (t === '-') return undefined; // valid pointer, but no element
      if (!/^(0|[1-9]\d*)$/.test(t)) return undefined;
      const idx = Number(t);
      if (idx >= cur.length) return undefined;
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      if (!Object.prototype.hasOwnProperty.call(cur, t)) return undefined;
      cur = (cur as Record<string, JsonValue>)[t];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function hasJsonPointer(doc: JsonValue, pointer: string): boolean {
  const tokens = parsePointer(pointer);
  let cur: JsonValue = doc;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return false;
    if (Array.isArray(cur)) {
      if (!/^(0|[1-9]\d*)$/.test(t)) return false;
      const idx = Number(t);
      if (idx >= cur.length) return false;
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      if (!Object.prototype.hasOwnProperty.call(cur, t)) return false;
      cur = (cur as Record<string, JsonValue>)[t];
    } else {
      return false;
    }
  }
  return true;
}

export function escapeJsonPointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function buildJsonPointer(tokens: ReadonlyArray<string>): string {
  if (tokens.length === 0) return '';
  return '/' + tokens.map(escapeJsonPointerToken).join('/');
}

export function setJsonPointer(
  doc: JsonValue,
  pointer: string,
  value: JsonValue
): JsonValue {
  const tokens = parsePointer(pointer);
  if (tokens.length === 0) return value;
  // walk to parent
  let parent: any = doc;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    if (Array.isArray(parent)) {
      const idx = Number(t);
      if (!Number.isInteger(idx) || idx < 0 || idx >= parent.length) {
        throw new Error(`pointer path not found at /${tokens.slice(0, i + 1).join('/')}`);
      }
      parent = parent[idx];
    } else if (parent && typeof parent === 'object') {
      if (!Object.prototype.hasOwnProperty.call(parent, t)) {
        throw new Error(`pointer path not found at /${tokens.slice(0, i + 1).join('/')}`);
      }
      parent = parent[t];
    } else {
      throw new Error('cannot traverse non-container');
    }
  }
  const last = tokens[tokens.length - 1];
  if (Array.isArray(parent)) {
    if (last === '-') {
      parent.push(value);
    } else {
      const idx = Number(last);
      if (!Number.isInteger(idx) || idx < 0) throw new Error('invalid array index');
      parent[idx] = value;
    }
  } else if (parent && typeof parent === 'object') {
    parent[last] = value;
  } else {
    throw new Error('cannot set on non-container');
  }
  return doc;
}
