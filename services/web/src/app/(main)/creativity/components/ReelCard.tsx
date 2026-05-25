'use client';

import { motion } from 'framer-motion';
import {
 Heart, MessageCircle, Share2, MoreHorizontal, Eye,
 Plus, MapPin, Shield, Flame, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORIES, catGradient, fmt, timeAgo } from './constants';

/* ═══════════════════════════════════════════════════════
 REEL CARD — Full-screen vertical scroll item
 ═══════════════════════════════════════════════════════ */
export function ReelCard({
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
 const catColor = CATEGORIES.find(c => c.name === catName)?.color || '#C97856';
 const isVideo = item.type === 'video' && item.mediaUrl;
 const hasImage = item.mediaUrl && !isVideo;

 return (
 <div className="relative w-full h-full snap-start flex-shrink-0">
 {/* Background */}
 <div className="absolute inset-0">
 {hasImage ? (
 <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
 ) : isVideo ? (
 <video src={item.mediaUrl} className="w-full h-full object-cover" loop muted={!isActive} playsInline autoPlay={isActive} />
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
 <span className="text-[11px] font-bold text-text-primary">{catName}</span>
 </div>
 </div>

 {/* ── Right side: Action buttons (TikTok style) ── */}
 <div className="absolute right-4 bottom-36 z-10 flex flex-col items-center gap-5">
 {/* Profile avatar */}
 <button onClick={onProfileClick} className="relative mb-2">
 <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/8 shadow-lg">
 {photo ? (
 <img src={photo} alt={author.displayName} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full bg-miamo-card/20 flex items-center justify-center text-sm font-bold text-text-primary/70">
 {(author.displayName || 'U')[0]}
 </div>
 )}
 </div>
 <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-miamo-surface0 flex items-center justify-center shadow-md">
 <Plus className="w-3 h-3 text-text-primary" />
 </div>
 </button>

 {/* Like */}
 <button onClick={onLike} className="flex flex-col items-center gap-1">
 <motion.div whileTap={{ scale: 1.3 }}>
 <Heart className={cn('w-7 h-7', item.liked ? 'text-red-500 fill-red-500' : 'text-text-primary')} />
 </motion.div>
 <span className="text-[11px] font-semibold text-text-primary">{fmt(item.likeCount || 0)}</span>
 </button>

 {/* Comment */}
 <button onClick={onComment} className="flex flex-col items-center gap-1">
 <MessageCircle className="w-7 h-7 text-text-primary" />
 <span className="text-[11px] font-semibold text-text-primary">{fmt(item.commentCount || 0)}</span>
 </button>

 {/* Share */}
 <button onClick={onShare} className="flex flex-col items-center gap-1">
 <Share2 className="w-6 h-6 text-text-primary" />
 <span className="text-[11px] font-semibold text-text-primary">Share</span>
 </button>

 {/* Miamo Move */}
 <button onClick={onMove} className="flex flex-col items-center gap-1">
 <motion.div whileTap={{ scale: 1.2 }}
 className="w-10 h-10 rounded-full bg-miamo-surface backdrop-blur-md border border-border flex items-center justify-center"
 >
 <span className="text-[18px] font-black text-text-primary italic" style={{ fontFamily: 'system-ui' }}>M</span>
 </motion.div>
 <span className="text-[10px] font-bold text-text-primary">Move</span>
 </button>

 {/* More */}
 <button onClick={onMore}>
 <MoreHorizontal className="w-6 h-6 text-text-primary" />
 </button>
 </div>

 {/* ── Bottom: Content info + author ── */}
 <div className="absolute bottom-6 left-5 right-20 z-10">
 {/* Author row */}
 <button onClick={onProfileClick} className="flex items-center gap-2.5 mb-3">
 <div className="w-9 h-9 rounded-full overflow-hidden border border-white/30">
 {photo ? (
 <img src={photo} alt={author.displayName} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full bg-miamo-card/20 flex items-center justify-center text-xs font-bold text-text-primary/70">
 {(author.displayName || 'U')[0]}
 </div>
 )}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <span className="text-[13px] font-bold text-text-primary">@{author.username || author.displayName || 'user'}</span>
 {author.verified && (
 <div className="w-4 h-4 rounded-full bg-miamo-card/30 flex items-center justify-center">
 <Shield className="w-2.5 h-2.5 text-text-primary" />
 </div>
 )}
 </div>
 <div className="flex items-center gap-2 text-[10px] text-text-primary/60">
 {author.profile?.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{author.profile.city}</span>}
 {author.profile?.age && <span>{author.profile.age}</span>}
 </div>
 </div>
 </button>

 {/* Title & content */}
 <h3 className="text-[15px] font-bold text-text-primary leading-snug mb-1">{item.title}</h3>
 {item.content && (
 <p className="text-[12px] text-text-primary/80 leading-relaxed line-clamp-2">{item.content}</p>
 )}

 {/* Stats bar */}
 <div className="flex items-center gap-4 mt-3 text-[10px] text-text-primary/50 font-medium">
 <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmt(item.views || item.viewCount || 0)} views</span>
 <span>{timeAgo(item.createdAt)}</span>
 {item.featured && <span className="flex items-center gap-0.5 text-rose-light"><Flame className="w-3 h-3" />Featured</span>}
 </div>
 </div>
 </div>
 );
}
