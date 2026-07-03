'use client';

/**
 * MoveSuggestionList — v3.6.1 (1.1.0-dev).
 *
 * Shared suggestion-chip list extracted from MoveV2Picker so the chat
 * composer (MoveV2Picker) and the post-match Discover modal
 * (MatchSuccessModal) render identical chips without duplicating UI.
 *
 * Caller is responsible for fetching suggestions — this component only
 * renders, badges, and reports taps. It is intentionally framework-light
 * (no data fetching, no toast, no router) so the two surfaces share a
 * single visual contract.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface MoveSuggestion {
  text: string;
  tone: string;            // free-form when v1; v2 enum tone otherwise
  slotIndex: number;
  hookCategory: string;
  hookText?: string;
  rightNowMatched?: boolean;
}

// because: hook category → user-facing chip badge. Mirrors HOOK_BADGE in
// MoveV2Picker.tsx — kept in sync via this single component.
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

export function MoveSuggestionList({
  suggestions,
  loading,
  error,
  onPick,
  emptyLabel = 'No suggestions just yet.',
}: {
  suggestions: MoveSuggestion[];
  loading: boolean;
  error: string | null;
  onPick: (s: MoveSuggestion) => void;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-rose-main animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-[12px] text-text-muted">{error}</p>
      </div>
    );
  }
  if (suggestions.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-[12px] text-text-muted">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-[55vh] overflow-y-auto">
      {suggestions.map((s) => {
        const badge = hookBadge(s.hookCategory);
        return (
          <button
            key={`${s.slotIndex}-${s.hookCategory}`}
            onClick={() => onPick(s)}
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
  );
}
