'use client';

/**
 * v3.6.0 — "Why am I seeing this?" explainer popover (Discover).
 *
 * Surfaces the top-3 contributing ingredients behind a Discover candidate
 * ranking, expressed as a 1–3 star rating per ingredient. Powered by
 * `GET /api/v1/discover/:targetId/why` (server, Wave 5). When the feature
 * flag is off the endpoint 404s and `api.getDiscoverWhy` returns null —
 * the trigger button is hidden in that case so we don't display an empty
 * popover.
 *
 * Star math (matches server-side rationale):
 *   contribution ≥ 30% of top-3 total → ★★★
 *   15% – 30%                         → ★★
 *   <15%                              → ★
 * If the server already supplies `stars` on each ingredient (current
 * shape), we honor it; otherwise we derive locally from `contribution`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTrackActivity } from '@/hooks/useTrackActivity';

type StarRow = { key: string; label: string; contribution: number; stars: 1 | 2 | 3 };

// ─── Ingredient → emoji icon. Keys cover both the v6/v8 ingredient names
// surfaced by the server today (e.g. `recencyFreshness`, `intentFitRightNow`,
// `earnedVisibility`, `fairnessFloor`, `relevance`) AND the 11 v3.6.0
// ingredient names the spec calls out. Unknown keys fall back to ✨.
const INGREDIENT_ICONS: Record<string, string> = {
  interests: '🎯',
  vibe: '✨',
  behaviour: '🧭',
  behavior: '🧭',
  reciprocal: '↔️',
  attention: '👀',
  hesitation: '⏳',
  chronotype: '🌙',
  age: '📅',
  distance: '📍',
  cadence: '💬',
  moveStyle: '🖋',
  // Server v6/v8 ingredient names:
  relevance: '🎯',
  recencyFreshness: '⏳',
  earnedVisibility: '⭐',
  fairnessFloor: '⚖️',
  intentFitRightNow: '🧭',
};

function iconFor(key: string): string {
  return INGREDIENT_ICONS[key] ?? '✨';
}

function deriveStars(contribution: number, total: number): 1 | 2 | 3 {
  const ratio = total > 0 ? contribution / total : 0;
  if (ratio >= 0.3) return 3;
  if (ratio >= 0.15) return 2;
  return 1;
}

/**
 * Renders the small "i" trigger + popover on a Discover ProfileCard.
 *
 * @param targetId        — the candidate's user id (passed to the why endpoint).
 * @param onLessLikeThis  — optional handler invoked when the user clicks
 *                          "Show me less like this". Defaults to a server
 *                          POST via api.passUserFeedback with reason
 *                          'less_like_this'. The Discover page wires its
 *                          own implementation that also advances the deck.
 */
export function WhyCard({
  targetId,
  onLessLikeThis,
}: {
  targetId: string;
  onLessLikeThis?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState(false); // feature flag off → endpoint 404
  const [rows, setRows] = useState<StarRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const trackActivity = useTrackActivity();

  // Reset state when the target changes so the next card starts fresh.
  useEffect(() => {
    setOpen(false);
    setLoaded(false);
    setHidden(false);
    setRows([]);
    setError(null);
  }, [targetId]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fetchWhy = useCallback(async () => {
    if (loaded || hidden) return;
    try {
      const res = await api.getDiscoverWhy(targetId);
      if (res === null) {
        // Feature flag off — hide trigger entirely.
        setHidden(true);
        return;
      }
      const total = (res.stars || []).reduce((acc: number, r) => acc + (r.contribution || 0), 0);
      const normalized: StarRow[] = (res.stars || []).slice(0, 3).map((r) => ({
        key: r.key,
        label: r.label,
        contribution: Number(r.contribution || 0),
        stars: (r.stars ?? deriveStars(r.contribution || 0, total)) as 1 | 2 | 3,
      }));
      setRows(normalized);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load');
      setLoaded(true);
    }
  }, [targetId, loaded, hidden]);

  const handleOpen = () => {
    setOpen(true);
    void fetchWhy();
    trackActivity('why.opened', 'profile', targetId);
  };

  const handleLessLikeThis = () => {
    trackActivity('why.less_like_this', 'profile', targetId);
    if (onLessLikeThis) {
      onLessLikeThis();
    } else {
      // Fallback: fire the pass-feedback endpoint with a 'less_like_this'
      // reason so the negative-signal pipeline still learns from the click
      // even if the parent page hasn't wired its own handler.
      api.passUserFeedback(targetId, 'less_like_this').catch(() => {});
    }
    setOpen(false);
  };

  if (hidden) return null;

  return (
    <div className="absolute top-3 right-3 z-20">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Why am I seeing this?"
        title="Why am I seeing this?"
        className="w-8 h-8 rounded-full bg-white/85 backdrop-blur-md border border-white/60 flex items-center justify-center hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition"
      >
        <Info className="w-4 h-4 text-stone-700" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Why this match"
            className="absolute right-0 top-10 w-[280px] rounded-2xl bg-white border border-[#E9DCC9] shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-4 z-30"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[12px] font-bold text-stone-900">Why this match?</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Top signals contributing to your ranking</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-md bg-stone-50 flex items-center justify-center hover:bg-stone-100 transition"
                aria-label="Close"
              >
                <X className="w-3 h-3 text-stone-500" />
              </button>
            </div>

            {!loaded && !error && (
              <div className="py-4 flex items-center justify-center">
                <span className="text-[11px] text-stone-400">Loading…</span>
              </div>
            )}

            {error && (
              <div className="py-2">
                <p className="text-[11px] text-stone-500">Could not load explainer.</p>
              </div>
            )}

            {loaded && !error && rows.length === 0 && (
              <p className="py-2 text-[11px] text-stone-500">No signals to show yet.</p>
            )}

            {loaded && !error && rows.length > 0 && (
              <ul className="space-y-2 mb-3">
                {rows.map((r) => (
                  <li
                    key={r.key}
                    className="flex items-center gap-2.5 rounded-xl bg-[#FBF7F2] ring-1 ring-[#E9DCC9]/60 px-3 py-2"
                  >
                    <span className="text-[16px] leading-none" aria-hidden>{iconFor(r.key)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-stone-800 truncate">{r.label}</p>
                      <p className="text-[14px] tracking-wide leading-none text-amber-500" aria-label={`${r.stars} of 3 stars`}>
                        {renderStars(r.stars)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={handleLessLikeThis}
              className="w-full h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100 transition"
            >
              <ThumbsDown className="w-3 h-3" /> Show me less like this
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function renderStars(n: 1 | 2 | 3): string {
  if (n >= 3) return '★★★';
  if (n === 2) return '★★☆';
  return '★☆☆';
}
