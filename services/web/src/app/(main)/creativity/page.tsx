'use client';
// v3.2 — Talent Showcase (replaces TikTok-style reels). Goal: low-storage
// platform where users display creativity in 1+ categories. Each piece has
// a "Send Move" CTA → matches sparked from creativity. Composer is text-
// first (no video uploads); images are linked, not hosted.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Search, X, TrendingUp, Flame, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { GridSkeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useTrackPageView, useTrackDwell } from '@/hooks/useTrackActivity';
import { CATEGORIES, fmt } from './components/constants';
import { TalentCard } from './components/TalentCard';
import { ShowcaseComposer } from './components/ShowcaseComposer';
import { MoveModal } from './components/MoveModal';
import { CommentSheet } from './components/CommentSheet';

export default function CreativityPage() {
  const router = useRouter();
  const [activeCat, setActiveCat] = useState<string>('general');
  const [sort, setSort] = useState<'trending' | 'recent' | 'top'>('trending');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<any>(null);
  const [commentItem, setCommentItem] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [myStats, setMyStats] = useState<{ views: number; moves: number; matches: number }>({ views: 0, moves: 0, matches: 0 });

  useTrackPageView('creativity');
  useTrackDwell('creativity');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sort };
      if (activeCat !== 'general') params.category = activeCat;
      if (search.trim()) params.q = search.trim();
      const res = activeCat === 'general' && sort === 'trending'
        ? await api.getCreativityFeed(params)
        : await api.getCreativityItems(params);
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally { setLoading(false); }
  }, [activeCat, sort, search]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Lightweight self-stats (best-effort)
  useEffect(() => {
    api.getCreativityItems({ author: 'me' } as any).then((res: any) => {
      const mine = res?.data || [];
      const views = mine.reduce((s: number, i: any) => s + (i.views || 0), 0);
      const moves = mine.reduce((s: number, i: any) => s + (i.moveCount || 0), 0);
      setMyStats({ views, moves, matches: moves });
    }).catch(() => {});
  }, []);

  const onLike = async (item: any) => {
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, liked: !p.liked, reactionCount: (p.reactionCount || 0) + (p.liked ? -1 : 1) } : p));
    try { await api.reactToCreativity(item.id, 'like'); } catch { loadFeed(); }
  };

  const filteredCats = useMemo(() => CATEGORIES, []);

  return (
    <ErrorBoundary>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        {/* Hero */}
        <section className="rounded-3xl bg-gradient-to-br from-rose-main/15 via-rose-light/10 to-amber-200/20 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-rose-main">
                <Sparkles className="h-3 w-3" /> Talent Showcase
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Show what you create.<br />
                <span className="text-rose-main">Get matched for it.</span>
              </h1>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                Post in up to 3 categories. Text, images, links — no video uploads, no friction. People can send you a Miamo Move straight from your work.
              </p>
            </div>
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-rose-main px-5 py-3 text-sm font-semibold text-white shadow-button hover:shadow-lg"
            >
              <Plus className="h-4 w-4" /> Share your work
            </button>
          </div>

          {/* Self stats */}
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md">
            <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Views" value={fmt(myStats.views)} />
            <StatCard icon={<Sparkles className="h-3.5 w-3.5" />} label="Moves" value={fmt(myStats.moves)} />
            <StatCard icon={<Award className="h-3.5 w-3.5" />} label="Matches" value={fmt(myStats.matches)} />
          </div>
        </section>

        {/* Category rail */}
        <section className="mt-6">
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-2">
            {filteredCats.map(c => {
              const Icon = c.icon;
              const active = activeCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                    active ? 'border-transparent text-white shadow-soft' : 'border-token bg-miamo-card text-text-muted hover:border-rose-main/40'
                  }`}
                  style={active ? { background: c.color } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" /> {c.label}
                </button>
              );
            })}
          </div>

          {/* Sort + search */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
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

        {/* Grid */}
        <section className="mt-5">
          {loading ? (
            <GridSkeleton count={6} />
          ) : items.length === 0 ? (
            <EmptyState onCreate={() => setComposerOpen(true)} category={activeCat} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(it => (
                <TalentCard
                  key={it.id}
                  item={it}
                  onLike={() => onLike(it)}
                  onComment={() => setCommentItem(it)}
                  onMove={() => setMoveItem(it)}
                  onMore={() => router.push(`/profile?id=${it.authorId}`)}
                  onOpenAuthor={() => router.push(`/profile?id=${it.authorId}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Composer */}
        <ShowcaseComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onCreated={(created) => { showToast(`Published to ${created.length} categor${created.length > 1 ? 'ies' : 'y'}`); loadFeed(); }}
        />

        {/* Move modal */}
        <AnimatePresence>
          {moveItem && <MoveModal isOpen onClose={() => setMoveItem(null)} item={moveItem} />}
        </AnimatePresence>

        {/* Comments */}
        <AnimatePresence>
          {commentItem && (
            <CommentSheet
              isOpen
              itemId={commentItem.id}
              commentCount={commentItem.commentCount ?? 0}
              onClose={() => { setCommentItem(null); loadFeed(); }}
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{icon} {label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-text-primary">{value}</div>
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
