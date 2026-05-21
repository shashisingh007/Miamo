'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';

function ThemeSync() {
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
