'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Send, Share2, MoreHorizontal, Eye,
  Plus, X, ChevronDown, Shield, MapPin, Briefcase, Play,
  Pause, Volume2, VolumeX, Sparkles, Star, Flame, Trophy,
  Music, Palette, Camera, Mic, Dumbbell, UtensilsCrossed,
  Plane, BookOpen, Code, Clapperboard, Shirt, ChefHat, Leaf,
  Globe, Megaphone, Laugh, Headphones, Cpu, Drama, Flag,
  Ban, UserMinus, ExternalLink, EyeOff, Check, ArrowUp,
  Zap, TrendingUp, Upload, Paperclip,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

/* ─── Format large numbers (e.g., 1200 → 1.2k) ─── */
const fmt = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

/* ─── Category Definitions ──────────────────────────── */
const CATEGORIES = [
  { id: 'general', name: 'general', label: 'For You', icon: Sparkles, color: '#EC407A' },
  { id: 'Sports', name: 'Sports', label: 'Sports', icon: Trophy, color: '#22C55E' },
  { id: 'Music', name: 'Music', label: 'Music', icon: Headphones, color: '#EC407A' },
  { id: 'Art', name: 'Art', label: 'Art', icon: Palette, color: '#F59E0B' },
  { id: 'Dance', name: 'Dance', label: 'Dance', icon: Music, color: '#D81B60' },
  { id: 'Comedy', name: 'Comedy', label: 'Comedy', icon: Laugh, color: '#F97316' },
  { id: 'Fitness', name: 'Fitness', label: 'Fitness', icon: Dumbbell, color: '#10B981' },
  { id: 'Cooking', name: 'Cooking', label: 'Cooking', icon: UtensilsCrossed, color: '#EF4444' },
  { id: 'Photography', name: 'Photography', label: 'Photo', icon: Camera, color: '#06B6D4' },
  { id: 'Travel', name: 'Travel', label: 'Travel', icon: Plane, color: '#3B82F6' },
  { id: 'Fashion', name: 'Fashion', label: 'Fashion', icon: Shirt, color: '#EC4899' },
  { id: 'Tech Projects', name: 'Tech Projects', label: 'Tech', icon: Cpu, color: '#14B8A6' },
  { id: 'Singing', name: 'Singing', label: 'Singing', icon: Mic, color: '#EC4899' },
  { id: 'Poetry', name: 'Poetry', label: 'Poetry', icon: BookOpen, color: '#6366F1' },
  { id: 'Writing', name: 'Writing', label: 'Writing', icon: BookOpen, color: '#D81B60' },
  { id: 'Lifestyle', name: 'Lifestyle', label: 'Lifestyle', icon: Star, color: '#D946EF' },
  { id: 'Nature', name: 'Nature', label: 'Nature', icon: Leaf, color: '#16A34A' },
  { id: 'Date Ideas', name: 'Date Ideas', label: 'Dates', icon: Sparkles, color: '#EC4899' },
  { id: 'Career Highlights', name: 'Career Highlights', label: 'Career', icon: Briefcase, color: '#6366F1' },
  { id: 'Acting', name: 'Acting', label: 'Acting', icon: Clapperboard, color: '#F43F5E' },
];

/* ─── Gradient generator from category color ────────── */
function catGradient(color: string) {
  return `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`;
}

/* ═══════════════════════════════════════════════════════
   COMMENT SHEET (Bottom slide-up)
   ═══════════════════════════════════════════════════════ */
