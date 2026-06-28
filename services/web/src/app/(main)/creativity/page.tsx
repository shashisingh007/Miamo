'use client';
// v3.5 — Creativity / Talent Showcase + Spotlight time-economy.
// Now ships a reels-style one-card-at-a-time surface (default) alongside the
// legacy board view, an expanded earn-paths drawer, and AI Move suggestions
// piped into the existing MoveModal.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Search, X, TrendingUp, Flame, Award, Archive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useTrackPageView, useTrackDwell } from '@/hooks/useTrackActivity';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useCachedResource } from '@/hooks/useCachedResource';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { CATEGORIES, fmt } from './components/constants';
import { ShowcaseComposer } from './components/ShowcaseComposer';
import { MoveModal } from './components/MoveModal';
import { CommentSheet } from './components/CommentSheet';
import { SpotlightBalancePill, PurchaseModal, VaultDrawer, useSpotlight } from './components/SpotlightUI';
import { ReelsView } from './components/ReelsView';
import { EarnDrawer } from './components/EarnDrawer';

export default function CreativityPage() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user as any);
  const myId: string | null = me?.id ?? null;
  const [activeCat, setActiveCat] = usePersistentState<string>('creativity:activeCat', 'general');
  const [sort, setSort] = usePersistentState<'trending' | 'recent' | 'top'>('creativity:sort', 'trending');
  const [search, setSearch] = usePersistentState<string>('creativity:search', '');
  const [composerOpen, setComposerOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<any>(null);
  const [moveSuggestions, setMoveSuggestions] = useState<Array<{ tone: string; line: string }> | undefined>(undefined);
  const [commentItem, setCommentItem] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showEarn, setShowEarn] = useState(false);
  const { balance, refresh: refreshBalance, setBalance, matchCount, nextMilestone } = useSpotlight();

  useTrackPageView('creativity');
  useTrackDwell('creativity');

  // Restore page scroll across navigations.
  const pageRef = useRef<HTMLElement | null>(null);
  useScrollRestore('creativity', () => {
    // The (main) layout owns the scroll container; walk up to find it.
    let el: HTMLElement | null = pageRef.current?.parentElement ?? null;
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 10) return el;
      el = el.parentElement;
    }
    return null;
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // Self-stats (cached so they don't blink to zero on remount).
  const statsCache = useCachedResource<{ views: number; moves: number; matches: number }>(
    'creativity:myStats',
    async () => {
      const res = await api.getCreativityItems({ author: 'me' } as any);
      const mine = res?.data || [];
      const views = mine.reduce((s: number, i: any) => s + (i.views || 0), 0);
      const moves = mine.reduce((s: number, i: any) => s + (i.moveCount || 0), 0);
      return { views, moves, matches: moves };
    },
    { freshFor: 60_000 },
  );
  const myStats = statsCache.data ?? { views: 0, moves: 0, matches: 0 };

  const openMoveFromReels = (item: any, suggestions?: Array<{ tone: string; line: string }>) => {
    setMoveSuggestions(suggestions);
    setMoveItem(item);
  };

  const filteredCats = useMemo(() => CATEGORIES, []);

  return (
    <ErrorBoundary>
      <main ref={pageRef as any} className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:pt-6">
        {/* Hero — compact, info-dense */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-main/15 via-rose-light/10 to-amber-200/20 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-main">
                <Sparkles className="h-3 w-3" /> Talent Showcase
              </div>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                Show what you create.{' '}
                <span className="text-rose-main">Get matched for it.</span>
              </h1>
              <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-text-secondary">
                Share reels, photos, and writing — all in one feed. Earn Spotlight by being active — beats, comments, streaks all pay.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <SpotlightBalancePill balance={balance} onClick={() => setShowBuy(true)} />
                <button
                  onClick={() => setShowEarn(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                  title="See every way to earn minutes"
                >
                  <Sparkles className="h-3 w-3" /> Earn
                </button>
                <button
                  onClick={() => setShowVault(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-token bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-text-muted hover:border-rose-main/40"
                  title="Your expired and deleted posts"
                >
                  <Archive className="h-3 w-3" /> Vault
                </button>
                {nextMilestone !== null && (
                  <span className="hidden rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
                    <Award className="inline h-3 w-3 -mt-0.5 mr-1" />
                    {matchCount}/{nextMilestone} → bonus
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <button
                onClick={() => setComposerOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-main px-4 py-2.5 text-sm font-semibold text-white shadow-button hover:shadow-lg"
              >
                <Plus className="h-4 w-4" /> Share your work
              </button>
              <div className="flex items-stretch gap-1.5">
                <MiniStat icon={<TrendingUp className="h-3 w-3" />} label="Views" value={fmt(myStats.views)} />
                <MiniStat icon={<Sparkles className="h-3 w-3" />} label="Moves" value={fmt(myStats.moves)} />
                <MiniStat icon={<Award className="h-3 w-3" />} label="Matches" value={fmt(myStats.matches)} />
              </div>
            </div>
          </div>
        </section>

        {/* Sticky controls bar: filters only — categories + sort + search. */}
        <section className="sticky top-0 z-20 -mx-4 mt-3 border-b border-token/40 bg-miamo-bg/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-miamo-bg/70">
          <div className="-mr-4 flex gap-1.5 overflow-x-auto pr-4 no-scrollbar">
            {filteredCats.map(c => {
              const Icon = c.icon;
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    active ? 'border-transparent text-white shadow-soft' : 'border-token bg-miamo-card text-text-muted hover:border-rose-main/40'
                  }`}
                  style={active ? { background: c.color } : undefined}
                >
                  <Icon className="h-3 w-3" /> {c.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[
              { key: 'trending' as const, label: 'Trending', icon: <Flame className="h-3 w-3" /> },
              { key: 'recent' as const,   label: 'Recent',   icon: <Sparkles className="h-3 w-3" /> },
              { key: 'top' as const,      label: 'Top',      icon: <Award className="h-3 w-3" /> },
            ].map(s => (
              <button key={s.key} onClick={() => setSort(s.key)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  sort === s.key ? 'border-rose-main bg-rose-main/10 text-rose-main' : 'border-token text-text-muted hover:border-rose-main/40'
                }`}>
                {s.icon} {s.label}
              </button>
            ))}
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search showcases"
                className="rounded-full border border-token bg-miamo-card pl-8 pr-3 py-1.5 text-[12px] w-48 focus:w-64 transition-all" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"><X className="h-3 w-3" /></button>}
            </div>
          </div>
        </section>

        {/* Body — unified one-at-a-time feed. */}
        <section className="mt-5">
          <ReelsView
            source="all"
            activeCat={activeCat}
            sort={sort}
            search={search}
            categories={filteredCats}
            onOpenComments={(it) => setCommentItem(it)}
            onOpenMove={openMoveFromReels}
            showToast={showToast}
            refreshBalance={refreshBalance}
          />
        </section>

        {/* Composer */}
        <ShowcaseComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onCreated={(created) => {
            showToast(`Published to ${created.length} categor${created.length > 1 ? 'ies' : 'y'}`);
            // Invalidate the unified feed cache so the new item shows up next render.
            if (typeof window !== 'undefined') {
              const prefix = `miamo:cache:v1:${myId || 'anon'}:creativity:feed:`;
              Object.keys(window.localStorage).filter(k => k.startsWith(prefix)).forEach(k => window.localStorage.removeItem(k));
            }
            statsCache.refetch();
            refreshBalance();
          }}
        />

        {/* Spotlight purchase + vault + earn */}
        <PurchaseModal open={showBuy} onClose={() => setShowBuy(false)} onPurchased={(b) => { setBalance(b); setShowBuy(false); showToast('Spotlight minutes added'); }} />
        <VaultDrawer open={showVault} onClose={() => setShowVault(false)} />
        <EarnDrawer
          open={showEarn}
          onClose={() => setShowEarn(false)}
          onBuy={() => setShowBuy(true)}
          onClaimed={(delta) => { showToast(`+${delta} Spotlight minutes claimed`); refreshBalance(); }}
        />

        {/* Move modal */}
        <AnimatePresence>
          {moveItem && <MoveModal isOpen onClose={() => { setMoveItem(null); setMoveSuggestions(undefined); }} item={moveItem} suggestions={moveSuggestions} />}
        </AnimatePresence>

        {/* Comments */}
        <AnimatePresence>
          {commentItem && (
            <CommentSheet
              isOpen
              itemId={commentItem.id}
              commentCount={commentItem.commentCount ?? 0}
              onClose={() => setCommentItem(null)}
            />
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg">
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </ErrorBoundary>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col rounded-xl bg-white/70 px-2.5 py-1.5 backdrop-blur-sm sm:min-w-[64px]">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-muted">{icon} {label}</div>
      <div className="text-sm font-bold tabular-nums text-text-primary">{value}</div>
    </div>
  );
}

function EmptyState({ onCreate, category }: { onCreate: () => void; category: string }) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-dashed border-token bg-miamo-card p-8 text-center">
      <Sparkles className="mx-auto h-8 w-8 text-rose-main" />
      <h3 className="mt-3 text-base font-semibold">Be the first in {category === 'general' ? 'this feed' : category}</h3>
      <p className="mt-1 text-xs text-text-muted">Post a poem, a sketch, a photo, a project — anything that shows what makes you you.</p>
      <button onClick={onCreate}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-main px-4 py-2 text-xs font-semibold text-white shadow-button">
        <Plus className="h-4 w-4" /> Share your work
      </button>
    </div>
  );
}
