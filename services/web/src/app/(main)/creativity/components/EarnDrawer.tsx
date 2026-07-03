'use client';
// ─── Spotlight Earn Drawer (v3.5) ──────────────────────
// Lists every way to earn Spotlight minutes with live progress. Renders the
// /api/v1/creativity/spotlight/earn-opportunities catalog. Tap "Claim 7-day
// streak" to fire the one-shot detector.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { logError } from '@/lib/logError';

interface Opp {
  kind: string;
  label: string;
  delta: number | string;
  status: 'available' | 'claimed_today' | 'completed' | 'progress';
  progress?: { used: number; cap: number };
  hint?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onBuy: () => void;
  onClaimed: (delta: number) => void;
}

export function EarnDrawer({ open, onClose, onBuy, onClaimed }: Props) {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getSpotlightEarnOpportunities();
      setOpps(r?.data?.opportunities ?? []);
    } catch (e) {
      logError('creativity.earn.load', e);
      setOpps([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  // click-matrix.md \u00a73.2 + \u00a75 rank 6: replaced native alert() with toast.
  // click-matrix.md \u00a75 rank 14: surface streak-claim failures instead of
  // swallowing them silently.
  const claimStreak = async () => {
    setClaiming('streak_7d_creativity');
    try {
      const r = await api.claimSpotlightStreak();
      const granted = !!r?.data?.granted;
      const activeDays = Number(r?.data?.activeDays ?? 0);
      if (granted) onClaimed(10);
      else if (activeDays < 7) toast.info('Keep going!', `You're at ${activeDays}/7 active days.`);
      else toast.info('Already claimed', 'Come back tomorrow for a fresh streak.');
      await load();
    } catch (e) {
      logError('creativity.earn.claimStreak', e);
      toast.error('Could not claim', 'Try again in a moment.');
    } finally { setClaiming(null); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-main" />
                <h2 className="text-lg font-bold">Earn Spotlight minutes</h2>
              </div>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-text-muted">
              Be active, be kind, be creative. Every minute fuels your next post.
            </p>

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-rose-main" />
              </div>
            ) : (
              <ul className="space-y-2">
                {opps.map((o) => (
                  <li key={o.kind} className="rounded-2xl border border-token bg-miamo-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={o.status} />
                          <span className="text-sm font-semibold">{o.label}</span>
                        </div>
                        {o.hint && <p className="mt-1 text-[11px] text-text-muted">{o.hint}</p>}
                        {o.progress && (
                          <div className="mt-2">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-rose-main transition-all"
                                style={{ width: `${Math.min(100, (o.progress.used / o.progress.cap) * 100)}%` }}
                              />
                            </div>
                            <div className="mt-1 text-[10px] tabular-nums text-text-muted">
                              {o.progress.used} / {o.progress.cap} today
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 tabular-nums">
                          {typeof o.delta === 'number' ? `+${o.delta}` : o.delta}
                        </span>
                        {o.kind === 'streak_7d_creativity' && o.status === 'available' && (
                          <button
                            onClick={claimStreak}
                            disabled={claiming === o.kind}
                            className="rounded-full bg-rose-main px-3 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          >
                            {claiming === o.kind ? '...' : 'Claim'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 rounded-2xl bg-gradient-to-br from-rose-main/10 to-amber-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">Need minutes now?</div>
                  <div className="text-[11px] text-text-muted">Bundles from 10 to 180 min</div>
                </div>
                <button
                  onClick={() => { onClose(); onBuy(); }}
                  className="rounded-full bg-rose-main px-4 py-2 text-xs font-semibold text-white shadow-button"
                >
                  Buy minutes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatusIcon({ status }: { status: Opp['status'] }) {
  if (status === 'completed') return <Check className="h-4 w-4 text-emerald-600" />;
  if (status === 'claimed_today') return <Check className="h-4 w-4 text-emerald-600" />;
  if (status === 'progress') return <TrendingUp className="h-4 w-4 text-rose-main" />;
  return <Lock className="h-4 w-4 text-text-muted" />;
}
