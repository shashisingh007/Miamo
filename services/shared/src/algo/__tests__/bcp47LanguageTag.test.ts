import { describe, it, expect } from 'vitest';
import { parseBcp47, matchBcp47 } from '../bcp47LanguageTag';

describe('bcp47LanguageTag', () => {
  it('parses simple language tag', () => {
    const t = parseBcp47('en')!;
    expect(t.language).toBe('en');
    expect(t.normalized).toBe('en');
  });

  it('parses language-region', () => {
    expect(parseBcp47('en-US')!.normalized).toBe('en-US');
  });

  it('normalizes casing language=lower, script=Title, region=UPPER', () => {
    expect(parseBcp47('ZH-hans-cn')!.normalized).toBe('zh-Hans-CN');
  });

  it('accepts numeric region', () => {
    expect(parseBcp47('es-419')!.region).toBe('419');
  });

  it('parses variants', () => {
    const t = parseBcp47('de-DE-1996')!;
    expect(t.variants).toEqual(['1996']);
  });

  it('rejects non-strings', () => {
    expect(parseBcp47(123)).toBeNull();
    expect(parseBcp47(null)).toBeNull();
  });

  it('rejects empty', () => {
    expect(parseBcp47('   ')).toBeNull();
  });

  it('rejects invalid language length', () => {
    expect(parseBcp47('engl')).toBeNull();
  });

  it('rejects invalid variant', () => {
    expect(parseBcp47('en-US-bad')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseBcp47('  en-us  ')!.normalized).toBe('en-US');
  });

  it('matchBcp47 prefers exact', () => {
    const desired = parseBcp47('en-US')!;
    const offered = [parseBcp47('en')!, parseBcp47('en-US')!, parseBcp47('en-GB')!];
    expect(matchBcp47(desired, offered)!.normalized).toBe('en-US');
  });

  it('matchBcp47 falls back to language-only (first match wins)', () => {
    const desired = parseBcp47('en-US')!;
    const offered = [parseBcp47('en')!, parseBcp47('fr-FR')!];
    expect(matchBcp47(desired, offered)!.normalized).toBe('en');
  });

  it('matchBcp47 returns null when no language match', () => {
    const desired = parseBcp47('en-US')!;
    const offered = [parseBcp47('fr')!, parseBcp47('de-DE')!];
    expect(matchBcp47(desired, offered)).toBeNull();
  });
});
