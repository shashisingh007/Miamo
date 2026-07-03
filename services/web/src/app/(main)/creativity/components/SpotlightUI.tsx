'use client';
// Spotlight UI primitives — countdown, balance pill, minute picker, vault drawer.
// Self-contained so the existing TalentCard/Composer/Page only import what they need.

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Coins, Plus, Sparkles, X, Trash2, Archive, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { Portal } from '@/components/ui/portal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { logError } from '@/lib/logError';

// Mirror of services/shared/src/spotlight-ledger constants.
export const MIN_MINUTES = 5;
export const MINUTES_STEP = 5;
export const MAX_MINUTES_PER_POST = 60;
export const REFUND_WINDOW_MS = 90_000;

export const MINUTE_OPTIONS = [5, 10, 15, 30, 60] as const;
export const PURCHASE_BUNDLES = [
  { minutes: 10, label: '10 min', cents: 99 },
  { minutes: 30, label: '30 min', cents: 249 },
  { minutes: 60, label: '60 min', cents: 449 },
  { minutes: 180, label: '180 min', cents: 999 },
] as const;

export function formatMs(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${String(r).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function CountdownPill({ expiresAt, label = 'expires in', onZero }: {
  expiresAt: string | Date | null | undefined;
  label?: string;
  onZero?: () => void;
}) {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const remaining = Math.max(0, target - now);
  if (remaining === 0 && onZero) {
    onZero();
  }
  const tone = remaining < 60_000 ? 'bg-rose-main/15 text-rose-main' : remaining < 300_000 ? 'bg-amber-500/15 text-amber-700' : 'bg-emerald-500/15 text-emerald-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${tone}`}>
      <Clock className="h-3 w-3" /> {label} {formatMs(remaining)}
    </span>
  );
}

export function SpotlightBalancePill({ balance, onClick }: { balance: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-100/80 to-amber-50/80 px-3 py-1 text-[12px] font-semibold text-amber-800 shadow-sm hover:shadow-md transition"
      title="Your Spotlight minutes — spend to post"
    >
      <Coins className="h-3.5 w-3.5" /> <span className="tabular-nums">{balance}</span> min
      {onClick && <Plus className="h-3 w-3" />}
    </button>
  );
}

export function MinutePicker({ value, onChange, balance }: { value: number; onChange: (n: number) => void; balance: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          <Clock className="inline h-3 w-3 -mt-0.5 mr-1" /> Spotlight time
        </label>
        <span className="text-[10px] tabular-nums text-text-muted">balance: {balance} min</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MINUTE_OPTIONS.map((n) => {
          const active = value === n;
          const afford = n <= balance;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              disabled={!afford}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                active
                  ? 'border-amber-500 bg-amber-500/15 text-amber-800'
                  : afford
                    ? 'border-token text-text-muted hover:border-amber-400'
                    : 'border-token text-text-muted/40 line-through cursor-not-allowed'
              }`}
            >
              {n}m
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-text-muted">
        Posts auto-burn after this. <strong>Delete within 90s = full refund.</strong>
      </p>
    </div>
  );
}

export function PurchaseModal({ open, onClose, onPurchased }: {
  open: boolean;
  onClose: () => void;
  onPurchased: (newBalance: number, minutes: number) => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const buy = async (minutes: number) => {
    setBusy(minutes); setErr(null);
    try {
      const r = await api.purchaseSpotlight(minutes);
      onPurchased(r?.data?.balanceAfter ?? 0, minutes);
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Purchase failed');
    } finally { setBusy(null); }
  };

  if (!open) return null;
  return (
    <Portal>
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-miamo-card p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Buy Spotlight Minutes</h3>
              <p className="text-xs text-text-muted">Top up to keep posting and trending.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PURCHASE_BUNDLES.map((b) => (
              <button
                key={b.minutes}
                onClick={() => buy(b.minutes)}
                disabled={busy !== null}
                className={`rounded-2xl border px-3 py-3 text-left transition ${busy === b.minutes ? 'border-amber-500 bg-amber-500/10' : 'border-token hover:border-amber-400'}`}
              >
                <div className="text-sm font-semibold">{b.label}</div>
                <div className="mt-0.5 text-[11px] text-text-muted">${(b.cents / 100).toFixed(2)}</div>
              </button>
            ))}
          </div>
          {err && <div className="mt-3 rounded-xl bg-rose-main/10 px-3 py-2 text-xs text-rose-main">{err}</div>}
          <p className="mt-3 text-center text-[10px] text-text-muted">
            Dev mode: instant credit. Production gates this through Stripe / IAP.
          </p>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}

export function VaultDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getCreativityVault()
      .then((r: any) => setItems(r?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;
  return (
    <Portal>
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 z-50 w-[min(24rem,100vw)] overflow-y-auto bg-miamo-card shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-token bg-miamo-card/95 px-4 py-3 backdrop-blur">
            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Archive className="h-4 w-4" /> Vault
            </h3>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-4 space-y-3">
            {loading && <div className="text-xs text-text-muted">Loading…</div>}
            {!loading && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-token p-6 text-center">
                <Archive className="mx-auto h-6 w-6 text-text-muted" />
                <p className="mt-2 text-xs text-text-muted">Nothing in the vault yet.<br/>Expired or deleted posts land here for your eyes only.</p>
              </div>
            )}
            {items.map((it) => (
              <article key={it.id} className="rounded-2xl border border-token bg-white/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      {it.category?.name} · {it.status === 'expired' ? 'expired' : 'deleted'}
                    </div>
                    <div className="mt-0.5 truncate text-[14px] font-semibold">{it.title}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-main/10 px-2 py-0.5 text-[10px] font-semibold text-rose-main">
                    <Flame className="h-3 w-3" /> {it.beatCount} beats
                  </span>
                </div>
                {it.content && <p className="mt-1.5 line-clamp-3 text-[12px] text-text-secondary">{it.content}</p>}
                <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px] text-text-muted">
                  <Stat label="Views" value={it.viewCount} />
                  <Stat label="Beats" value={it.beatCount} />
                  <Stat label="Comments" value={it.commentCount} />
                  <Stat label="Saves" value={it.saveCount} />
                </div>
              </article>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[14px] font-bold tabular-nums text-text-primary">{value ?? 0}</div>
      <div className="mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export function DeleteRefundButton({ itemId, createdAt, minutesPaid, onDeleted }: {
  itemId: string; createdAt: string | Date; minutesPaid?: number; onDeleted: (refundedMinutes: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const refundable = elapsed <= REFUND_WINDOW_MS && (minutesPaid ?? 0) > 0;

  // click-matrix.md §3.2 + §5 rank 6: replaced window.confirm + window.alert
  // with the shared ConfirmDialog and the toast surface.
  const openConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      const r = await api.deleteCreativityItem(itemId);
      onDeleted(r?.data?.refundedMinutes ?? 0);
    } catch (err: any) {
      logError('creativity.delete', err);
      toast.error('Delete failed', err?.message || 'Try again in a moment.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button
        onClick={openConfirm}
        disabled={busy}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:opacity-60 ${
          refundable ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25' : 'bg-rose-main/10 text-rose-main hover:bg-rose-main/20'
        }`}
        title={refundable ? 'Refund window active' : 'No refund (after 90s)'}
        aria-label={refundable ? 'Delete post and refund minutes' : 'Delete post'}
      >
        <Trash2 className="h-3 w-3" /> {refundable ? 'Delete & refund' : 'Delete'}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={performDelete}
        title={refundable ? 'Delete and refund?' : 'Delete this post?'}
        description={refundable
          ? `You'll get ${minutesPaid} Spotlight minutes back.`
          : 'Minutes already spent will not be refunded.'}
        confirmLabel={refundable ? `Delete & refund ${minutesPaid}m` : 'Delete'}
        cancelLabel="Keep post"
        tone="danger"
      />
    </>
  );
}

export function useSpotlight() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [nextMilestone, setNextMilestone] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useMemo(() => async () => {
    setLoading(true);
    try {
      const r = await api.getSpotlight();
      setBalance(r?.data?.balance ?? 0);
      setHistory(r?.data?.history ?? []);
      setMatchCount(r?.data?.matchCount ?? 0);
      setNextMilestone(r?.data?.nextMilestone ?? null);
    } catch {
      // keep prior state on failure
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { balance, setBalance, history, matchCount, nextMilestone, loading, refresh };
}
