'use client';

/**
 * MatchSuccessModal — v3.6.1 (1.1.0-dev) post-match Move v2 surface.
 *
 * Opens from Discover/handleLike when `api.sendLike()` returns
 * `{ isMutual: true, chat: { id } }`. Fetches 5 Move v2 suggestions via
 * the now-v2-aware `/api/v1/discover/move-suggestions/:targetId` route
 * and pre-fills the input on tap. Reuses MoveSuggestionList from
 * messages/components so the chat composer and this modal stay visually
 * in sync.
 *
 * Telemetry:
 *   - On open: `match.move_v2_modal_shown` (strict-validated)
 *   - On send: `move.suggestion_accepted` via useTrackMoveAccepted
 *
 * Falls back gracefully when FEATURE_MOVE_V2_ENABLED=0 (server returns
 * the v1 envelope; we map it into the same chip shape).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send } from 'lucide-react';
import { Portal } from '@/components/ui/portal';
import { api } from '@/lib/api';
import { track } from '@/lib/track';
import { useTrackMoveAccepted, type V8MoveTone } from '@/hooks/useTrackActivity';
import { MoveSuggestionList, type MoveSuggestion } from '@/app/(main)/messages/components/MoveSuggestionList';

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

export interface MatchedUser {
  id: string;
  displayName: string;
  photo?: string | null;
}

export function MatchSuccessModal({
  isOpen,
  onClose,
  matchedUser,
  chatId,
  receiverHash,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  matchedUser: MatchedUser;
  // Chat id is returned by the server on a mutual match. When absent the
  // modal falls back to creating/looking up the chat via
  // api.startOrGetChatWith — but in the canonical flow it is present.
  chatId?: string;
  // Pre-hashed receiver hash for the `move.suggestion_accepted` emit.
  // Optional — when absent the v8 emit guard drops the event silently.
  receiverHash?: string;
  onSent: () => void;
}) {
  const [suggestions, setSuggestions] = useState<MoveSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [selectedMeta, setSelectedMeta] = useState<{ slotIndex: number; hookCategory: string; tone: string } | null>(null);
  const [sending, setSending] = useState(false);
  const trackAccepted = useTrackMoveAccepted();

  // Fetch suggestions on open.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDraft('');
      setSelectedMeta(null);
      try {
        const r = (await api.getMoveSuggestions(matchedUser.id)) as any;
        if (cancelled) return;
        // v2 path: { suggestions, fallbackCount, source: 'v2' }
        if (r?.suggestions?.length) {
          const list: MoveSuggestion[] = r.suggestions.slice(0, 5).map((s: any, i: number) => ({
            text: s.text,
            tone: s.tone || 'casual',
            slotIndex: typeof s.slotIndex === 'number' ? s.slotIndex : i,
            hookCategory: s.hookCategory || 'generic',
            hookText: s.hookText,
            rightNowMatched: s.rightNowMatched,
          }));
          setSuggestions(list);
          // Emit match.move_v2_modal_shown — strict-validated v8 event.
          if (receiverHash) {
            try { track('match.move_v2_modal_shown', { receiverHash, source: 'discover', suggestionCount: list.length }); } catch { /* ignore */ }
          }
          return;
        }
        // v1 path: { data: [...] }
        const items = (r?.data || []).slice(0, 5);
        const list: MoveSuggestion[] = items.map((s: any, i: number) => ({
          text: s.text,
          tone: 'casual',
          slotIndex: i,
          hookCategory: 'generic',
        }));
        setSuggestions(list);
        if (receiverHash) {
          try { track('match.move_v2_modal_shown', { receiverHash, source: 'discover', suggestionCount: list.length }); } catch { /* ignore */ }
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setError('Could not load suggestions.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, matchedUser.id, receiverHash]);

  const handlePick = useCallback((s: MoveSuggestion) => {
    setDraft(s.text);
    setSelectedMeta({ slotIndex: s.slotIndex, hookCategory: s.hookCategory, tone: s.tone });
  }, []);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      // Resolve chat id — prefer the server-supplied id from the mutual-like
      // response. Fall back to openChatWith (the existing messaging route)
      // when missing so the modal still works for retried matches.
      let resolvedChatId = chatId;
      if (!resolvedChatId) {
        try {
          const c: any = await api.openChatWith(matchedUser.id);
          resolvedChatId = c?.id || c?.data?.id;
        } catch { /* fall through */ }
      }
      if (!resolvedChatId) throw new Error('No chat id available');

      await api.sendMessage(resolvedChatId, text, 'text');

      // Emit move.suggestion_accepted only when a chip was tapped (i.e. user
      // didn't fully rewrite). The v8 KPI tracks this against composed.
      if (selectedMeta && receiverHash) {
        trackAccepted(receiverHash, selectedMeta.slotIndex, selectedMeta.hookCategory, coerceTone(selectedMeta.tone));
      }
      onSent();
      onClose();
    } catch {
      // Surface a soft error — the modal stays open so the user can retry.
      setError('Could not send. Try again.');
    } finally {
      setSending(false);
    }
  }, [draft, sending, chatId, matchedUser.id, selectedMeta, receiverHash, trackAccepted, onSent, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed inset-x-4 bottom-6 max-w-md mx-auto bg-miamo-card border border-border rounded-[20px] shadow-2xl z-[70] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`It's a match with ${matchedUser.displayName}`}
          >
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                {matchedUser.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={matchedUser.photo}
                    alt={matchedUser.displayName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-rose-main/40"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-rose-main/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-rose-main" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-[15px] font-bold text-text-primary">
                    It&apos;s a match with {matchedUser.displayName}!
                  </h3>
                  <p className="text-[11px] text-text-muted">Pick a Move to break the ice.</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center" aria-label="Close">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              {/* Suggestion chips */}
              <MoveSuggestionList
                suggestions={suggestions}
                loading={loading}
                error={error}
                onPick={handlePick}
              />

              {/* Editable draft input */}
              <div className="space-y-2">
                <label htmlFor="match-move-draft" className="sr-only">Your message</label>
                <textarea
                  id="match-move-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Tap a suggestion above, or write your own…"
                  rows={2}
                  className="w-full rounded-xl bg-miamo-surface border border-border text-text-primary text-[13px] px-3 py-2 resize-none focus:outline-none focus:border-rose-main/40 placeholder:text-text-muted"
                />
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 h-10 rounded-xl border border-border text-text-secondary text-[12px] font-semibold hover:bg-miamo-surface transition"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="flex-[2] h-10 rounded-xl bg-rose-main text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-main/90"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
