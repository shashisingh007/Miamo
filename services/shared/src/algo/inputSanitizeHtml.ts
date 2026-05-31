/**
 * inputSanitizeHtml \u2014 Phase 20 OWASP A03 conservative HTML sanitizer (pure).
 *
 * Strips script/style/iframe/object elements and dangerous attributes
 * (event handlers, javascript: / data: URIs) from untrusted strings
 * before they hit any HTML surface. Allow-list based; everything not
 * explicitly permitted is escaped.
 *
 * Not a replacement for a full DOMPurify pass; meant for server-side
 * defense-in-depth on small fields (display names, bios).
 */
const ALLOWED_TAGS = new Set(['b', 'i', 'em', 'strong', 'br', 'p', 'span', 'a']);
const ALLOWED_ATTRS_BY_TAG: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'title', 'rel']),
  span: new Set(['title']),
  p: new Set([]),
};
const SAFE_URL = /^(https?:|mailto:|#|\/)/i;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

function sanitizeAttrs(tag: string, raw: string): string {
  const allowed = ALLOWED_ATTRS_BY_TAG[tag] ?? new Set<string>();
  const out: string[] = [];
  const re = /([a-zA-Z][a-zA-Z0-9_\-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    if (!allowed.has(name)) continue;
    const value = (m[3] ?? m[4] ?? '').trim();
    if ((name === 'href') && !SAFE_URL.test(value)) continue;
    out.push(`${name}="${escapeHtml(value)}"`);
  }
  if (tag === 'a' && !out.some((a) => a.startsWith('rel='))) {
    out.push('rel="noopener noreferrer"');
  }
  return out.length ? ' ' + out.join(' ') : '';
}

export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  // Drop dangerous blocks entirely (with content)
  let s = input.replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Drop unclosed dangerous open-tags too
  s = s.replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>/gi, '');

  // Now walk remaining tags
  return s.replace(/<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)/g, (full, close, tag, attrs, text) => {
    if (text !== undefined) return escapeHtml(text);
    const t = (tag as string).toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return '';
    if (close) return `</${t}>`;
    return `<${t}${sanitizeAttrs(t, attrs || '')}>`;
  });
}
