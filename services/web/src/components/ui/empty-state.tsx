'use client';

// ─── EmptyState (G.14 design-system pass) ───
// Reusable empty / error / success placeholder for every listing surface.
// Replaces the ad-hoc "No results" text scattered across (main) routes.
//
// Feature flag: none — design-system core, always on.
//
// Cross-refs:
//   - docs/architecture/design-system.md §5, §6
//   - tests/a11y-invariants.test.ts (EmptyState assertions)

import type { LucideIcon } from 'lucide-react';
import { Inbox, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type EmptyStateVariant = 'default' | 'error' | 'success';

export interface EmptyStateProps {
  /** Optional lucide icon to render at the top. Falls back to variant default. */
  icon?: LucideIcon;
  /** Bold headline — "No matches yet", "Something went wrong". */
  title: string;
  /** Optional supporting copy under the headline. */
  description?: string;
  /**
   * Optional call-to-action — pass a fully-formed <button> or <Link>. Kept
   * as ReactNode (not text + onClick) so callers control routing / analytics
   * without this primitive taking a dependency on next/link or an analytics
   * SDK.
   */
  action?: ReactNode;
  /** Visual affordance. `error` uses warning colours; `success` uses green. */
  variant?: EmptyStateVariant;
  /** Optional className merged onto the outer container. */
  className?: string;
  /** Children render below the description + action — for custom illustrations. */
  children?: ReactNode;
}

const VARIANT_STYLES: Record<EmptyStateVariant, { icon: string; ring: string; defaultIcon: LucideIcon }> = {
  default: { icon: 'text-text-muted', ring: 'bg-miamo-surface/60 border-border/30', defaultIcon: Inbox },
  error:   { icon: 'text-amber-500',  ring: 'bg-amber-50/40 border-amber-200/40 dark:bg-amber-900/10 dark:border-amber-800/30', defaultIcon: AlertTriangle },
  success: { icon: 'text-emerald-500', ring: 'bg-emerald-50/40 border-emerald-200/40 dark:bg-emerald-900/10 dark:border-emerald-800/30', defaultIcon: CheckCircle2 },
};

/**
 * EmptyState — the canonical empty / error / success placeholder.
 *
 * @example
 *   <EmptyState title="No matches yet" description="Like some profiles to see them here." />
 *
 * @example
 *   <EmptyState variant="error" title="Couldn't load" action={<button onClick={retry}>Retry</button>} />
 *
 * A11y: uses role="status" (live region) so screen readers announce the
 * message when it appears in an initially-populated list that then drained
 * (e.g. inbox empties). Keyboard focus flows to `action` naturally — no
 * focus-trap needed because this is inline content, not a dialog.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  children,
}: EmptyStateProps) {
  const style = VARIANT_STYLES[variant];
  const Icon = icon ?? style.defaultIcon;
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center rounded-2xl border w-full max-w-md mx-auto',
        style.ring,
        className,
      )}
    >
      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-miamo-card/60', style.icon)}>
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="text-[13px] text-text-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
      {children}
    </div>
  );
}
