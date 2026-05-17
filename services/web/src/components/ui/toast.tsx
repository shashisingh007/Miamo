'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Info, X, Heart, Sparkles, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'love' | 'premium';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (options: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  love: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

// ═══════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Access the toast notification context.
 * Must be used within a `<ToastProvider>`. Provides `toast()`, `success()`,
 * `error()`, `info()`, `love()`, and `dismiss()` methods.
 *
 * @throws Error if used outside of ToastProvider
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ═══════════════════════════════════════════════════════
// TOAST VARIANTS
// ═══════════════════════════════════════════════════════

const toastStyles: Record<ToastType, { bg: string; border: string; iconBg: string; iconColor: string; icon: ReactNode }> = {
  success: {
    bg: 'bg-gradient-to-r from-white to-emerald-50/60 dark:from-[#0E0812] dark:to-emerald-950/30',
    border: 'border-emerald-200/50 dark:border-emerald-800/30',
    iconBg: 'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40',
    iconColor: 'text-emerald-500',
    icon: <Check className="w-4 h-4" />,
  },
  error: {
    bg: 'bg-gradient-to-r from-white to-red-50/60 dark:from-[#0E0812] dark:to-red-950/30',
    border: 'border-red-200/50 dark:border-red-800/30',
    iconBg: 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40',
    iconColor: 'text-red-500',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  info: {
    bg: 'bg-gradient-to-r from-white to-sky-50/60 dark:from-[#0E0812] dark:to-sky-950/30',
    border: 'border-sky-200/50 dark:border-sky-800/30',
    iconBg: 'bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/40 dark:to-blue-900/40',
    iconColor: 'text-sky-500',
    icon: <Info className="w-4 h-4" />,
  },
  warning: {
    bg: 'bg-gradient-to-r from-white to-amber-50/60 dark:from-[#0E0812] dark:to-amber-950/30',
    border: 'border-amber-200/50 dark:border-amber-800/30',
    iconBg: 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40',
    iconColor: 'text-amber-500',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  love: {
    bg: 'bg-gradient-to-r from-white to-pink-50/60 dark:from-[#0E0812] dark:to-pink-950/30',
    border: 'border-pink-200/50 dark:border-pink-800/30',
    iconBg: 'bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40',
    iconColor: 'text-pink-500',
    icon: <Heart className="w-4 h-4" />,
  },
  premium: {
    bg: 'bg-gradient-to-r from-white to-amber-50/60 dark:from-[#0E0812] dark:to-amber-950/30',
    border: 'border-amber-300/50 dark:border-amber-700/30',
    iconBg: 'bg-gradient-to-br from-amber-100 to-gold-100 dark:from-amber-900/40 dark:to-yellow-900/40',
    iconColor: 'text-amber-500',
    icon: <Sparkles className="w-4 h-4" />,
  },
};

// ═══════════════════════════════════════════════════════
// TOAST ITEM
// ═══════════════════════════════════════════════════════

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const style = toastStyles[toast.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, x: 20, scale: 0.9, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 40, scale: 0.9, filter: 'blur(4px)' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'relative max-w-sm w-full rounded-2xl border p-3.5 shadow-xl backdrop-blur-xl cursor-pointer overflow-hidden',
        style.bg, style.border
      )}
      onClick={() => onDismiss(toast.id)}
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer-slide_3s_ease-in-out_infinite]" />
      </div>

      <div className="flex items-start gap-3 relative z-10">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner', style.iconBg)}>
          <span className={style.iconColor}>{toast.icon || style.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{toast.title}</p>
          {toast.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{toast.description}</p>
          )}
          {toast.action && (
            <button
              onClick={(e) => { e.stopPropagation(); toast.action!.onClick(); onDismiss(toast.id); }}
              className="mt-2 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const toast: Toast = { ...options, id };
    setToasts(prev => [...prev.slice(-4), toast]); // max 5 toasts

    const duration = options.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, description) => addToast({ type: 'success', title, description }),
    error: (title, description) => addToast({ type: 'error', title, description }),
    info: (title, description) => addToast({ type: 'info', title, description }),
    love: (title, description) => addToast({ type: 'love', title, description }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast portal */}
      <div className="toast-container" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
