import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUserText, safeUrl } from '../sanitize';

describe('escapeHtml', () => {
  it('escapes &, <, >, ", \', /, `', () => {
    expect(escapeHtml('<script>alert("x")</script>'))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;');
  });
  it('returns "" for null/undefined', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });
  it('coerces non-strings', () => {
    expect(escapeHtml(42 as unknown as string)).toBe('42');
  });
});

describe('sanitizeUserText', () => {
  it('escapes HTML in user bios', () => {
    const out = sanitizeUserText('I love <3 hiking');
    expect(out).toBe('I love &lt;3 hiking');
  });
  it('collapses runs of whitespace', () => {
    expect(sanitizeUserText('hello   \n\n   world')).toBe('hello world');
  });
  it('strips control chars', () => {
    expect(sanitizeUserText('hi\u0000\u0001there')).toBe('hi there');
  });
  it('truncates to maxLen', () => {
    const big = 'a'.repeat(10_000);
    expect(sanitizeUserText(big, { maxLen: 100 }).length).toBeLessThanOrEqual(100);
  });
  it('returns "" for null/undefined', () => {
    expect(sanitizeUserText(null)).toBe('');
    expect(sanitizeUserText(undefined)).toBe('');
  });
  it('coerces non-string input', () => {
    expect(sanitizeUserText(123)).toBe('123');
  });
});

describe('safeUrl', () => {
  it('allows http/https/mailto/tel', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com');
    expect(safeUrl('http://example.com')).toBe('http://example.com');
    expect(safeUrl('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(safeUrl('tel:+15551234')).toBe('tel:+15551234');
  });
  it('rejects javascript:, vbscript:, data:, file:', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(safeUrl('vbscript:msgbox')).toBeNull();
    expect(safeUrl('data:text/html,<script>')).toBeNull();
    expect(safeUrl('file:///etc/passwd')).toBeNull();
  });
  it('allows same-origin paths', () => {
    expect(safeUrl('/profile/me')).toBe('/profile/me');
    expect(safeUrl('#section')).toBe('#section');
    expect(safeUrl('?tab=2')).toBe('?tab=2');
  });
  it('rejects bare hostnames (no scheme)', () => {
    expect(safeUrl('evil.com')).toBeNull();
  });
  it('rejects empty / null / control-char URLs', () => {
    expect(safeUrl(null)).toBeNull();
    expect(safeUrl('')).toBeNull();
    expect(safeUrl('   ')).toBeNull();
    expect(safeUrl('http\u0000://x')).toBeNull();
  });
});