function CommentSheet({
  isOpen, onClose, itemId, commentCount,
}: {
  isOpen: boolean; onClose: () => void; itemId: string; commentCount: number;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      setLoading(true);
      api.getCreativityComments(itemId).then(res => setComments(res.data || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [isOpen, itemId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.commentOnCreativity(itemId, text.trim());
      if (res.data) setComments(prev => [res.data, ...prev]);
      setText('');
    } catch {} finally { setSending(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 max-h-[70vh] bg-white border-t border-gray-200 rounded-t-[20px] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14px] font-bold text-gray-900">{commentCount} Comments</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-pink-50">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <img src="/logo.png" alt="" className="w-6 h-6 rounded animate-pulse" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-[12px] text-gray-400 py-8">No comments yet — be the first!</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-gray-400">
                      {(c.author?.displayName || 'U')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-700">{c.author?.displayName || 'User'}</span>
                        {c.author?.verified && <Shield className="w-3 h-3 text-gray-400" />}
                        <span className="text-[10px] text-gray-300">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 leading-relaxed mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-200">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Add a comment..."
                className="flex-1 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[13px] px-4 focus:border-pink-200 focus:outline-none placeholder:text-gray-400"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                  text.trim() ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-300',
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   MIAMO MOVE MODAL — Send interest from content
   ═══════════════════════════════════════════════════════ */
function MoveModal({
  isOpen, onClose, item,
}: {
  isOpen: boolean; onClose: () => void; item: any;
}) {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await api.sendCreativityMove(item.id, message || undefined);
      setSent(true);
      setTimeout(() => { setSent(false); onClose(); setMessage(''); }, 1500);
    } catch {} finally { setSending(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-8 max-w-sm mx-auto bg-white border border-gray-200 rounded-[20px] shadow-2xl z-50 overflow-hidden"
          >
            {sent ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-[14px] font-semibold text-gray-900">Miamo Move sent!</p>
                <p className="text-[12px] text-gray-400 mt-1">They'll see your interest</p>
              </motion.div>
            ) : (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                    <Heart className="w-5 h-5 text-[#151522]" fill="#151522" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-900">Miamo Move</h4>
                    <p className="text-[11px] text-gray-400">
                      Interested in {item?.author?.displayName || 'this person'}?
                    </p>
                  </div>
                  <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 mb-4">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Reacting to</p>
                  <p className="text-[13px] text-gray-700 font-medium">{item?.title || 'Content'}</p>
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Write a message (optional)..."
                  className="w-full h-20 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[13px] px-4 py-3 resize-none focus:border-pink-200 focus:outline-none placeholder:text-gray-400 mb-4"
                />

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full h-11 rounded-xl bg-white text-gray-900 text-[13px] font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                >
                  {sending ? <img src="/logo.png" alt="" className="w-4 h-4 rounded animate-pulse" /> : <>
                    <Send className="w-4 h-4" /> Send Move
                  </>}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

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
   REEL CARD — Full-screen vertical scroll item
   ═══════════════════════════════════════════════════════ */
function ReelCard({
  item, isActive, onLike, onComment, onShare, onMove, onMore, onProfileClick,
}: {
  item: any;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onMove: () => void;
  onMore: () => void;
  onProfileClick: () => void;
}) {
  const author = item.author || {};
  const photo = author.photos?.[0]?.url || author.photos?.[0];
  const catName = item.category?.name || 'General';
  const catColor = CATEGORIES.find(c => c.name === catName)?.color || '#EC407A';
  const isVideo = item.type === 'video' && item.mediaUrl;
  const hasImage = item.mediaUrl && !isVideo;

  // Format numbers
  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  return (
    <div className="relative w-full h-full snap-start flex-shrink-0">
      {/* Background */}
      <div className="absolute inset-0">
        {hasImage ? (
          <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-contain" />
        ) : isVideo ? (
          <video src={item.mediaUrl} className="w-full h-full object-contain" loop muted={!isActive} playsInline autoPlay={isActive} />
        ) : (
          <div className="w-full h-full" style={{ background: catGradient(catColor) }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/90" />
          </div>
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
      </div>

      {/* ── Top: Category badge ── */}
      <div className="absolute top-6 left-5 z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/20">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
          <span className="text-[11px] font-bold text-white">{catName}</span>
        </div>
      </div>

      {/* ── Right side: Action buttons (TikTok style) ── */}
      <div className="absolute right-4 bottom-36 z-10 flex flex-col items-center gap-5">
        {/* Profile avatar */}
        <button onClick={onProfileClick} className="relative mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/40 shadow-lg">
            {photo ? (
              <img src={photo} alt={author.displayName} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center text-sm font-bold text-white/70">
                {(author.displayName || 'U')[0]}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center shadow-md">
            <Plus className="w-3 h-3 text-white" />
          </div>
        </button>

        {/* Like */}
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <motion.div whileTap={{ scale: 1.3 }}>
            <Heart className={cn('w-7 h-7', item.liked ? 'text-red-500 fill-red-500' : 'text-white')} />
          </motion.div>
          <span className="text-[11px] font-semibold text-white">{fmt(item.likeCount || 0)}</span>
        </button>

        {/* Comment */}
        <button onClick={onComment} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="text-[11px] font-semibold text-white">{fmt(item.commentCount || 0)}</span>
        </button>

        {/* Share */}
        <button onClick={onShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-6 h-6 text-white" />
          <span className="text-[11px] font-semibold text-white">Share</span>
        </button>

        {/* Miamo Move */}
        <button onClick={onMove} className="flex flex-col items-center gap-1">
          <motion.div whileTap={{ scale: 1.2 }}
            className="w-10 h-10 rounded-full bg-pink-100 backdrop-blur-md border border-pink-200 flex items-center justify-center"
          >
            <span className="text-[18px] font-black text-white italic" style={{ fontFamily: 'system-ui' }}>M</span>
          </motion.div>
          <span className="text-[10px] font-bold text-white">Move</span>
        </button>

        {/* More */}
        <button onClick={onMore}>
          <MoreHorizontal className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* ── Bottom: Content info + author ── */}
      <div className="absolute bottom-6 left-5 right-20 z-10">
        {/* Author row */}
        <button onClick={onProfileClick} className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/30">
            {photo ? (
              <img src={photo} alt={author.displayName} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center text-xs font-bold text-white/70">
                {(author.displayName || 'U')[0]}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-white">@{author.username || author.displayName || 'user'}</span>
              {author.verified && (
                <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                  <Shield className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/60">
              {author.profile?.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{author.profile.city}</span>}
              {author.profile?.age && <span>{author.profile.age}</span>}
            </div>
          </div>
        </button>

        {/* Title & content */}
        <h3 className="text-[15px] font-bold text-white leading-snug mb-1">{item.title}</h3>
        {item.content && (
          <p className="text-[12px] text-white/80 leading-relaxed line-clamp-2">{item.content}</p>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-white/50 font-medium">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmt(item.views || item.viewCount || 0)} views</span>
          <span>{timeAgo(item.createdAt)}</span>
          {item.featured && <span className="flex items-center gap-0.5 text-amber-300"><Flame className="w-3 h-3" />Featured</span>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   UPLOAD MODAL
   ═══════════════════════════════════════════════════════ */
function UploadModal({
  isOpen, onClose, categories, onCreated,
}: {
  isOpen: boolean; onClose: () => void; categories: any[]; onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [type, setType] = useState('image');
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [aiHashtags, setAiHashtags] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate AI hashtag suggestions based on title/category
  const generateHashtags = () => {
    setLoadingAi(true);
    // Simulate AI recommendations based on category and title
    setTimeout(() => {
      const tagMap: Record<string, string[]> = {
        Sports: ['#athlete', '#fitness', '#gameday', '#sports', '#training', '#champion'],
        Music: ['#music', '#songwriter', '#newmusic', '#vibes', '#musician', '#beats'],
        Art: ['#art', '#creative', '#artwork', '#artist', '#masterpiece', '#gallery'],
        Dance: ['#dance', '#dancer', '#choreography', '#moves', '#groove', '#dancelife'],
        Comedy: ['#funny', '#comedy', '#humor', '#lol', '#comedian', '#jokes'],
        Fitness: ['#fitness', '#workout', '#gym', '#gains', '#healthy', '#fitlife'],
        Cooking: ['#cooking', '#foodie', '#recipe', '#homemade', '#delicious', '#chef'],
        Photography: ['#photography', '#photo', '#capture', '#portrait', '#lens', '#photooftheday'],
        Travel: ['#travel', '#wanderlust', '#explore', '#adventure', '#travelphotography', '#world'],
        Fashion: ['#fashion', '#style', '#ootd', '#fashionista', '#trendy', '#look'],
      };
      const baseTags = tagMap[selectedCat] || ['#miamo', '#creativity', '#talent', '#passion', '#creative', '#trending'];
      const titleTags = title.trim() ? [`#${title.replace(/\s+/g, '').toLowerCase().slice(0, 20)}`] : [];
      setAiHashtags([...titleTags, ...baseTags].slice(0, 8));
      setLoadingAi(false);
    }, 800);
  };

  const addHashtag = (tag: string) => {
    const cleaned = tag.startsWith('#') ? tag : `#${tag}`;
    if (!hashtags.includes(cleaned) && hashtags.length < 10) {
      setHashtags(prev => [...prev, cleaned]);
    }
  };

  const removeHashtag = (tag: string) => setHashtags(prev => prev.filter(t => t !== tag));

  const handleFileSelect = () => {
    const accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : type === 'performance' ? 'video/*,audio/*' : '*/*';
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaPreview('');
    }
    e.target.value = '';
  };

  const handleCreate = async () => {
    if (!title.trim() || !selectedCat) return;
    setCreating(true);
    try {
      await api.createCreativityItem({
        title: title.trim(),
        category: selectedCat,
        content: `${content.trim()}${hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : ''}`,
        mediaUrl: mediaPreview || undefined,
        type,
      });
      setDone(true);
      setTimeout(() => {
        setDone(false); onClose(); onCreated();
        setTitle(''); setContent(''); setSelectedCat(''); setMediaFile(null); setMediaPreview(''); setHashtags([]); setAiHashtags([]);
      }, 1200);
    } catch {} finally { setCreating(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 max-h-[90vh] bg-white border-t border-gray-200 rounded-t-[20px] z-50 flex flex-col"
          >
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-lavender-400" /> Share Your Creativity
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {done ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-[14px] font-semibold text-gray-900">Published!</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Media Upload */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 block">Media</label>
                  {mediaFile ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50/50">
                      {mediaPreview && type === 'image' ? (
                        <img src={mediaPreview} alt="Upload preview" className="w-full h-40 object-contain" />
                      ) : mediaPreview && (type === 'video' || type === 'performance') ? (
                        <video src={mediaPreview} className="w-full h-40 object-contain" controls />
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center">
                          <div className="text-center">
                            <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">{mediaFile.name}</p>
                            <p className="text-[10px] text-gray-300">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                      )}
                      <button onClick={() => { setMediaFile(null); setMediaPreview(''); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80">
                        <X className="w-3.5 h-3.5 text-gray-900" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleFileSelect}
                      className="w-full h-28 rounded-xl border-2 border-dashed border-gray-200 hover:border-pink-200 bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-all">
                      <Upload className="w-6 h-6 text-gray-300" />
                      <span className="text-[11px] text-gray-400">Tap to select photo, video, or file</span>
                    </button>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 block">Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="What did you create?"
                    className="w-full h-11 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[13px] px-4 focus:border-pink-200 focus:outline-none placeholder:text-gray-400" />
                </div>

                {/* Category — REQUIRED */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 block">Category *</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.filter(c => c.name !== 'general').map(c => {
                      const CatIcon = CATEGORIES.find(cc => cc.name === c.name)?.icon || Sparkles;
                      const isActive = selectedCat === c.name;
                      return (
                        <button key={c.id || c.name} onClick={() => setSelectedCat(c.name)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border',
                            isActive
                              ? 'bg-pink-50 border-pink-200 text-gray-900'
                              : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:text-gray-500',
                          )}
                        >
                          <CatIcon className="w-3 h-3" /> {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 block">Content Type</label>
                  <div className="flex gap-2">
                    {['image', 'video', 'text', 'project', 'performance'].map(t => (
                      <button key={t} onClick={() => setType(t)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all capitalize',
                          type === t ? 'bg-pink-50 border-pink-200 text-gray-900' : 'bg-gray-50/50 border-gray-100 text-gray-400',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption/Description */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 block">Caption</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    placeholder="Write a caption for your post…"
                    className="w-full h-20 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[13px] px-4 py-3 resize-none focus:border-pink-200 focus:outline-none placeholder:text-gray-400" />
                </div>

                {/* Hashtags */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Hashtags</label>
                    <button onClick={generateHashtags} disabled={loadingAi}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-lavender-400/10 text-lavender-400 text-[10px] font-semibold hover:bg-lavender-400/20 transition-all disabled:opacity-50">
                      <Sparkles className="w-3 h-3" /> {loadingAi ? 'Thinking…' : 'AI Suggest'}
                    </button>
                  </div>

                  {/* Current hashtags */}
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {hashtags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-lavender-400/10 text-lavender-400 text-[11px] font-semibold">
                          {tag}
                          <button onClick={() => removeHashtag(tag)} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI suggested hashtags */}
                  {aiHashtags.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[9px] text-gray-300 uppercase tracking-wider mb-1.5">Suggested</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiHashtags.filter(t => !hashtags.includes(t)).map(tag => (
                          <button key={tag} onClick={() => addHashtag(tag)}
                            className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 text-[11px] font-medium hover:bg-lavender-400/10 hover:text-lavender-400 hover:border-lavender-400/20 transition-all">
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual hashtag input */}
                  <div className="flex gap-2">
                    <input value={hashtagInput} onChange={e => setHashtagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && hashtagInput.trim()) { addHashtag(hashtagInput.trim()); setHashtagInput(''); } }}
                      placeholder="Add custom hashtag…"
                      className="flex-1 h-9 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[12px] px-3 focus:border-pink-200 focus:outline-none placeholder:text-gray-400" />
                    <button onClick={() => { if (hashtagInput.trim()) { addHashtag(hashtagInput.trim()); setHashtagInput(''); } }}
                      className="px-3 h-9 rounded-xl bg-gray-50 text-gray-500 text-[11px] font-semibold hover:bg-pink-50 transition-all">Add</button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={!title.trim() || !selectedCat || creating}
                  className={cn(
                    'w-full h-12 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2',
                    title.trim() && selectedCat
                      ? 'bg-white text-gray-900 hover:bg-white/90'
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed',
                  )}
                >
                  {creating ? <img src="/logo.png" alt="" className="w-5 h-5 rounded animate-pulse" /> : <>
                    <Sparkles className="w-4 h-4" /> Publish
                  </>}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Time formatting ──────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
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
      // Sync with server response
      setItems(prev => prev.map((it, i) => i === idx ? {
        ...it,
        liked: res.data.liked,
        likeCount: res.data.liked
          ? (wasLiked ? it.likeCount : it.likeCount) // already incremented
          : (wasLiked ? it.likeCount : Math.max(0, (it.likeCount || 0) - 1)),
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
    return <MiamoLoader text={activeCategory === 'general' ? 'Curating your feed...' : `Loading ${activeCategory}...`} className="bg-miamo-bg" />;
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
