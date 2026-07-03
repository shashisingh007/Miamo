'use client';

// ─── First-run tutorial modal (G.18) ─────────────────────────────
//
// Purpose: a dismissible 3-slide walkthrough that shows exactly once
// after the very first login. Progress-persistent via localStorage —
// if the user closes the browser mid-tutorial, the next mount resumes
// on the same slide.
//
// Feature flag: `NEXT_PUBLIC_FEATURE_TUTORIAL_ENABLED=1`. Off (default)
// = the modal never mounts (returns null immediately). On = the modal
// mounts on first render, reads its `dismissed` state from localStorage,
// and hides once the user completes or explicitly skips.
//
// Storage key: `miamo:tutorial:v1` (JSON: { dismissed: boolean, step: number })
// The version suffix lets us reset the tutorial when we publish v2.

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';
import { Portal } from '@/components/ui/portal';

const STORAGE_KEY = 'miamo:tutorial:v1';

export interface TutorialSlide {
  title: string;
  body: string;
  /** Optional lucide icon key rendered above the title. */
  icon?: React.ReactNode;
}

/** Default 3-slide script — the "welcome tour" for a first-time user. */
export const DEFAULT_SLIDES: TutorialSlide[] = [
  {
    title: 'Miamo takes its time.',
    body: 'No swiping. A small, considered queue every day. Quality signals over quantity.',
  },
  {
    title: 'Every action teaches the ranker.',
    body: 'When you pass with a reason, we learn the pattern. Better matches ship the next session.',
  },
  {
    title: 'The first Move is the whole game.',
    body: 'When you match, open the chat. A specific, small ask beats "hey" every time.',
  },
];

interface TutorialState { dismissed: boolean; step: number }

function loadState(): TutorialState {
  if (typeof window === 'undefined') return { dismissed: false, step: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: false, step: 0 };
    const parsed = JSON.parse(raw);
    return {
      dismissed: !!parsed.dismissed,
      step: Number.isFinite(parsed.step) ? Math.max(0, Math.min(parsed.step, 100)) : 0,
    };
  } catch { return { dismissed: false, step: 0 }; }
}

function saveState(state: TutorialState): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore quota */ }
}

export function isTutorialEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_FEATURE_TUTORIAL_ENABLED === '1';
}

/**
 * TutorialModal — controlled or uncontrolled entry point.
 *
 * Uncontrolled: <TutorialModal /> — reads localStorage, mounts if not
 *   dismissed and the feature flag is on.
 *
 * Controlled: <TutorialModal open={isOpen} onClose={...} slides={...} /> —
 *   caller owns the visibility. Useful for previews / re-open from Help
 *   menu ignoring the "already dismissed" state.
 */
export function TutorialModal({
  slides = DEFAULT_SLIDES,
  open: openProp,
  onClose,
}: {
  slides?: TutorialSlide[];
  open?: boolean;
  onClose?: () => void;
} = {}) {
  const [state, setState] = useState<TutorialState>({ dismissed: true, step: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (openProp === undefined) {
      setState(loadState());
    }
  }, [openProp]);

  const controlled = openProp !== undefined;
  const open = controlled ? !!openProp : (mounted && !state.dismissed && isTutorialEnabled());
  const step = Math.max(0, Math.min(state.step, slides.length - 1));

  const persist = useCallback((next: TutorialState) => {
    setState(next);
    if (!controlled) saveState(next);
  }, [controlled]);

  const advance = useCallback(() => {
    if (step >= slides.length - 1) {
      persist({ dismissed: true, step: slides.length - 1 });
      onClose?.();
    } else {
      persist({ dismissed: false, step: step + 1 });
    }
  }, [step, slides.length, persist, onClose]);

  const skip = useCallback(() => {
    persist({ dismissed: true, step });
    onClose?.();
  }, [step, persist, onClose]);

  // Escape to skip.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, skip]);

  if (!open) return null;
  const current = slides[step];

  return (
    <AnimatePresence>
      <Portal>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
          onClick={skip}
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed inset-x-4 bottom-6 max-w-md mx-auto bg-miamo-card border border-border rounded-2xl shadow-2xl z-[80] p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="miamo-tutorial-title"
        >
          <button onClick={skip} aria-label="Skip tutorial" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center">
            <X className="w-4 h-4 text-text-muted" aria-hidden="true" />
          </button>
          {current.icon && <div className="mb-4">{current.icon}</div>}
          <h2 id="miamo-tutorial-title" className="text-lg font-bold text-text-primary mb-2">{current.title}</h2>
          <p className="text-[14px] text-text-secondary leading-relaxed mb-5">{current.body}</p>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-5" role="progressbar" aria-valuemin={1} aria-valuemax={slides.length} aria-valuenow={step + 1}>
            {slides.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-rose-main' : 'w-1.5 bg-border'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={skip} className="flex-1 h-10 rounded-xl border border-border text-text-secondary text-[13px] font-semibold">
              Skip
            </button>
            <button onClick={advance} className="flex-[2] h-10 rounded-xl bg-rose-main text-white text-[13px] font-bold flex items-center justify-center gap-1.5">
              {step >= slides.length - 1 ? (
                <><Check className="w-4 h-4" aria-hidden="true" /> Done</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" aria-hidden="true" /></>
              )}
            </button>
          </div>
        </motion.div>
      </Portal>
    </AnimatePresence>
  );
}

/** Test helper: reset localStorage. */
export function _resetTutorialForTests(): void {
  if (typeof window !== 'undefined') { try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ } }
}
