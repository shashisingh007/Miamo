/**
 * Phase 20 \u2014 HTML/XSS sanitiser for user-authored text (OWASP A03).
 *
 * Used for messages, bios, profile fields, anywhere we render user input.
 * Strategy: escape, don't strip. We want bios containing `<3` to render
 * as `<3`, not silently lose characters. Then we collapse whitespace and
 * trim to a max length so a single user can't blow up the renderer.
 *
 * For richer content (links, emoji) the rendering layer applies an
 * allow-list AFTER sanitisation. This module is the safe baseline.
 *
 * Pure: returns a new string; never mutates input.
 */

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

const DEFAULT_MAX_LEN = 4096;

export type SanitizeOptions = {
  maxLen?: number;
  /** Collapse runs of whitespace into a single space. Default true. */
  collapseWhitespace?: boolean;
  /** Strip control chars (U+0000\u2013U+001F, U+007F). Default true. */
  stripControl?: boolean;
};

export function escapeHtml(input: string): string {
  if (input == null) return '';
  return String(input).replace(/[&<>"'/`]/g, (ch) => ENTITIES[ch] ?? ch);
}

export function sanitizeUserText(input: unknown, opts: SanitizeOptions = {}): string {
  if (input == null) return '';
  let s = String(input);

  if (opts.stripControl !== false) {
    // eslint-disable-next-line no-control-regex
    s = s.replace(/[\u0000-\u001F\u007F]+/g, ' ');
  }
  if (opts.collapseWhitespace !== false) {
    s = s.replace(/\s+/g, ' ').trim();
  }
  const maxLen = opts.maxLen ?? DEFAULT_MAX_LEN;
  if (s.length > maxLen) s = s.slice(0, maxLen);

  return escapeHtml(s);
}

/** Strips dangerous protocols from a URL string; returns null if unsafe.
 *  Allows http, https, mailto, tel. Everything else (javascript:, data:,
 *  vbscript:, file:) is rejected. */
export function safeUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:')) return null;
  if (lower.startsWith('vbscript:'))   return null;
  if (lower.startsWith('data:'))       return null;
  if (lower.startsWith('file:'))       return null;
  // Allow protocol-relative + same-origin paths.
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // Bare hostnames (no scheme) \u2014 reject; caller can prepend https:// if intended.
  return null;
}
