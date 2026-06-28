'use client';
// ─── Creativity Reels (v3.5) ──────────────────────────
// One-card-at-a-time TikTok-style surface for the Creativity feature. Pulls
// from /api/v1/creativity/reels (server-ranked, suppression-aware) and exposes
// the full action toolbar — like, dislike, beat, AI Move, save, share, report,
// not-interested, hide-author. Every negative action funnels back into the
// reels suppression query so the user feels the change on the very next card.
//
// State is cached per-category in localStorage so leaving the page and coming
// back doesn't wipe the feed or your scroll position in the deck.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, ThumbsDown, Flame, Save, Share2, MoreVertical,
  ChevronUp, ChevronDown, MessageCircle, Sparkles,
  Eye, Loader2, Image as ImageIcon, Type as TypeIcon, Video as VideoIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCachedResource } from '@/hooks/useCachedResource';
import { usePersistentState } from '@/hooks/usePersistentState';
import { engagementTracker } from '@/lib/track/collectors/engagement';
import type { Category } from './constants';
import { timeAgo, fmt } from './constants';

interface ReelItem {
  id: string;
  title: string;
  content?: string;
  mediaType: 'text' | 'image' | 'video' | string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  minutesPaid?: number;
  expiresAt?: string | null;
  status: string;
  createdAt: string;
  trendScore: number;
  category: string | null;
  author: {
    id: string;
    displayName: string;
    username?: string;
    verified?: boolean;
    photos?: Array<{ url: string }>;
    profile?: { city?: string; age?: number };
  };
  counts: { beats: number; comments: number; views: number; saves: number };
  viewer: { liked: boolean; saved: boolean; moved: boolean };
}

interface Props {
  activeCat: string;
  categories: Category[];
  onOpenComments: (item: any) => void;
  onOpenMove: (item: any, suggestions?: Array<{ tone: string; line: string }>) => void;
  showToast: (msg: string) => void;
  refreshBalance: () => void;
  /** 'reels' = videos only (legacy). 'all' = unified feed (text/photo/video). */
  source?: 'reels' | 'all';
  sort?: 'trending' | 'recent' | 'top';
  search?: string;
}

const PREFETCH = 5; // server returns up to this many; we render one at a time.

interface CachedReels {
  items: ReelItem[];
  cursor: string | null;
  exhausted: boolean;
}

