'use client';

/**
 * v6.6 Deferred-pile modal.
 *
 * Lists items the user previously deferred ("see later") on a given
 * surface (Discover or DTM). Resolving an item closes it out with a
 * final action; opening one fires the see-later.view tracking event so
 * the learner can credit re-engagement.
 *
 * Designed surface-agnostic: the renderItem prop lets each caller
 * project its own row content (profile card vs question card) while
 * the modal owns fetch/track/resolve plumbing.
 */
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Star, Clock, Bookmark } from 'lucide-react';
import { api } from '@/lib/api';
import { Portal } from '@/components/ui/portal';
import {
  trackDiscoverSeeLaterView,
  trackDiscoverSkippedOpen,
  trackDiscoverSkippedAction,
  trackDtmSeeLaterView,
} from '@/lib/track/collectors/deferred';

export type DeferredItem = {
  id: string;
  surface: string;
  targetId: string;
  topic: string | null;
  deferredAt: string;
  viewedAt: string | null;
  resolvedAt: string | null;
  resolvedAction: string | null;
};

export type DeferAction = 'like' | 'pass' | 'super_like' | 'see_later' | 'answered' | 'skipped';

export function DeferredPileModal({
  surface,
  isOpen,
  onClose,
  renderItem,
  emptyText = 'No deferred items.',
  title,
}: {
  surface: 'discover' | 'dtm';
  isOpen: boolean;
  onClose: () => void;
  /** Render a row's body. Default action buttons sit alongside it. */
  renderItem?: (item: DeferredItem) => React.ReactNode;
  emptyText?: string;
  title?: string;
}) {
  const [items, setItems] = useState<DeferredItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listDeferred({ surface, kind: 'pending', limit: 100 });
      const arr = (res.data?.items || []) as DeferredItem[];
      setItems(arr);
      // Fire skipped-open tracking when the modal first surfaces a non-empty pile.
      if (surface === 'discover') trackDiscoverSkippedOpen(arr.length);
    } catch {
      setItems([]);
    } finally { setLoading(false); }
  }, [surface]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const handleView = async (item: DeferredItem) => {
    try { await api.viewDeferred(item.id); } catch {}
    const ageMs = Date.now() - new Date(item.deferredAt).getTime();
    if (surface === 'discover') {
      trackDiscoverSeeLaterView({ tid: item.targetId, ageMs });
    } else {
      trackDtmSeeLaterView({ topic: item.topic ?? 'unknown', qid: item.targetId, ageMs });
    }
  };

  const handleResolve = async (item: DeferredItem, action: DeferAction) => {
    try { await api.resolveDeferred(item.id, action); } catch {}
    if (surface === 'discover') {
      const tracked = action === 'like' || action === 'pass' || action === 'super_like' || action === 'see_later'
        ? action
        : 'pass';
      trackDiscoverSkippedAction({ tid: item.targetId, action: tracked });
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-4 top-12 bottom-12 max-w-[560px] mx-auto bg-miamo-card border border-border rounded-2xl shadow-2xl z-[60] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-rose" />
                <h3 className="text-[14px] font-bold text-text-primary">
                  {title ?? (surface === 'discover' ? 'Deferred profiles' : 'Deferred questions')}
                </h3>
                <span className="text-[11px] font-semibold text-text-muted tabular-nums">{items.length}</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-miamo-surface flex items-center justify-center">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loading ? (
                <p className="text-[12px] text-text-muted text-center py-8">Loading…</p>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-50" />
                  <p className="text-[13px] text-text-secondary font-medium">{emptyText}</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-miamo-surface border border-border p-4">
                    {/* click-matrix.md §5 rank 46-60: keyboard-accessible item.
                        Was a bare div-with-onClick — no role, no keyboard nav,
                        no focus ring. Now a button with Enter/Space support. */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleView(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleView(item);
                        }
                      }}
                      className="cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-main/40"
                      aria-label="View item details"
                    >
                      {renderItem ? renderItem(item) : (
                        <div className="text-[12px] text-text-secondary">
                          <p className="font-semibold text-text-primary mb-1">{item.targetId}</p>
                          {item.topic && <p className="text-[11px] text-text-muted">Topic: {item.topic}</p>}
                          <p className="text-[10px] text-text-muted mt-1">
                            Deferred {new Date(item.deferredAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {surface === 'discover' ? (
                        <>
                          <button onClick={() => handleResolve(item, 'pass')}
                            className="flex-1 h-9 rounded-lg border border-border text-[11px] font-semibold text-text-muted hover:bg-miamo-card hover:text-red-400 transition flex items-center justify-center gap-1">
                            <X className="w-3 h-3" /> Pass
                          </button>
                          <button onClick={() => handleResolve(item, 'like')}
                            className="flex-1 h-9 rounded-lg bg-rose-soft border border-rose-main/20 text-[11px] font-bold text-rose hover:bg-rose-soft transition flex items-center justify-center gap-1">
                            <Heart className="w-3 h-3" fill="currentColor" /> Like
                          </button>
                          <button onClick={() => handleResolve(item, 'super_like')}
                            className="h-9 px-3 rounded-lg bg-miamo-card border border-border text-[11px] font-bold text-rose-alt hover:border-rose-main/30 transition flex items-center justify-center"
                            title="Super Like">
                            <Star className="w-3 h-3" fill="currentColor" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleResolve(item, 'skipped')}
                            className="flex-1 h-9 rounded-lg border border-border text-[11px] font-semibold text-text-muted hover:bg-miamo-card transition">
                            Skip
                          </button>
                          <button onClick={() => handleResolve(item, 'answered')}
                            className="flex-1 h-9 rounded-lg bg-rose-soft border border-rose-main/20 text-[11px] font-bold text-rose hover:bg-rose-soft transition">
                            Answer now
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
