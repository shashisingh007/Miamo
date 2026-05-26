'use client';

import { useCallback } from 'react';
import { track } from '../index';

/**
 * Hook variant of `track()` that binds a name + base payload once and returns
 * a stable callback. Useful for handlers like `onClick={tracked('cta_join')}`.
 */
export function useTracked(name: string, base?: Record<string, unknown>) {
  return useCallback(
    (extra?: Record<string, unknown>) => track(name, { ...base, ...extra }),
    [name, base],
  );
}
