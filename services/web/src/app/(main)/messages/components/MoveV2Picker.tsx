'use client';

/**
 * Move v2 suggestion picker (v3.6.0) — bottom-sheet 5-chip composer helper.
 *
 * Wired into the chat composer as a small "Suggest" sparkle button next to
 * the message input. When the user taps it, we fetch 5 ranked openers
 * scored by their sender-voice fingerprint × receiver resonance × hook
 * strength. Tapping a chip pre-fills the input and emits
 * `move.suggestion_accepted` so the server-side bandit converges.
 *
 * Source selection:
 *   - When `itemId` is provided we call /creativity/items/:id/move-suggestions-v2
 *     (the v2 composer endpoint).
 *   - Otherwise we fall back to v1 /discover/move-suggestions/:targetId so the
 *     chat composer still works for plain matches with no creativity context.
 *
 * The server endpoint 404s when FEATURE_MOVE_V2_ENABLED=0 — we silently fall
 * back to v1 in that case so the UI degrades gracefully without flag-gating
 * on the client.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTrackMoveAccepted, type V8MoveTone } from '@/hooks/useTrackActivity';

interface Suggestion {
  text: string;
  tone: string;        // free-form when fallback
  slotIndex: number;
  hookCategory: string;
  hookText?: string;
  rightNowMatched?: boolean;
}

// because: hook category → user-facing chip badge. The category enum is
// authored in services/shared/src/algo/v8/moveV2/hookLibrary.ts.
const HOOK_BADGE: Record<string, { icon: string; label: string }> = {
  recent_post: { icon: '📍', label: 'their post' },
  shared_interest: { icon: '✨', label: 'shared interest' },
  dtm_topic: { icon: '💍', label: 'values' },
  festival: { icon: '🎉', label: 'happening now' },
  same_city: { icon: '📍', label: 'same city' },
  music: { icon: '🎵', label: 'same music' },
  travel: { icon: '✈️', label: 'travel' },
  food: { icon: '🍜', label: 'food' },
  generic: { icon: '💬', label: 'opener' },
};

function hookBadge(cat: string) {
  return HOOK_BADGE[cat] || { icon: '💬', label: cat.replace(/_/g, ' ') };
}

// because: server free-form tones → v8 enum tones for the accepted-emit guard.
// Anything unrecognised maps to "casual" so the guard never silently drops.
function coerceTone(t: string): V8MoveTone {
  switch (t) {
    case 'reflective':
    case 'casual':
    case 'tactile':
    case 'quick':
      return t;
    default:
      return 'casual';
  }
}

export function MoveV2Picker({
  isOpen,
  onClose,
  itemId,
  targetUserId,
  receiverHash,
  onPick,
}: {
  isOpen: boolean;
  onClose: () => void;
  // Creativity item id — if present we hit /move-suggestions-v2; else fall back.
  itemId?: string;
  // Receiver user id (for the v1 fallback route)
  targetUserId?: string;
  // Pre-hashed receiver hash so the accept-event payload stays consistent
  // across composer calls. When absent, the emit is dropped silently by the
  // v8Emit guard (length-check).
  receiverHash?: string;
  // Called with the selected text — caller decides whether to set the input
  // value, append it, or send-on-tap.
  onPick: (text: string, meta: { slotIndex: number; hookCategory: string; tone: string }) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 0x7fffffff));
  const trackAccepted = useTrackMoveAccepted();

  const load = useCallback(async (nextSeed: number) => {
    setLoading(true);
    setError(null);
    try {
      if (itemId) {
        // v2 path — falls back to v1 below if the flag is OFF (404).
        try {
          const r = await api.getMoveV2Suggestions(itemId, { n: 5, seed: nextSeed });
          if (r?.suggestions?.length) {
            setSuggestions(r.suggestions.slice(0, 5).map((s, i) => ({
              text: s.text,
              tone: s.tone || 'casual',
              slotIndex: typeof s.slotIndex === 'number' ? s.slotIndex : i,
              hookCategory: s.hookCategory || 'generic',
              hookText: s.hookText,
              rightNowMatched: s.rightNowMatched,
            })));
            return;
          }
        } catch (err: any) {
          // v2 disabled or item-not-found — fall through to v1 if we have a target.
          if (err?.statusCode !== 404 || !targetUserId) {
            // Other errors: surface but still try v1 as fallback below.
          }
        }
      }
      if (targetUserId) {
        const r = await api.getMoveSuggestions(targetUserId);
        const items = (r?.data || []).slice(0, 5);
        setSuggestions(items.map((s, i) => ({
          text: s.text,
          tone: 'casual',
          slotIndex: i,
          hookCategory: 'generic',
        })));
        return;
      }
      setSuggestions([]);
      setError('No suggestions available.');
    } catch {
      setSuggestions([]);
      setError('Could not load suggestions.');
    } finally {
      setLoading(false);
    }
  }, [itemId, targetUserId]);

  useEffect(() => {
    if (!isOpen) return;
    load(seed);
  }, [isOpen, seed, load]);

  const handlePick = useCallback((s: Suggestion) => {
    if (receiverHash) {
      trackAccepted(receiverHash, s.slotIndex, s.hookCategory, coerceTone(s.tone));
    }
    onPick(s.text, { slotIndex: s.slotIndex, hookCategory: s.hookCategory, tone: s.tone });
    onClose();
  }, [receiverHash, trackAccepted, onPick, onClose]);

  const handleRegenerate = useCallback(() => {
    setSeed(Math.floor(Math.random() * 0x7fffffff));
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed inset-x-4 bottom-6 max-w-sm mx-auto bg-miamo-card border border-border rounded-[20px] shadow-2xl z-50 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Suggested openers"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-main/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-rose-main" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[13px] font-bold text-text-primary">Suggested openers</h3>
                  <p className="text-[11px] text-text-muted">Tap one to drop it into your message.</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center" aria-label="Close">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              {loading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-rose-main animate-spin" />
                </div>
              ) : error ? (
                <div className="py-6 text-center">
                  <p className="text-[12px] text-text-muted">{error}</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[12px] text-text-muted">No suggestions just yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                  {suggestions.map((s) => {
                    const badge = hookBadge(s.hookCategory);
                    return (
                      <button
                        key={`${s.slotIndex}-${s.hookCategory}`}
                        onClick={() => handlePick(s)}
                        className="w-full text-left rounded-xl border border-border bg-miamo-surface hover:border-rose-main/50 hover:bg-rose-main/5 transition-all px-3 py-2.5 group"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-rose-main font-semibold">
                            {badge.icon} {s.hookText || badge.label}
                          </span>
                          {s.rightNowMatched && (
                            <span className="text-[9px] uppercase tracking-wider text-rose-alt bg-rose-alt/10 px-1.5 py-0.5 rounded-full font-semibold">
                              right now
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-text-primary group-hover:text-text-primary leading-snug">
                          {s.text}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="w-full h-10 rounded-xl bg-miamo-surface border border-border text-text-secondary text-[12px] font-medium hover:bg-miamo-elevated transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Try again
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
