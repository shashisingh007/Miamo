// ─── Input Sanitization (XSS Prevention) ─────────────
// Strips HTML tags and dangerous patterns from user input

const HTML_TAG_RE = /<\/?[^>]+(>|$)/g;
const SCRIPT_RE = /javascript:|data:|vbscript:|on\w+\s*=/gi;
const NULL_BYTE_RE = /\0/g;

/**
 * Strip all HTML tags, script patterns, and null bytes from a string.
 * Used on all user-submitted text to prevent XSS injection.
 *
 * @param input - Raw user input string
 * @returns Sanitized string with tags/scripts removed and trimmed
 */
export function sanitize(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(NULL_BYTE_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(SCRIPT_RE, '')
    .trim();
}

/**
 * Sanitize all string values in a shallow object.
 * Non-string values are left unchanged. Creates a new object (does not mutate).
 *
 * @template T - Object type
 * @param obj - Object whose string values should be sanitized
 * @returns New object with all string values sanitized
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = sanitize(result[key] as string);
    }
  }
  return result;
}

/**
 * Escape special characters for safe HTML rendering.
 * Converts `&`, `<`, `>`, `"`, `'` to their HTML entity equivalents.
 *
 * @param str - String to escape
 * @returns HTML-safe escaped string
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default { sanitize, sanitizeObject, escapeHtml };
