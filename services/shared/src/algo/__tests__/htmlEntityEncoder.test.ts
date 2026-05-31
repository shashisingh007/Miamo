import { describe, it, expect } from 'vitest';
import {
  encodeHtmlText,
  encodeHtmlAttribute,
  stripHtmlTags,
  decodeHtmlEntities,
} from '../htmlEntityEncoder';

describe('htmlEntityEncoder', () => {
  it('encodeHtmlText handles null and undefined', () => {
    expect(encodeHtmlText(null)).toBe('');
    expect(encodeHtmlText(undefined)).toBe('');
  });

  it('encodeHtmlText escapes the five core characters', () => {
    expect(encodeHtmlText('<a href="x">&hi</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;hi&lt;/a&gt;'
    );
  });

  it('encodeHtmlText escapes single quote as numeric entity', () => {
    expect(encodeHtmlText("it's")).toBe('it&#x27;s');
  });

  it('encodeHtmlText coerces non-strings', () => {
    expect(encodeHtmlText(42)).toBe('42');
    expect(encodeHtmlText(true)).toBe('true');
  });

  it('encodeHtmlAttribute escapes backtick, equals, space, slash', () => {
    const out = encodeHtmlAttribute('a b/c=d`e');
    expect(out).toContain('&#x60;');
    expect(out).toContain('&#x3D;');
    expect(out).toContain('&#x2F;');
    expect(out).toContain('&#x20;');
  });

  it('encodeHtmlAttribute is at least as strict as encodeHtmlText', () => {
    const src = `<x"'>`;
    const text = encodeHtmlText(src);
    const attr = encodeHtmlAttribute(src);
    expect(attr.length).toBeGreaterThanOrEqual(text.length);
    expect(attr).not.toContain('<');
    expect(attr).not.toContain('"');
    expect(attr).not.toContain("'");
  });

  it('stripHtmlTags removes simple tags', () => {
    expect(stripHtmlTags('<p>hello <b>world</b></p>')).toBe('hello world');
  });

  it('stripHtmlTags removes self-closing tags', () => {
    expect(stripHtmlTags('a<br/>b')).toBe('ab');
  });

  it('stripHtmlTags handles malformed tags without crashing', () => {
    expect(stripHtmlTags('a<b c="d')).toBe('a<b c="d');
  });

  it('decodeHtmlEntities reverses named entities', () => {
    expect(decodeHtmlEntities('&lt;a&gt;&amp;')).toBe('<a>&');
  });

  it('decodeHtmlEntities reverses numeric/hex entities', () => {
    expect(decodeHtmlEntities('&#39;&#x27;')).toBe("''");
    expect(decodeHtmlEntities('&#x1F600;')).toBe('😀');
  });

  it('decodeHtmlEntities leaves unknown entities intact', () => {
    expect(decodeHtmlEntities('&foo;&bar;')).toBe('&foo;&bar;');
  });

  it('decodeHtmlEntities ignores out-of-range numeric refs', () => {
    expect(decodeHtmlEntities('&#9999999999;')).toBe('&#9999999999;');
  });

  it('round-trip: encodeHtmlText then decodeHtmlEntities recovers core punctuation', () => {
    const src = `<a href="x">&hi</a>`;
    expect(decodeHtmlEntities(encodeHtmlText(src))).toBe(src);
  });
});
