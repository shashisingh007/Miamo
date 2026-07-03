'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body so they escape any ancestor with a
 * `transform`, `filter`, or `perspective` style — which would otherwise
 * become the containing block for `position: fixed` descendants and shift
 * popups, modals, and dropdowns out of place.
 */
export function Portal({ children }: { children: ReactNode }) {
 const [mounted, setMounted] = useState(false);
 useEffect(() => { setMounted(true); }, []);
 if (!mounted || typeof document === 'undefined') return null;
 return createPortal(children, document.body);
}
