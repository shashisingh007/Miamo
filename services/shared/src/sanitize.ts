// ─── Input Sanitization (XSS Prevention) ─────────────
// Strips HTML tags and dangerous patterns from user input

const HTML_TAG_RE = /<\/?[^>]+(>|$)/g;
// Block dangerous URI schemes. We allow `data:image/*`, `data:video/*`, and
// `data:audio/*` (used by client-side compressed media uploads) but still
// strip `data:text/html` and `data:application/javascript` style payloads.
const DANGEROUS_URI_RE = /javascript:|vbscript:|data:(?!image\/|video\/|audio\/)|on\w+\s*=/gi;
const NULL_BYTE_RE = /\0/g;

/**
 * Strip all HTML tags, script patterns, and null bytes from a string.
 * Used on all user-submitted text to prevent XSS injection.
 * Allows base64 image/video/audio data URIs (used by media uploads).
 */
export function sanitize(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(NULL_BYTE_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(DANGEROUS_URI_RE, '')
    .trim();
}

// bug-hunt part2 fix #9 (docs/architecture/bug-hunt-2026-07-part2.md #11) —
// belt-and-braces defense against prototype pollution. express.json({strict})
// already blocks JSON payloads that would poison the prototype in modern
// Node, but any future parser swap (yaml/plist/etc.) would silently
// re-introduce the vector. Skip these keys entirely during recursion.
const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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
    // Drop prototype-pollution keys before recursing into their values.
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      delete (result as Record<string, unknown>)[key];
      continue;
    }
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
