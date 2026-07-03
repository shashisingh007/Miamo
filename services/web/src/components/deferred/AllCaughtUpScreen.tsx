'use client';

/**
 * v6.6 "All caught up" terminal screen.
 *
 * Shown when the active batch is exhausted on Discover or DTM. Surfaces
 * a "View deferred" CTA when there are pending items in the see-later
 * pile so users can come back to them. The component is purely
 * presentational; the parent owns batch + deferred state.
 */
import { motion } from 'framer-motion';
import { Heart, Bookmark, SlidersHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AllCaughtUpScreen({
  surface,
  deferredCount,
  onViewDeferred,
  onAdjustFilters,
  primaryLabel,
  secondaryLabel,
  message,
}: {
  surface: 'discover' | 'dtm';
  deferredCount: number;
  onViewDeferred: () => void;
  onAdjustFilters?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  message?: string;
}) {
  const Icon = surface === 'discover' ? Heart : Sparkles;
  const heading = surface === 'discover'
    ? "You're all caught up"
    : "Today's questions are done";
  const defaultMessage = surface === 'discover'
    ? 'New people show up every day. Take a breath, or pick up where you left off below.'
    : 'Come back tomorrow for fresh questions, or revisit ones you set aside.';

  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md px-8"
      >
        <div className="w-16 h-16 rounded-full bg-rose-soft border border-rose-main/15 flex items-center justify-center mx-auto mb-6">
          <Icon className="w-7 h-7 text-rose" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">All caught up</p>
        <h3 className="font-brand font-semibold text-3xl text-text-primary mb-3 leading-tight">
          {heading}
        </h3>
        <p className="text-[15px] text-text-secondary mb-7 leading-relaxed">
          {message ?? defaultMessage}
        </p>
        <div className="flex flex-col items-center gap-3">
          {deferredCount > 0 && (
            <button
              onClick={onViewDeferred}
              className={cn(
                'h-11 px-6 rounded-xl bg-rose-main text-white text-sm font-semibold',
                'hover:bg-rose-dark hover:-translate-y-0.5 transition-all duration-300',
                'inline-flex items-center gap-2 shadow-soft',
              )}
            >
              <Bookmark className="w-4 h-4" />
              {primaryLabel ?? `View ${deferredCount} deferred`}
            </button>
          )}
          {onAdjustFilters && (
            <button
              onClick={onAdjustFilters}
              className="h-10 px-5 rounded-xl border border-border text-text-muted text-[13px] font-semibold hover:bg-miamo-surface hover:text-text-secondary transition inline-flex items-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {secondaryLabel ?? 'Adjust filters'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
