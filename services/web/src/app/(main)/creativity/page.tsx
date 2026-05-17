'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, ChevronDown, Sparkles, Check,
  ExternalLink, EyeOff, Flag, Ban,
} from 'lucide-react';
import { api } from '@/lib/api';
import { GridSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackDwell, useTrackScrollDepth, trackContentEngage } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';
import { CATEGORIES, fmt } from './components/constants';
import { CommentSheet } from './components/CommentSheet';
import { MoveModal } from './components/MoveModal';
import { ReelCard } from './components/ReelCard';
import { UploadModal } from './components/UploadModal';

/* ═══════════════════════════════════════════════════════
   MORE OPTIONS MENU (3-dot)
   ═══════════════════════════════════════════════════════ */
function MoreMenu({
  isOpen, onClose, item, onHide,
}: {
  isOpen: boolean; onClose: () => void; item: any; onHide: () => void;
}) {
  const router = useRouter();
  if (!isOpen) return null;

  const menuItems = [
    { label: 'View Profile', icon: ExternalLink, color: 'text-gray-600', onClick: () => { router.push(`/profile?id=${item.authorId}`); onClose(); } },
    { label: "Don't show this", icon: EyeOff, color: 'text-gray-600', onClick: () => { onHide(); onClose(); } },
    { divider: true },
    { label: 'Report Content', icon: Flag, color: 'text-orange-400', onClick: () => { api.reportUser({ reportedId: item.authorId, reason: 'inappropriate', targetType: 'creativity', targetId: item.id }); onClose(); } },
    { label: 'Block Creator', icon: Ban, color: 'text-red-400', onClick: () => { api.blockUser(item.authorId); onClose(); } },
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 rounded-t-[20px] z-50 px-4 py-3 pb-8"
      >
        <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-4" />
        <div className="space-y-0.5">
          {menuItems.map((item, i) => {
            if ('divider' in item) return <div key={i} className="my-2 h-px bg-gray-50" />;
            const Icon = item.icon;
            return (
              <button key={i} onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                <Icon className={cn('w-5 h-5', item.color)} />
                <span className={cn('text-[14px] font-medium', item.color)}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN CREATIVITY PAGE — TikTok/Reels vertical scroll
   ═══════════════════════════════════════════════════════ */
export default function CreativityPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('general');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Modals
  const [commentOpen, setCommentOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<any>(null);
  const [moreItem, setMoreItem] = useState<any>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useTrackPageView('creativity');
  useTrackDwell('creativity');
  useTrackScrollDepth('creativity');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Load categories from DB
  useEffect(() => {
    api.getCreativityCategories().then(res => setDbCategories(res.data || [])).catch(() => {});
  }, []);

  // Load feed
  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeCategory !== 'general') params.category = activeCategory;
      const res = await api.getCreativityFeed(params);
      setItems(res.data || []);
      setCurrentIndex(0);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [activeCategory]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Record view when item becomes active
  useEffect(() => {
    const item = items[currentIndex];
    if (item) {
      api.viewCreativityItem(item.id).catch(() => {});
    }
  }, [currentIndex, items]);

  // Snap scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const cardHeight = container.clientHeight;
    const newIndex = Math.round(container.scrollTop / cardHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < items.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, items.length]);

  // Like handler — optimistic update
  const handleLike = async (idx: number) => {
    const item = items[idx];
    if (!item) return;
    // Optimistic: immediately toggle UI
    const wasLiked = item.liked;
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it,
      liked: !wasLiked,
      likeCount: wasLiked ? Math.max(0, (it.likeCount || 0) - 1) : (it.likeCount || 0) + 1,
    } : it));
    try {
      const res = await api.reactToCreativity(item.id);
      // Sync with server response — correct if server disagreed with our optimistic update
      setItems(prev => prev.map((it, i) => i === idx ? {
        ...it,
        liked: res.data.liked,
        likeCount: res.data.likeCount != null ? res.data.likeCount : (
          res.data.liked
            ? (wasLiked ? it.likeCount : (it.likeCount || 0) + 1) // server says liked but we thought already liked
            : (!wasLiked ? it.likeCount : Math.max(0, (it.likeCount || 0) - 1)) // server says unliked but we thought already unliked
        ),
      } : it));
    } catch (e: any) {
      // Revert on error
      setItems(prev => prev.map((it, i) => i === idx ? {
        ...it,
        liked: wasLiked,
        likeCount: wasLiked ? (it.likeCount || 0) + 1 : Math.max(0, (it.likeCount || 0) - 1),
      } : it));
      showToast(e?.message || 'Failed to like — please re-login', 'error');
    }
  };

  // Share handler
  const handleShare = async (idx: number) => {
    const item = items[idx];
    if (!item) return;
    try {
      await api.shareCreativityItem(item.id);
      showToast('Shared!', 'success');
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.content, url: window.location.href });
      }
    } catch (e: any) {
      showToast(e?.message || 'Share failed', 'error');
    }
  };

  // Hide handler
  const handleHide = async (itemId: string) => {
    try {
      await api.hideCreativityItem(itemId);
      setItems(prev => prev.filter(it => it.id !== itemId));
      showToast('Hidden', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to hide', 'error');
    }
  };

  // Merge DB categories with static list for display
  const displayCategories = CATEGORIES.map(c => {
    const dbCat = dbCategories.find(dc => dc.name === c.name);
    return { ...c, count: dbCat?._count?.items || 0 };
  });

  /* ─── Loading ─── */
  if (loading) {
    return <GridSkeleton count={9} />;
  }

  /* ─── Empty ─── */
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col bg-miamo-bg">
        {/* Category bar even when empty */}
        <CategoryBar
          categories={displayCategories}
          active={activeCategory}
          onSelect={setActiveCategory}
          onShowAll={() => setShowCatPicker(true)}
        />
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center px-8">
            <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No content yet</h3>
            <p className="text-[13px] text-gray-400 mb-6 leading-relaxed">
              {activeCategory === 'general'
                ? 'Be the first to share something creative!'
                : `No ${activeCategory} content yet — be the pioneer!`}
            </p>
            <button onClick={() => setUploadOpen(true)}
              className="h-11 px-6 rounded-xl bg-white text-gray-900 text-sm font-bold hover:bg-white/90 transition-all inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create
            </button>
          </motion.div>
        </div>
        <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} categories={dbCategories} onCreated={loadFeed} />
        <CategoryPickerSheet isOpen={showCatPicker} onClose={() => setShowCatPicker(false)} categories={displayCategories} active={activeCategory} onSelect={(c) => { setActiveCategory(c); setShowCatPicker(false); }} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="h-full flex flex-col bg-miamo-bg relative">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'absolute top-14 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-[12px] font-semibold shadow-lg backdrop-blur-xl border',
              toast.type === 'error'
                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
            )}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top: Category bar ── */}
      <CategoryBar
        categories={displayCategories}
        active={activeCategory}
        onSelect={setActiveCategory}
        onShowAll={() => setShowCatPicker(true)}
      />

      {/* ── Vertical scroll feed ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {items.map((item, idx) => (
          <div key={item.id} className="h-full snap-start" style={{ minHeight: '100%' }}>
            <ReelCard
              item={item}
              isActive={idx === currentIndex}
              onLike={() => handleLike(idx)}
              onComment={() => setCommentOpen(true)}
              onShare={() => handleShare(idx)}
              onMove={() => setMoveItem(item)}
              onMore={() => setMoreItem(item)}
              onProfileClick={() => router.push(`/profile?id=${item.authorId}`)}
            />
          </div>
        ))}
      </div>

      {/* ── FAB: Upload ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setUploadOpen(true)}
        className="absolute bottom-6 right-4 z-30 w-12 h-12 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-[0_4px_24px_rgba(236,64,122,0.2)]"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* ── Scroll indicators ── */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
        {items.slice(0, Math.min(items.length, 10)).map((_, i) => (
          <div key={i} className={cn(
            'w-1 rounded-full transition-all duration-300',
            i === currentIndex ? 'h-4 bg-white' : 'h-1.5 bg-white/20',
          )} />
        ))}
      </div>

      {/* ── Modals ── */}
      <CommentSheet
        isOpen={commentOpen}
        onClose={() => setCommentOpen(false)}
        itemId={items[currentIndex]?.id || ''}
        commentCount={items[currentIndex]?.commentCount || 0}
      />
      <MoveModal
        isOpen={!!moveItem}
        onClose={() => setMoveItem(null)}
        item={moveItem}
      />
      <MoreMenu
        isOpen={!!moreItem}
        onClose={() => setMoreItem(null)}
        item={moreItem}
        onHide={() => moreItem && handleHide(moreItem.id)}
      />
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        categories={dbCategories}
        onCreated={loadFeed}
      />
      <CategoryPickerSheet
        isOpen={showCatPicker}
        onClose={() => setShowCatPicker(false)}
        categories={displayCategories}
        active={activeCategory}
        onSelect={(c) => { setActiveCategory(c); setShowCatPicker(false); }}
      />
    </div>
    </ErrorBoundary>
  );
}

