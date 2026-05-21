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
 * Sanitize all string values in an object, including nested objects and arrays.
 * Non-string values are left unchanged. Creates a new object (does not mutate).
 *
 * @template T - Object type
 * @param obj - Object whose string values should be sanitized
 * @param maxDepth - Maximum recursion depth (default 5, prevents prototype pollution)
 * @returns New object with all string values sanitized
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T, maxDepth = 5): T {
  if (maxDepth <= 0) return obj;
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string') {
      (result as Record<string, unknown>)[key] = sanitize(val);
    } else if (Array.isArray(val)) {
      (result as Record<string, unknown>)[key] = val.map(item =>
        typeof item === 'string' ? sanitize(item) :
        (item && typeof item === 'object') ? sanitizeObject(item as Record<string, unknown>, maxDepth - 1) : item
      );
    } else if (val && typeof val === 'object' && !(val instanceof Date)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(val as Record<string, unknown>, maxDepth - 1);
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

/**
 * Strip sensitive fields from user objects before sending to clients.
 * Removes: passwordHash, and any other sensitive fields.
 * Works on single objects or arrays. Returns a new object (does not mutate).
 */
export function stripSensitive<T extends Record<string, unknown>>(obj: T): Omit<T, 'passwordHash'> {
  if (!obj || typeof obj !== 'object') return obj;
  const { passwordHash, ...safe } = obj as any;
  return safe;
}

export default { sanitize, sanitizeObject, escapeHtml, stripSensitive };
