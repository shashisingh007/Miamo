'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { TrackProvider } from '@/lib/track/react/TrackProvider';
import { ConsentBanner } from '@/components/ConsentBanner';

function ThemeSync() {
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
 <ToastProvider>
 <TrackProvider>
 {children}
 <ConsentBanner />
 </TrackProvider>
 </ToastProvider>
 </QueryClientProvider>
 );
}