/* ═══════════════════════════════════════════════════════
   CATEGORY BAR — Horizontal scrollable
   ═══════════════════════════════════════════════════════ */
function CategoryBar({
  categories, active, onSelect, onShowAll,
}: {
  categories: { id: string; name: string; label: string; icon: any; color: string; count?: number }[];
  active: string;
  onSelect: (name: string) => void;
  onShowAll: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar z-30 bg-miamo-bg/80 backdrop-blur-xl border-b border-border">
      {categories.slice(0, 8).map(cat => {
        const Icon = cat.icon;
        const isActive = active === cat.name || (active === 'general' && cat.name === 'general');
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.name)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border flex-shrink-0',
              isActive
                ? 'bg-white text-gray-900 border-white shadow-[0_0_12px_rgba(236,64,122,0.15)]'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100',
            )}
          >
            <Icon className="w-3 h-3" />
            {cat.label}
          </button>
        );
      })}
      <button onClick={onShowAll}
        className="flex items-center gap-1 h-8 px-3 rounded-full card-premium text-gray-400 text-[11px] font-semibold whitespace-nowrap hover:text-gray-400 flex-shrink-0">
        All <ChevronDown className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FULL CATEGORY PICKER (sheet)
   ═══════════════════════════════════════════════════════ */
function CategoryPickerSheet({
  isOpen, onClose, categories, active, onSelect,
}: {
  isOpen: boolean; onClose: () => void;
  categories: { id: string; name: string; label: string; icon: any; color: string; count?: number }[];
  active: string;
  onSelect: (name: string) => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 max-h-[75vh] bg-white border-t border-gray-200 rounded-t-[20px] z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14px] font-bold text-gray-900">Browse Categories</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isActive = active === cat.name;
                  return (
                    <button key={cat.id} onClick={() => onSelect(cat.name)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left',
                        isActive
                          ? 'bg-gray-100 border-pink-200 shadow-[0_0_12px_rgba(255,255,255,0.03)]'
                          : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50',
                      )}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: cat.color + '15' }}>
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-[12px] font-semibold truncate', isActive ? 'text-gray-900' : 'text-gray-500')}>{cat.label}</p>
                        {cat.count !== undefined && cat.count > 0 && (
                          <p className="text-[10px] text-gray-300">{cat.count} items</p>
                        )}
                      </div>
                      {isActive && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-gray-900" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