export function ReelsView({ activeCat, categories, onOpenComments, onOpenMove, showToast, refreshBalance, source = 'reels', sort = 'trending', search = '' }: Props) {
  const trimmedSearch = search.trim().toLowerCase();
  const cacheKey = source === 'all'
    ? `creativity:feed:${activeCat || 'general'}:${sort}:${trimmedSearch}`
    : `creativity:reels:${activeCat || 'general'}`;
  const fetchPage = useCallback(async (cursor: string | null): Promise<{ items: ReelItem[]; cursor: string | null }> => {
    const params: Record<string, string> = { limit: String(PREFETCH) };
    if (activeCat && activeCat !== 'general' && activeCat !== 'all') params.category = activeCat;
    if (cursor) params.cursor = cursor;
    if (source === 'all') {
      params.sort = sort;
      if (trimmedSearch) params.q = trimmedSearch;
      const res = (activeCat === 'general' || !activeCat) && sort === 'trending' && !trimmedSearch
        ? await api.getCreativityFeed(params)
        : await api.getCreativityItems(params);
      const raw = (res?.data || []) as any[];
      // Normalize the flat board-API shape to the ReelItem shape this view expects.
      const items: ReelItem[] = raw.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        mediaType: r.mediaType ?? r.type ?? 'text',
        mediaUrl: r.mediaUrl ?? null,
        thumbnailUrl: r.thumbnailUrl ?? null,
        durationSec: r.durationSec ?? null,
        minutesPaid: r.minutesPaid,
        expiresAt: r.expiresAt ?? null,
        status: r.status ?? 'live',
        createdAt: r.createdAt,
        trendScore: r.trendScore ?? 0,
        category: r.category?.name ?? r.categoryName ?? null,
        author: {
          id: r.author?.id ?? r.authorId ?? '',
          displayName: r.author?.displayName ?? r.authorDisplayName ?? 'Someone',
          verified: r.author?.verified ?? false,
          photos: r.author?.photos,
          profile: r.author?.profile,
        },
        counts: {
          beats: r.counts?.beats ?? r.beatCount ?? r.reactionCount ?? 0,
          comments: r.counts?.comments ?? r.commentCount ?? 0,
          views: r.counts?.views ?? r.views ?? 0,
          saves: r.counts?.saves ?? r.saveCount ?? 0,
        },
        viewer: {
          liked: r.viewer?.liked ?? !!r.liked,
          saved: r.viewer?.saved ?? !!r.saved,
          moved: r.viewer?.moved ?? !!r.moved,
        },
      }));
      return { items, cursor: res?.cursor ?? null };
    }
    const res = await api.getCreativityReels(params);
    return { items: (res?.data || []) as ReelItem[], cursor: res?.cursor ?? null };
  }, [activeCat, source, sort, trimmedSearch]);
  const fetchInitial = useCallback(async (): Promise<CachedReels> => {
    const r = await fetchPage(null);
    return { items: r.items, cursor: r.cursor, exhausted: r.items.length === 0 };
  }, [fetchPage]);
  const cache = useCachedResource<CachedReels>(cacheKey, fetchInitial, { freshFor: 30_000 });
  // Cached items written before the normalizer existed may be missing
  // counts/viewer/author. Backfill on read so the JSX + handlers can't crash.
  const items = useMemo<ReelItem[]>(
    () => (cache.data?.items ?? []).map((it) => ({
      ...it,
      counts: it.counts ?? { beats: 0, comments: 0, views: 0, saves: 0 },
      viewer: it.viewer ?? { liked: false, saved: false, moved: false },
      author: it.author ?? ({ id: '', displayName: 'Someone' } as ReelItem['author']),
    })),
    [cache.data?.items],
  );
  const exhausted = cache.data?.exhausted ?? false;
  const cursorRef = useRef<string | null>(cache.data?.cursor ?? null);
  useEffect(() => { cursorRef.current = cache.data?.cursor ?? null; }, [cache.data?.cursor]);

  const [idx, setIdx] = usePersistentState<number>(
    source === 'all'
      ? `creativity:feed:idx:${activeCat || 'general'}:${sort}:${trimmedSearch}`
      : `creativity:reels:idx:${activeCat || 'general'}`,
    0,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const viewStartRef = useRef<number>(Date.now());

  // Clamp idx if the list shrank (e.g. an item was suppressed).
  useEffect(() => {
    if (items.length === 0) { if (idx !== 0) setIdx(0); return; }
    if (idx >= items.length) setIdx(items.length - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    try {
      const r = await fetchPage(cursorRef.current);
      cursorRef.current = r.cursor;
      cache.setData((prev) => ({
        items: [...(prev?.items ?? []), ...r.items],
        cursor: r.cursor,
        exhausted: r.items.length === 0,
      }));
    } catch {
      /* keep cache as-is */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, exhausted, cache, fetchPage]);

  // Auto-fetch more when within 2 of the end.
  useEffect(() => {
    if (!exhausted && !loadingMore && items.length > 0 && idx >= items.length - 2) {
      fetchMore();
    }
  }, [idx, items.length, exhausted, loadingMore, fetchMore]);

  // Fire view dwell when the current card changes.
  const current = items[idx];
  useEffect(() => {
    if (!current) return;
    viewStartRef.current = Date.now();
    // v8: track this card as visible so engagement signals can accumulate.
    // Surface is omitted: 'creativity' is not in the v8 surface enum, and
    // the strict validator would reject it. The tid alone is enough for
    // depth + polarity downstream.
    engagementTracker.onCardVisible(current.id);
    return () => {
      const dwell = Date.now() - viewStartRef.current;
      if (dwell > 500 && current) {
        api.viewCreativityItem(current.id, dwell).catch(() => {});
      }
      // v8: emit depth + polarity for the card the user is leaving.
      // Direction is derived from interaction:
      //   liked  → 'right' (positive)
      //   passed (no like; just scrolled) → 'left' (mild negative)
      //   saved/moved → 'super' / 'up' is handled in onSave/onMove
      // For the default transition (advance with no action), we use
      // 'left' with the dwell-modifier so a short scroll-past reads as a
      // small negative signal and a long dwell reads as neutral/positive.
      const direction: 'left' | 'right' = current.viewer?.liked ? 'right' : 'left';
      try { engagementTracker.commit(current.id, direction); } catch { /* swallow */ }
    };
  }, [current?.id]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); advance(1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); advance(-1); }
      else if (e.key === 'l') { e.preventDefault(); onLike(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, items.length]);

  const advance = (delta: number) => {
    setMoreOpen(false);
    setIdx((i) => Math.max(0, Math.min(items.length - 1, i + delta)));
  };

  const onLike = async () => {
    if (!current) return;
    // v8: record like signal for depth scoring before optimistic UI flip.
    if (!current.viewer?.liked) engagementTracker.onLike(current.id);
    cache.setData((prev) => prev ? {
      ...prev,
      items: prev.items.map((p, i) => i === idx ? { ...p, viewer: { ...p.viewer, liked: !p.viewer.liked }, counts: { ...p.counts, beats: p.counts.beats + (p.viewer.liked ? -1 : 1) } } : p),
    } : prev);
    try {
      const r = await api.reactToCreativity(current.id, 'like');
      if (r?.data?.liked === false) {
        // server says unliked — keep our optimistic state
      } else {
        showToast('Beat sent — author earns Spotlight');
        refreshBalance();
      }
    } catch { /* swallow; UI rolls back on next fetch */ }
  };

  const onBeat = onLike; // beat == positive reaction in current model

  const onDislike = async () => {
    if (!current) return;
    try { await api.dislikeCreativityItem(current.id); } catch {}
    showToast('We’ll show you less like this');
    cache.setData((prev) => prev ? { ...prev, items: prev.items.filter((_, i) => i !== idx) } : prev);
    setIdx((i) => Math.min(i, Math.max(0, items.length - 2)));
  };

  const onSave = async () => {
    if (!current) return;
    cache.setData((prev) => prev ? {
      ...prev,
      items: prev.items.map((p, i) => i === idx ? { ...p, viewer: { ...p.viewer, saved: !p.viewer.saved }, counts: { ...p.counts, saves: p.counts.saves + (p.viewer.saved ? -1 : 1) } } : p),
    } : prev);
    try { await api.saveCreativityItem(current.id); } catch {}
    showToast(current.viewer.saved ? 'Removed' : 'Saved');
  };

  const onShare = async () => {
    if (!current) return;
    try { await api.shareCreativityItem(current.id, 'app'); } catch {}
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/creativity?id=${current.id}`);
      }
    } catch {}
    showToast('Link copied');
    refreshBalance();
  };

  const onMove = async () => {
    if (!current) return;
    let suggestions: Array<{ tone: string; line: string }> | undefined;
    try {
      const r = await api.getCreativityMoveSuggestions(current.id, 3);
      suggestions = r?.data?.suggestions ?? [];
    } catch { /* fall through with empty */ }
    onOpenMove(current, suggestions);
  };

  const onNotInterested = async () => {
    if (!current) return;
    try { await api.notInterestedCreativityItem(current.id, 'not_interested'); } catch {}
    showToast('Hidden — we\u2019ll learn from this');
    cache.setData((prev) => prev ? { ...prev, items: prev.items.filter((_, i) => i !== idx) } : prev);
    setIdx((i) => Math.min(i, Math.max(0, items.length - 2)));
    setMoreOpen(false);
  };

  const onReport = async () => {
    if (!current) return;
    const reason = typeof window !== 'undefined' ? window.prompt('Report reason (spam, abuse, etc.)') : null;
    if (!reason) { setMoreOpen(false); return; }
    try { await api.reportCreativityItem(current.id, reason); } catch {}
    showToast('Reported. Thank you.');
    setMoreOpen(false);
  };

  const onHideAuthor = async () => {
    if (!current) return;
    try { await api.hideCreativityAuthor(current.id); } catch {}
    showToast(`Hidden all from ${current.author.displayName}`);
    cache.setData((prev) => prev ? { ...prev, items: prev.items.filter((p) => p.author.id !== current.author.id) } : prev);
    setIdx(0);
    setMoreOpen(false);
  };

  if (cache.loading && items.length === 0) {
    return <ReelsSkeleton />;
  }

  if (items.length === 0) {
    const catLabel = categories.find((c) => c.id === activeCat)?.label ?? 'this category';
    return (
      <div className="mx-auto flex h-[min(72vh,640px)] max-w-md flex-col items-center justify-center rounded-3xl border border-dashed border-token bg-miamo-card p-8 text-center">
        <Sparkles className="h-8 w-8 text-rose-main" />
        <h3 className="mt-3 text-base font-semibold">No reels in {catLabel}</h3>
        <p className="mt-1 text-xs text-text-muted">You&rsquo;ve seen everything (or hidden it). Try another category, or post your own.</p>
      </div>
    );
  }

  if (!current) return null;
  const cat = categories.find((c) => c.id === current.category)
    ?? categories.find((c) => c.id === 'general')
    ?? { id: 'general', name: 'general', label: 'For You', icon: Sparkles, color: '#C97856' };

  return (
    <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 sm:gap-4">
      {/* Side prev (desktop) */}
      <button
        onClick={() => advance(-1)}
        disabled={idx === 0}
        className="hidden shrink-0 rounded-full border border-token bg-miamo-card p-2.5 text-text-muted shadow-soft transition hover:border-rose-main/40 hover:text-rose-main disabled:opacity-30 disabled:hover:border-token disabled:hover:text-text-muted sm:inline-flex"
        aria-label="Previous"
        title="Previous (↑ or K)"
      >
        <ChevronUp className="h-5 w-5" />
      </button>

      <div className="flex w-full max-w-md flex-col">
        {/* Stage */}
        <div
          className="relative w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5"
          style={{
            background: `linear-gradient(135deg, ${cat.color}33, ${cat.color}11)`,
            height: 'min(78vh, 720px)',
            minHeight: '460px',
          }}
        >
        {/* Media */}
        {current.mediaType === 'video' && current.mediaUrl ? (
          <video
            key={current.id}
            src={current.mediaUrl}
            poster={current.thumbnailUrl || undefined}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : current.mediaType === 'image' && current.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.mediaUrl} alt={current.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-white/70">{current.category ?? 'Creativity'}</div>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-white">{current.title}</h2>
            {current.content && (
              <p className="mt-3 line-clamp-[12] text-sm text-white/90">{current.content}</p>
            )}
          </div>
        )}

        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 pointer-events-none" />

        {/* Top chips */}
        <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2 text-white">
          <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm">
            {current.mediaType === 'video' ? <VideoIcon className="h-3 w-3" /> : current.mediaType === 'image' ? <ImageIcon className="h-3 w-3" /> : <TypeIcon className="h-3 w-3" />}
            {current.category ?? 'general'}
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
            <Eye className="h-3 w-3" /> {fmt(current.counts.views)}
          </div>
        </div>

        {/* Author + caption (bottom-left) */}
        <div className="absolute left-3 right-20 bottom-3 text-white">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/40 bg-white/10">
              {current.author.photos?.[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.author.photos[0].url} alt={current.author.displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold">
                  {current.author.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {current.author.displayName}
                {current.author.verified && <span className="ml-1 inline-block rounded-full bg-emerald-500 px-1 text-[9px] font-bold">✓</span>}
              </div>
              <div className="text-[10px] opacity-80">
                {current.author.profile?.city ?? ''}{current.author.profile?.city && current.author.profile?.age ? ' \u00b7 ' : ''}{current.author.profile?.age ?? ''}
                {' \u00b7 '}{timeAgo(current.createdAt)}
              </div>
            </div>
          </div>
          {(current.mediaType === 'video' || current.mediaType === 'image') && current.title && (
            <div className="mt-2 line-clamp-2 text-sm font-medium">{current.title}</div>
          )}
        </div>

        {/* Right rail */}
        <div className="absolute right-3 bottom-3 flex flex-col items-center gap-3 text-white">
          <RailButton onClick={onLike} active={current.viewer.liked} icon={<Heart className={`h-6 w-6 ${current.viewer.liked ? 'fill-rose-main text-rose-main' : ''}`} />} count={current.counts.beats} label="Like" />
          <RailButton onClick={onBeat} icon={<Flame className="h-6 w-6 text-orange-300" />} label="Beat" />
          <RailButton onClick={onMove} icon={<MiamoMButton />} label="Move" />
          <RailButton onClick={() => onOpenComments(current)} icon={<MessageCircle className="h-6 w-6" />} count={current.counts.comments} label="Comment" />
          <RailButton onClick={onSave} active={current.viewer.saved} icon={<Save className={`h-5 w-5 ${current.viewer.saved ? 'fill-white' : ''}`} />} count={current.counts.saves} label="Save" />
          <RailButton onClick={onShare} icon={<Share2 className="h-5 w-5" />} label="Share" />
          <RailButton onClick={onDislike} icon={<ThumbsDown className="h-5 w-5" />} label="Dislike" />
          <RailButton onClick={() => setMoreOpen((v) => !v)} icon={<MoreVertical className="h-5 w-5" />} label="More" />
        </div>

        {/* More menu */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              className="absolute right-3 bottom-32 z-10 w-56 rounded-2xl border border-white/20 bg-black/80 p-2 text-sm text-white shadow-2xl backdrop-blur-md"
            >
              <MenuItem onClick={onNotInterested}>Don\u2019t show me like this</MenuItem>
              <MenuItem onClick={onHideAuthor}>Hide all from this author</MenuItem>
              <MenuItem onClick={onReport} danger>Report this post</MenuItem>
              <MenuItem onClick={() => { setMoreOpen(false); window.open(`/profile?id=${current.author.id}`, '_self'); }}>View profile</MenuItem>
            </motion.div>
          )}
        </AnimatePresence>
        {/* /Stage */}
        </div>

        {/* Mobile nav bar (under card) */}
        <div className="mt-3 flex items-center justify-center gap-3 sm:hidden">
          <button
            onClick={() => advance(-1)}
            disabled={idx === 0}
            className="rounded-full border border-token bg-miamo-card p-2 text-text-muted disabled:opacity-40"
            aria-label="Previous"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="text-[11px] tabular-nums text-text-muted">
            {idx + 1} / {items.length}{exhausted ? '' : '+'}
          </span>
          <button
            onClick={() => advance(1)}
            disabled={idx >= items.length - 1 && exhausted}
            className="rounded-full border border-token bg-miamo-card p-2 text-text-muted disabled:opacity-40"
            aria-label="Next"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Counter + hint (desktop) */}
        <div className="mt-2 hidden text-center text-[11px] text-text-muted sm:block">
          <span className="tabular-nums">{idx + 1} / {items.length}{exhausted ? '' : '+'}</span>
          <span className="mx-1.5 opacity-50">&middot;</span>
          <span>&uarr;/&darr; to navigate &middot; L to like</span>
        </div>
      </div>

      {/* Side next (desktop) */}
      <button
        onClick={() => advance(1)}
        disabled={idx >= items.length - 1 && exhausted}
        className="hidden shrink-0 rounded-full border border-token bg-miamo-card p-2.5 text-text-muted shadow-soft transition hover:border-rose-main/40 hover:text-rose-main disabled:opacity-30 disabled:hover:border-token disabled:hover:text-text-muted sm:inline-flex"
        aria-label="Next"
        title="Next (↓ or J)"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}

function ReelsSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 sm:gap-4">
      <div className="hidden h-11 w-11 shrink-0 rounded-full border border-token bg-miamo-card sm:block" />
      <div className="w-full max-w-md">
        <div
          className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-rose-main/10 via-rose-light/5 to-amber-200/10 shadow-2xl ring-1 ring-black/5"
          style={{ height: 'min(78vh, 720px)', minHeight: '460px' }}
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/5 to-transparent" />
          <div className="absolute left-3 right-3 top-3 flex justify-between gap-2">
            <div className="h-5 w-20 rounded-full bg-black/10" />
            <div className="h-5 w-12 rounded-full bg-black/10" />
          </div>
          <div className="absolute bottom-3 left-3 right-20 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-black/15" />
              <div className="space-y-1">
                <div className="h-3 w-28 rounded bg-black/15" />
                <div className="h-2.5 w-20 rounded bg-black/10" />
              </div>
            </div>
            <div className="h-4 w-3/4 rounded bg-black/15" />
          </div>
          <div className="absolute bottom-3 right-3 flex flex-col items-center gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-9 rounded-full bg-black/15" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-rose-main/70" />
          </div>
        </div>
      </div>
      <div className="hidden h-11 w-11 shrink-0 rounded-full border border-token bg-miamo-card sm:block" />
    </div>
  );
}

function RailButton({ onClick, icon, count, label, active }: { onClick: () => void; icon: React.ReactNode; count?: number; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-0.5 transition active:scale-95 ${active ? 'text-rose-light' : ''}`}
      aria-label={label}
    >
      <div className="rounded-full bg-black/30 p-2 backdrop-blur-sm group-hover:bg-black/50">{icon}</div>
      {typeof count === 'number' && <span className="text-[10px] font-semibold tabular-nums">{fmt(count)}</span>}
    </button>
  );
}

function MiamoMButton() {
  return (
    <div className="relative flex h-6 w-6 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-main via-rose-light to-amber-300 opacity-90" />
      <span className="relative text-[12px] font-black text-white">M</span>
      <div className="absolute -inset-1 rounded-full bg-rose-main/40 animate-ping" />
    </div>
  );
}

function MenuItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/10 ${danger ? 'text-rose-300' : ''}`}
    >
      {children}
    </button>
  );
}
