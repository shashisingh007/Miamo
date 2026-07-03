'use client';

import { useEffect } from 'react';
import { mount, unmount } from '../index';

/**
 * Mounts the tracking SDK once on the client and tears it down on unmount.
 * Safe to render unconditionally — internal feature flag + consent gating
 * make this a no-op when disabled.
 */
export function TrackProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    mount();
    return () => unmount();
  }, []);
  return <>{children}</>;
}
