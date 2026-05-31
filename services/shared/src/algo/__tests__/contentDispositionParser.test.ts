import { describe, it, expect } from 'vitest';
import { parseContentDisposition, isAttachmentDisposition } from '../contentDispositionParser';

describe('contentDispositionParser', () => {
  it('parses simple inline', () => {
    const r = parseContentDisposition('inline');
    expect(r?.type).toBe('inline');
    expect(r?.filename).toBeNull();
  });

  it('parses attachment with filename', () => {
    const r = parseContentDisposition('attachment; filename="report.pdf"');
    expect(r?.type).toBe('attachment');
    expect(r?.filename).toBe('report.pdf');
  });

  it('unquoted token filename', () => {
    const r = parseContentDisposition('attachment; filename=plain.txt');
    expect(r?.filename).toBe('plain.txt');
  });

  it('lowercases type and param keys', () => {
    const r = parseContentDisposition('ATTACHMENT; FileName="X.txt"');
    expect(r?.type).toBe('attachment');
    expect(r?.parameters.filename).toBe('X.txt');
  });

  it('handles escaped quotes inside filename', () => {
    const r = parseContentDisposition('attachment; filename="a\\"b.txt"');
    expect(r?.filename).toBe('a"b.txt');
  });

  it('handles semicolons inside quoted value', () => {
    const r = parseContentDisposition('attachment; filename="a;b.txt"');
    expect(r?.filename).toBe('a;b.txt');
  });

  it('decodes RFC 5987 filename* UTF-8', () => {
    const r = parseContentDisposition("attachment; filename*=UTF-8''%E2%82%AC%20rates.txt");
    expect(r?.filename).toBe('\u20ac rates.txt');
  });

  it('filename* takes precedence over filename', () => {
    const r = parseContentDisposition(
      "attachment; filename=\"plain.txt\"; filename*=UTF-8''fancy.txt"
    );
    expect(r?.filename).toBe('fancy.txt');
  });

  it('parses form-data with name', () => {
    const r = parseContentDisposition('form-data; name="field"; filename="up.bin"');
    expect(r?.type).toBe('form-data');
    expect(r?.parameters.name).toBe('field');
    expect(r?.filename).toBe('up.bin');
  });

  it('rejects empty string', () => {
    expect(parseContentDisposition('')).toBeNull();
  });

  it('rejects non-string', () => {
    expect(parseContentDisposition(123 as any)).toBeNull();
  });

  it('rejects unterminated quote', () => {
    expect(parseContentDisposition('attachment; filename="oops')).toBeNull();
  });

  it('rejects bad token type', () => {
    expect(parseContentDisposition('atta chment; filename=x')).toBeNull();
  });

  it('rejects parameter missing =', () => {
    expect(parseContentDisposition('attachment; filename')).toBeNull();
  });

  it('rejects invalid percent-encoding in ext value', () => {
    const r = parseContentDisposition("attachment; filename*=UTF-8''bad%ZZend");
    // ext fails to decode => no filename surfaced
    expect(r?.filename).toBeNull();
  });

  it('isAttachmentDisposition', () => {
    expect(isAttachmentDisposition('attachment')).toBe(true);
    expect(isAttachmentDisposition('inline')).toBe(false);
    expect(isAttachmentDisposition('garbage; oops')).toBe(false);
  });

  it('ignores unknown charset in ext form', () => {
    const r = parseContentDisposition("attachment; filename*=UTF-16''oops.txt");
    expect(r?.filename).toBeNull();
  });

  it('iso-8859-1 charset decode', () => {
    const r = parseContentDisposition("attachment; filename*=ISO-8859-1''%A3rate.txt");
    expect(r?.filename).toBe('\u00a3rate.txt');
  });
});
