'use client';

/**
 * Phase F — Account deletion confirmation modal.
 *
 * Two-step gate for DPDP/GDPR right-to-erasure:
 *   1. User picks a reason category (analytics, non-blocking).
 *   2. User types the literal word `DELETE` to enable the confirm button.
 *
 * The backend enforces the same `confirm: "DELETE"` literal server-side, so
 * even a scripted call from a stale API client cannot nuke an account
 * without explicit intent.
 *
 * Accessibility:
 *   - Rendered through Portal (escapes overflow-clipped ancestors).
 *   - Focus lands on the typed-confirm input on mount.
 *   - Escape / backdrop / Cancel dismisses.
 *   - Confirm button aria-disabled until the literal matches.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Portal } from '@/components/ui/portal';
import { Button } from '@/components/ui/button';

const REASON_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'not_using', label: "I'm not using Miamo enough" },
  { id: 'found_partner', label: "I found someone" },
  { id: 'privacy', label: 'Privacy concerns' },
  { id: 'harassment', label: 'Harassment or bad experience' },
  { id: 'temp_break', label: 'Just taking a break (consider Deactivate)' },
  { id: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (payload: { confirm: 'DELETE'; reason?: string }) => Promise<void> | void;
  onDeactivate?: () => void;
  submitting?: boolean;
  username?: string | null;
}

export function AccountDeleteModal({ open, onCancel, onConfirm, onDeactivate, submitting, username }: Props) {
  const [typed, setTyped] = useState('');
  const [reasonId, setReasonId] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTyped('');
      setReasonId('');
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onCancel]);

  const confirmEnabled = typed.trim().toUpperCase() === 'DELETE' && !submitting;

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-delete-title"
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={submitting ? undefined : onCancel}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-miamo-card p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted hover:bg-miamo-surface disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 id="account-delete-title" className="text-base font-semibold text-text-primary">Delete your account</h3>
                  <p className="text-xs text-text-muted mt-0.5">This is permanent and cannot be undone.</p>
                </div>
              </div>

              <div className="mb-4 rounded-xl bg-red-500/5 border border-red-500/20 p-3 text-xs text-text-secondary space-y-1">
                <p><strong className="text-text-primary">What gets deleted:</strong> your profile, photos, messages, matches, likes, reports and settings.</p>
                <p><strong className="text-text-primary">What is kept:</strong> anonymised safety-audit rows required by law (no PII).</p>
                <p>Completion: within 30 days per DPDP §11.</p>
              </div>

              <div className="mb-4">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Reason (optional)</label>
                <div className="mt-2 grid gap-1.5">
                  {REASON_OPTIONS.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="delete-reason"
                        value={r.id}
                        checked={reasonId === r.id}
                        onChange={() => setReasonId(r.id)}
                        className="accent-rose-main"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="delete-confirm-input" className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Type DELETE to confirm
                </label>
                <input
                  ref={inputRef}
                  id="delete-confirm-input"
                  type="text"
                  autoComplete="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="DELETE"
                  disabled={submitting}
                  aria-describedby="delete-confirm-hint"
                  className="mt-2 w-full rounded-lg border border-border bg-miamo-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <p id="delete-confirm-hint" className="mt-1 text-[10px] text-text-muted">
                  {username ? <>Your username: <span className="font-mono text-text-secondary">{username}</span></> : 'Type DELETE (all caps).'}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onConfirm({ confirm: 'DELETE', reason: reasonId || undefined })}
                  disabled={!confirmEnabled}
                  loading={submitting}
                  aria-label="Permanently delete my account"
                  className="w-full sm:w-auto"
                >
                  {submitting ? 'Deleting…' : 'Delete forever'}
                </Button>
                {onDeactivate && (
                  <Button variant="ghost" size="sm" onClick={onDeactivate} disabled={submitting} className="w-full sm:w-auto">
                    Deactivate instead
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting} className="w-full sm:w-auto">
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
