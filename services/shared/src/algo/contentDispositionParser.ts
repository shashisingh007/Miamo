// RFC 6266 Content-Disposition parser — minimal but spec-aware.

export interface ContentDispositionParsed {
  type: string; // 'inline' | 'attachment' | 'form-data' | other (lowercase)
  parameters: Record<string, string>; // lowercased keys
  filename: string | null;
}

const TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function decodeRfc5987(value: string): string | null {
  // charset'lang'encoded
  const m = /^([^']+)'([^']*)'(.+)$/.exec(value);
  if (!m) return null;
  const charset = m[1].toLowerCase();
  const encoded = m[3];
  if (charset !== 'utf-8' && charset !== 'iso-8859-1') return null;
  try {
    const bytes: number[] = [];
    for (let i = 0; i < encoded.length; ) {
      const c = encoded.charCodeAt(i);
      if (c === 0x25 /* % */) {
        const hex = encoded.slice(i + 1, i + 3);
        if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return null;
        bytes.push(parseInt(hex, 16));
        i += 3;
      } else {
        bytes.push(c & 0xff);
        i += 1;
      }
    }
    if (charset === 'utf-8') {
      const dec = new TextDecoder('utf-8', { fatal: false });
      return dec.decode(new Uint8Array(bytes));
    }
    // iso-8859-1
    return bytes.map((b) => String.fromCharCode(b)).join('');
  } catch {
    return null;
  }
}

export function parseContentDisposition(header: string): ContentDispositionParsed | null {
  if (typeof header !== 'string') return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  // split on ; respecting quoted strings
  const parts: string[] = [];
  let buf = '';
  let inQuotes = false;
  let escape = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) {
      buf += ch;
      escape = false;
      continue;
    }
    if (inQuotes) {
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        buf += ch;
        continue;
      }
      buf += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      buf += ch;
      continue;
    }
    if (ch === ';') {
      parts.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (inQuotes) return null;
  if (buf.length > 0) parts.push(buf);
  if (parts.length === 0) return null;
  const type = parts[0].trim().toLowerCase();
  if (!TOKEN.test(type)) return null;

  const params: Record<string, string> = {};
  const extParams: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].trim();
    if (!p) continue;
    const eq = p.indexOf('=');
    if (eq < 0) return null;
    const rawKey = p.slice(0, eq).trim().toLowerCase();
    let rawVal = p.slice(eq + 1).trim();
    if (!rawKey) return null;
    let key = rawKey;
    const isExt = key.endsWith('*');
    if (isExt) key = key.slice(0, -1);
    if (!TOKEN.test(key)) return null;
    let val: string;
    if (rawVal.startsWith('"') && rawVal.endsWith('"') && rawVal.length >= 2) {
      const inner = rawVal.slice(1, -1);
      let out = '';
      for (let j = 0; j < inner.length; j++) {
        const ch = inner[j];
        if (ch === '\\' && j + 1 < inner.length) {
          out += inner[j + 1];
          j++;
        } else {
          out += ch;
        }
      }
      val = out;
    } else {
      if (!rawVal || (!isExt && !/^[^\s"';]+$/.test(rawVal))) return null;
      val = rawVal;
    }
    if (isExt) {
      const decoded = decodeRfc5987(val);
      if (decoded !== null) extParams[key] = decoded;
    } else {
      params[key] = val;
    }
  }
  // RFC 6266: ext-form (filename*) takes precedence over plain (filename)
  const merged: Record<string, string> = { ...params };
  for (const k of Object.keys(extParams)) merged[k] = extParams[k];
  const filename = merged.filename ?? null;
  return { type, parameters: merged, filename };
}

export function isAttachmentDisposition(header: string): boolean {
  const p = parseContentDisposition(header);
  return p !== null && p.type === 'attachment';
}
