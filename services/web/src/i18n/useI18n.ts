/**
 * React hook — `useI18n()`.
 *
 * Usage:
 *   const { t, locale, setLocale } = useI18n();
 *   return <button>{t('common.save')}</button>;
 *
 * The hook is intentionally minimal:
 *   - On mount, we read `localStorage['miamo.locale']`. If missing,
 *     we detect from `navigator.language` and persist the result.
 *   - `setLocale(l)` writes to localStorage and re-renders.
 *   - `t(key)` looks up via `translate()` with graceful fallback.
 *
 * There is no context provider; each caller subscribes to a small
 * cross-component event so all `useI18n` consumers stay in sync.
 * This avoids a top-level provider rewrite for the launch scaffold.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectBrowserLocale,
  translate,
  type Locale,
  type TranslationKey,
} from './config';

const STORAGE_KEY = 'miamo.locale';
const EVENT_NAME = 'miamo.locale.changed';

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
      return raw as Locale;
    }
  } catch {
    // localStorage disabled (Safari private) → fall through to detection
  }
  return detectBrowserLocale();
}

function persistLocale(l: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, l);
  } catch {
    // Best-effort; if localStorage is denied we still update state
  }
}

export interface UseI18nReturn {
  t: (key: TranslationKey) => string;
  locale: Locale;
  setLocale: (l: Locale) => void;
  locales: readonly Locale[];
}

export function useI18n(): UseI18nReturn {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate on mount (client-only). SSR always renders DEFAULT_LOCALE.
  useEffect(() => {
    const initial = readStoredLocale();
    setLocaleState(initial);
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<Locale>).detail;
      if (detail && (SUPPORTED_LOCALES as readonly string[]).includes(detail)) {
        setLocaleState(detail);
      }
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(l)) return;
    persistLocale(l);
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<Locale>(EVENT_NAME, { detail: l }));
    }
  }, []);

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale]);

  return { t, locale, setLocale, locales: SUPPORTED_LOCALES };
}
