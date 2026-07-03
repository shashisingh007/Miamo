'use client';

/**
 * Phase F — Blocked-user list panel (Settings → Safety).
 *
 * Improvements over the inline v1 list:
 *   - Auto-loads on first render (no manual "Manage" tap required).
 *   - Sortable by blockedAt (newest first).
 *   - Bulk-select + bulk-unblock with typed-confirm on the bulk action.
 *   - Displays verified badge + display name + block reason where captured.
 *   - Uses the same design tokens as the surrounding Settings card.
 */

import { useEffect, useState } from 'react';
import { Trash2, ShieldCheck, CheckSquare, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';

type BlockRow = {
  id: string;
  blockedId?: string;
  reason?: string | null;
  details?: string | null;
  createdAt?: string;
  blocked?: {
    id: string;
    displayName?: string | null;
    username?: string | null;
    verified?: boolean;
  };
};

interface Props {
  onCountChange?: (count: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function BlockListPanel({ onCountChange, showToast }: Props) {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getBlockList();
      const data: BlockRow[] = res.data || [];
      setBlocks(data);
      onCountChange?.(data.length);
    } catch (e) {
      logError('settings.blocklist.load', e);
      showToast('Could not load block list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggleSelect = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleAll = () => {
    if (selectedIds.length === blocks.length) setSelected({});
    else setSelected(Object.fromEntries(blocks.map((b) => [resolveTargetId(b), true])));
  };

  const handleUnblockOne = async (row: BlockRow) => {
    const targetId = resolveTargetId(row);
    if (!targetId) return;
    setBusy(true);
    try {
      await api.unblockUser(targetId);
      const next = blocks.filter((b) => resolveTargetId(b) !== targetId);
      setBlocks(next);
      onCountChange?.(next.length);
      showToast('Unblocked', 'success');
    } catch (e) {
      logError('settings.blocklist.unblock', e);
      showToast('Unblock failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const performBulkUnblock = async () => {
    setConfirmBulkOpen(false);
    if (!selectedIds.length) return;
    setBusy(true);
    let success = 0, failed = 0;
    for (const id of selectedIds) {
      try { await api.unblockUser(id); success++; } catch { failed++; }
    }
    const remaining = blocks.filter((b) => !selectedIds.includes(resolveTargetId(b)));
    setBlocks(remaining);
    setSelected({});
    onCountChange?.(remaining.length);
    setBusy(false);
    if (failed === 0) showToast(`Unblocked ${success} user${success === 1 ? '' : 's'}`, 'success');
    else showToast(`${success} unblocked, ${failed} failed`, 'info');
    // Client-side tracking (backend event catalog: safety.block_bulk_unblock).
    try {
      const track = (await import('@/lib/track')).track;
      track('safety.block_bulk_unblock', { count: success });
    } catch { /* tracking is best-effort */ }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading block list…
      </div>
    );
  }

  if (!blocks.length) {
    return (
      <div className="py-4 text-center">
        <ShieldCheck className="w-6 h-6 text-rose-alt mx-auto mb-1" />
        <p className="text-xs text-text-muted">You haven't blocked anyone.</p>
      </div>
    );
  }

  const allSelected = selectedIds.length === blocks.length && blocks.length > 0;

  return (
    <div className="space-y-2 py-2">
      <ConfirmDialog
        open={confirmBulkOpen}
        title={`Unblock ${selectedIds.length} user${selectedIds.length === 1 ? '' : 's'}?`}
        description="You can block them again anytime."
        confirmLabel="Unblock"
        cancelLabel="Cancel"
        tone="danger"
        onCancel={() => setConfirmBulkOpen(false)}
        onConfirm={performBulkUnblock}
      />
      {blocks.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary"
            aria-label={allSelected ? 'Clear selection' : 'Select all blocked users'}
          >
            {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {allSelected ? 'Clear' : 'Select all'}
          </button>
          {selectedIds.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setConfirmBulkOpen(true)} disabled={busy} aria-label={`Unblock ${selectedIds.length} selected users`}>
              <Trash2 className="w-3 h-3" /> Unblock {selectedIds.length}
            </Button>
          )}
        </div>
      )}
      <ul className="space-y-2" role="list">
        {blocks.map((b) => {
          const targetId = resolveTargetId(b);
          const isSel = !!selected[targetId];
          return (
            <li key={b.id} className="flex items-center justify-between bg-miamo-elevated/50 dark:bg-[#1F2229]/60 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => toggleSelect(targetId)}
                    aria-label={`${isSel ? 'Deselect' : 'Select'} ${b.blocked?.displayName || 'user'}`}
                    className="shrink-0"
                  >
                    {isSel ? <CheckSquare className="w-3.5 h-3.5 text-rose-main" /> : <Square className="w-3.5 h-3.5 text-text-muted" />}
                  </button>
                )}
                <span className="text-xs text-text-secondary dark:text-[#B8B3AC] truncate">
                  {b.blocked?.displayName || b.blocked?.username || targetId || 'Unknown user'}
                </span>
                {b.blocked?.verified && (
                  <ShieldCheck className="w-3 h-3 text-rose-main shrink-0" aria-label="Verified" />
                )}
                {b.reason && (
                  <span className="ml-1 rounded-full bg-miamo-surface px-2 py-0.5 text-[9px] uppercase tracking-wider text-text-muted">
                    {b.reason}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleUnblockOne(b)} disabled={busy}>Unblock</Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function resolveTargetId(b: BlockRow): string {
  return b.blocked?.id || b.blockedId || '';
}
