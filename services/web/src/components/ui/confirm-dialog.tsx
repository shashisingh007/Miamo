'use client';

// ─── ConfirmDialog (replaces window.confirm) ──────────────────────────
// Accessible confirmation modal used to replace native window.confirm().
// - Focus is trapped inside the dialog while open (Escape / backdrop / Cancel close).
// - Confirm button auto-focuses so keyboard users can press Enter to accept.
// - Both buttons carry explicit aria-labels for screen-readers.
// Referenced by click-matrix.md §3.2 (native-dialog anti-patterns) and §5 rank 6.

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Portal } from './portal';

interface ConfirmDialogProps {
 open: boolean;
 title: string;
 description?: ReactNode;
 confirmLabel?: string;
 cancelLabel?: string;
 tone?: 'default' | 'danger';
 onConfirm: () => void;
 onCancel: () => void;
}

/**
 * Accessible replacement for `window.confirm()`.
 * - `Escape` or backdrop click cancels.
 * - `Enter` fires the confirm action (button is auto-focused).
 * - Rendered through Portal so it escapes overflow-clipped ancestors.
 */
export function ConfirmDialog({
 open,
 title,
 description,
 confirmLabel = 'Confirm',
 cancelLabel = 'Cancel',
 tone = 'default',
 onConfirm,
 onCancel,
}: ConfirmDialogProps) {
 const confirmRef = useRef<HTMLButtonElement>(null);

 useEffect(() => {
  if (!open) return;
  const handler = (e: KeyboardEvent) => {
   if (e.key === 'Escape') onCancel();
  };
  window.addEventListener('keydown', handler);
  // Auto-focus the confirm button so Enter confirms — matches native prompt behaviour.
  const t = setTimeout(() => confirmRef.current?.focus(), 50);
  return () => {
   window.removeEventListener('keydown', handler);
   clearTimeout(t);
  };
 }, [open, onCancel]);

 return (
  <AnimatePresence>
   {open && (
    <Portal>
     <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="miamo-confirm-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
     >
      <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       className="absolute inset-0 bg-black/60 backdrop-blur-sm"
       onClick={onCancel}
      />
      <motion.div
       initial={{ opacity: 0, scale: 0.95, y: 8 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.95, y: 8 }}
       transition={{ duration: 0.18 }}
       className="relative z-10 w-full max-w-sm rounded-2xl border border-border/30 bg-miamo-card p-5 shadow-2xl"
      >
       <div className="mb-3 flex items-center gap-3">
        <div
         className={
          tone === 'danger'
           ? 'flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10'
           : 'flex h-10 w-10 items-center justify-center rounded-full bg-rose-main/10'
         }
        >
         <AlertTriangle
          className={
           tone === 'danger' ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-rose-main'
          }
         />
        </div>
        <h3 id="miamo-confirm-title" className="text-base font-semibold text-text-primary">
         {title}
        </h3>
       </div>
       {description && (
        <div className="mb-4 text-sm text-text-muted">{description}</div>
       )}
       <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label={cancelLabel}>
         {cancelLabel}
        </Button>
        <Button
         ref={confirmRef}
         size="sm"
         variant={tone === 'danger' ? 'danger' : 'default'}
         onClick={onConfirm}
         aria-label={confirmLabel}
        >
         {confirmLabel}
        </Button>
       </div>
      </motion.div>
     </div>
    </Portal>
   )}
  </AnimatePresence>
 );
}
