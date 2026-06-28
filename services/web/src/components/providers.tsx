'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { TrackProvider } from '@/lib/track/react/TrackProvider';
import { ConsentBanner } from '@/components/ConsentBanner';
import { useThemeStore } from '@/stores';

function ThemeSync() {
 const theme = useThemeStore((s) => s.theme);
 useEffect(() => {
  const root = document.documentElement;
  const apply = (t: 'dark' | 'light' | 'system') => {
   const resolved = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
   root.classList.toggle('dark', resolved === 'dark');
   root.dataset.theme = resolved;
  };
  apply(theme);
  if (theme !== 'system') return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => apply('system');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
 }, [theme]);
 return null;
}

// Reads localStorage prefs (font size, reduce motion, density, color-blind
// mode) and reflects them on <html> as data-attributes so plain CSS can react.
// Other tabs / pages stay in sync via the `storage` event.
function LocalPrefsSync() {
 useEffect(() => {
  if (typeof window === 'undefined') return;
  const apply = () => {
   const root = document.documentElement;
   let prefs: any = {};
   try { prefs = JSON.parse(localStorage.getItem('miamo-local-prefs-v1') || '{}'); } catch {}
   root.dataset.fontSize = prefs.fontSize || 'medium';
   root.dataset.reduceMotion = prefs.reduceMotion ? 'true' : 'false';
   root.dataset.density = prefs.sidebarDensity || 'comfortable';
   root.dataset.colorBlind = prefs.colorBlindMode || 'off';
  };
  apply();
  const onStorage = (e: StorageEvent) => {
   if (e.key === 'miamo-local-prefs-v1' || e.key === null) apply();
  };
  const onCustom = () => apply();
  window.addEventListener('storage', onStorage);
  window.addEventListener('miamo-local-prefs-changed', onCustom);
  return () => {
   window.removeEventListener('storage', onStorage);
   window.removeEventListener('miamo-local-prefs-changed', onCustom);
  };
 }, []);
 return null;
}

/**
 * Root provider component that wraps the entire application.
 * Provides TanStack Query client, theme synchronization, toast notifications,
 * and the v3.1 tracking SDK + consent banner (both feature-flagged and consent-gated).
 */
export function Providers({ children }: { children: React.ReactNode }) {
 const [queryClient] = useState(
 () => new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 2, refetchOnWindowFocus: false } } })
 );
 return (
 <QueryClientProvider client={queryClient}>
 <ThemeSync />
 <LocalPrefsSync />
 <ToastProvider>
 <TrackProvider>
 {children}
 <ConsentBanner />
 </TrackProvider>
 </ToastProvider>
 </QueryClientProvider>
 );
}
