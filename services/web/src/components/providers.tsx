'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ToastProvider } from '@/components/ui/toast';

function ThemeSync() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Dynamically import to avoid SSR issues with persist/localStorage
    import('@/stores').then(({ useThemeStore }) => {
      const theme = useThemeStore.getState().theme;
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        root.classList.toggle('dark', mq.matches);
      }
    });
  }, [mounted]);

  return null;
}

/**
 * Root provider component that wraps the entire application.
 * Provides TanStack Query client, theme synchronization, and toast notifications.
 *
 * - **QueryClient**: staleTime=30s, retry=2, refetchOnWindowFocus disabled.
 * - **ThemeSync**: Reads persisted theme from Zustand store and applies `dark` class.
 * - **ToastProvider**: Global toast notification system.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 2, refetchOnWindowFocus: false } } })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
