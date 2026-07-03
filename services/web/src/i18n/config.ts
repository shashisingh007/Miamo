/**
 * i18n configuration — supported locales, defaults, key registry.
 *
 * We ship four launch locales:
 *   - en (English)  — full coverage of the top-30 UI strings.
 *   - hi (Hindi)    — full coverage of the top-30 UI strings.
 *   - ta (Tamil)    — skeleton; falls back to `en` per key.
 *   - bn (Bengali)  — skeleton; falls back to `en` per key.
 *
 * See `docs/architecture/i18n.md` for the full workflow.
 */

import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';
import bn from './bn.json';

export const SUPPORTED_LOCALES = ['en', 'hi', 'ta', 'bn'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  bn: 'বাংলা',
};

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * The English catalogue is the source of truth. Every key must exist in
 * `en.json`; every other locale's keys are typed as a subset (missing
 * keys fall back to English at lookup time).
 */
export type TranslationKey = keyof typeof en;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TranslationCatalogue = { [K in TranslationKey]: string };

// Type-check that each imported JSON has string values keyed by the
// English key registry. A missing key becomes an English fallback at
// runtime rather than a build failure — this makes it safe to ship a
// partial translation.
type PartialCatalogue = Partial<TranslationCatalogue>;

export const CATALOGUES: Record<Locale, PartialCatalogue> = {
  en: en as TranslationCatalogue,
  hi: hi as PartialCatalogue,
  ta: ta as PartialCatalogue,
  bn: bn as PartialCatalogue,
};

/**
 * Detect the user's preferred locale from `navigator.language`.
 * Falls back to DEFAULT_LOCALE if the browser locale is unsupported.
 *
 * Runs client-side only. On SSR, always returns DEFAULT_LOCALE.
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const raw = (navigator.language || '').toLowerCase();
  // Two-letter primary tag: `en-US` → `en`, `hi-IN` → `hi`, etc.
  const primary = raw.split(/[-_]/)[0];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(primary)) {
    return primary as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Look up a translation key with graceful fallback:
 *   1. requested locale
 *   2. English (source of truth)
 *   3. the key itself (last-resort — never a blank string)
 */
export function translate(locale: Locale, key: TranslationKey): string {
  const catalogue = CATALOGUES[locale];
  const localised = catalogue?.[key];
  if (typeof localised === 'string' && localised.length > 0) return localised;
  const english = CATALOGUES.en[key];
  if (typeof english === 'string' && english.length > 0) return english;
  return key;
}
