// RFC 6570 URI Template expander — Levels 1, 2, 3 (subset).
// Supports operators: '' (simple), '+' (reserved), '#' (fragment), '.', '/', ';', '?', '&'
// Modifiers: explode (*), prefix (:n). Multi-variable lists supported.

export type UriTemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>
  | Record<string, string | number | boolean>;

export type UriTemplateVars = Record<string, UriTemplateValue>;

interface OpSpec {
  first: string;
  sep: string;
  named: boolean;
  ifEmpty: string;
  allowReserved: boolean;
}

const OPS: Record<string, OpSpec> = {
  '': { first: '', sep: ',', named: false, ifEmpty: '', allowReserved: false },
  '+': { first: '', sep: ',', named: false, ifEmpty: '', allowReserved: true },
  '#': { first: '#', sep: ',', named: false, ifEmpty: '', allowReserved: true },
  '.': { first: '.', sep: '.', named: false, ifEmpty: '', allowReserved: false },
  '/': { first: '/', sep: '/', named: false, ifEmpty: '', allowReserved: false },
  ';': { first: ';', sep: ';', named: true, ifEmpty: '', allowReserved: false },
  '?': { first: '?', sep: '&', named: true, ifEmpty: '=', allowReserved: false },
  '&': { first: '&', sep: '&', named: true, ifEmpty: '=', allowReserved: false },
};

const RESERVED_RE = /[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=]/;
const UNRESERVED_RE = /[A-Za-z0-9\-._~]/;

function pctEncode(s: string, allowReserved: boolean): string {
  let out = '';
  // encodeURIComponent over each char then post-decode reserved chars when allowReserved
  for (const ch of s) {
    const allowed = allowReserved ? RESERVED_RE.test(ch) : UNRESERVED_RE.test(ch);
    if (allowed) {
      out += ch;
    } else {
      out += encodeURIComponent(ch).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    }
  }
  return out;
}

function isDefined(v: UriTemplateValue): v is NonNullable<UriTemplateValue> {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

function strVal(v: string | number | boolean): string {
  return String(v);
}

function expandVar(
  name: string,
  modifier: '' | '*' | { prefix: number },
  value: UriTemplateValue,
  op: OpSpec
): string | null {
  if (!isDefined(value)) return null;
  const explode = modifier === '*';
  const prefix = typeof modifier === 'object' ? modifier.prefix : null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    let s = strVal(value);
    if (prefix !== null) s = s.slice(0, prefix);
    const encoded = pctEncode(s, op.allowReserved);
    if (op.named) {
      return name + (encoded === '' ? op.ifEmpty : '=' + encoded);
    }
    return encoded;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const encoded = value.map((x) => pctEncode(strVal(x), op.allowReserved));
    if (!explode) {
      const joined = encoded.join(',');
      return op.named ? name + (joined === '' ? op.ifEmpty : '=' + joined) : joined;
    }
    // explode
    if (op.named) {
      return encoded.map((e) => name + (e === '' ? op.ifEmpty : '=' + e)).join(op.sep);
    }
    return encoded.join(op.sep);
  }

  // object (assoc)
  const entries = Object.entries(value);
  if (entries.length === 0) return null;
  if (!explode) {
    const flat = entries.flatMap(([k, v]) => [pctEncode(k, op.allowReserved), pctEncode(strVal(v), op.allowReserved)]);
    const joined = flat.join(',');
    return op.named ? name + (joined === '' ? op.ifEmpty : '=' + joined) : joined;
  }
  // explode object => k=v pairs
  return entries
    .map(([k, v]) => pctEncode(k, op.allowReserved) + '=' + pctEncode(strVal(v), op.allowReserved))
    .join(op.sep);
}

const TEMPLATE_RE = /\{([+#./;?&]?)([^}]+)\}/g;

export function expandUriTemplate(template: string, vars: UriTemplateVars): string {
  if (typeof template !== 'string') throw new TypeError('template must be a string');
  return template.replace(TEMPLATE_RE, (_match, opChar: string, spec: string) => {
    const op = OPS[opChar];
    const items: string[] = [];
    for (const raw of spec.split(',')) {
      let name = raw;
      let modifier: '' | '*' | { prefix: number } = '';
      if (name.endsWith('*')) {
        modifier = '*';
        name = name.slice(0, -1);
      } else {
        const colon = name.indexOf(':');
        if (colon !== -1) {
          const n = Number(name.slice(colon + 1));
          if (!Number.isFinite(n) || n < 0 || n > 10000) throw new Error('invalid prefix modifier');
          modifier = { prefix: n };
          name = name.slice(0, colon);
        }
      }
      const expanded = expandVar(name, modifier, vars[name], op);
      if (expanded !== null) items.push(expanded);
    }
    if (items.length === 0) return '';
    return op.first + items.join(op.sep);
  });
}

export function listUriTemplateVars(template: string): string[] {
  if (typeof template !== 'string') return [];
  const seen = new Set<string>();
  for (const m of template.matchAll(TEMPLATE_RE)) {
    for (const raw of m[2].split(',')) {
      let name = raw;
      if (name.endsWith('*')) name = name.slice(0, -1);
      const colon = name.indexOf(':');
      if (colon !== -1) name = name.slice(0, colon);
      seen.add(name);
    }
  }
  return [...seen];
}
