/**
 * HTML entity encoder for XSS-safe interpolation into HTML text or attribute values.
 *
 * - `encodeHtmlText`: escapes & < > " ' for use in text or double-quoted attrs.
 * - `encodeHtmlAttribute`: escapes the same set + backtick (IE legacy) + equals
 *   when the attribute will be emitted unquoted. Prefer always-quoted attrs.
 * - `stripHtmlTags`: pure-text fallback that drops `<tag …>` patterns.
 *
 * NEVER use these to build `<script>` bodies, `style` content, `href="javascript:…"`,
 * or any URL contexts — those require URL-encoding or context-specific escaping.
 */

const NAMED: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;',
  '/': '&#x2F;',
  ' ': '&#x20;',
};

const TEXT_RE = /[&<>"']/g;
const ATTR_RE = /[&<>"'`= /]/g;

function escape(re: RegExp, s: string): string {
  return s.replace(re, (ch) => NAMED[ch] ?? ch);
}

export function encodeHtmlText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const s = typeof input === 'string' ? input : String(input);
  return escape(TEXT_RE, s);
}

export function encodeHtmlAttribute(input: unknown): string {
  if (input === null || input === undefined) return '';
  const s = typeof input === 'string' ? input : String(input);
  return escape(ATTR_RE, s);
}

export function stripHtmlTags(input: unknown): string {
  if (input === null || input === undefined) return '';
  const s = typeof input === 'string' ? input : String(input);
  // strip `<...>` greedily but non-greedy on `>` to avoid eating adjacent text
  return s.replace(/<[^>]*>/g, '');
}

const NAMED_DECODE: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export function decodeHtmlEntities(input: unknown): string {
  if (input === null || input === undefined) return '';
  const s = typeof input === 'string' ? input : String(input);
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (m, raw: string) => {
    if (raw[0] === '#') {
      const isHex = raw[1] === 'x' || raw[1] === 'X';
      const codeStr = isHex ? raw.slice(2) : raw.slice(1);
      const code = parseInt(codeStr, isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return m;
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    return NAMED_DECODE[raw] ?? m;
  });
}
