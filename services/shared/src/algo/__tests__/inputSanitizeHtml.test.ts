import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../inputSanitizeHtml';

describe('inputSanitizeHtml', () => {
  it('empty / non-string -> ""', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(undefined as any)).toBe('');
  });

  it('passes plain text through escaped', () => {
    expect(sanitizeHtml('hello & world')).toBe('hello &amp; world');
  });

  it('keeps allowed tags', () => {
    expect(sanitizeHtml('<b>hi</b> <i>x</i>')).toBe('<b>hi</b> <i>x</i>');
  });

  it('strips disallowed tags but keeps text', () => {
    expect(sanitizeHtml('<div>hi</div>')).toBe('hi');
  });

  it('removes <script> entirely', () => {
    const out = sanitizeHtml('safe<script>alert(1)</script>after');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('safe');
    expect(out).toContain('after');
  });

  it('removes <iframe>', () => {
    expect(sanitizeHtml('<iframe src="x"></iframe>')).toBe('');
  });

  it('strips event handler attributes', () => {
    const out = sanitizeHtml('<a href="https://x" onclick="evil()">x</a>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('href="https://x"');
  });

  it('rejects javascript: href', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript');
  });

  it('auto-adds rel=noopener on anchors', () => {
    const out = sanitizeHtml('<a href="https://x">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('preserves user-specified rel', () => {
    const out = sanitizeHtml('<a href="https://x" rel="nofollow">x</a>');
    expect(out).toContain('rel="nofollow"');
  });

  it('escapes attribute values', () => {
    const out = sanitizeHtml('<a href="https://x" title="he said &quot;hi&quot;">x</a>');
    expect(out).toContain('title="he said &amp;quot;hi&amp;quot;"');
  });
});
