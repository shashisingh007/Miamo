'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, MoreHorizontal, Pin, Shield, Heart, Eye,
  MapPin, Star, StarOff, PinOff, Flag, Ban, UserMinus,
  MoreVertical, Play, Video, Pause, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── TooltipButton ─── */
export function TooltipButton({
  icon: Icon, label, onClick, active, className, size = 16,
}: {
  icon: any; label: string; onClick?: (e?: any) => void; active?: boolean;
  className?: string; size?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button onClick={onClick} className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
        active ? 'bg-pink-50 text-gray-900' : 'bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50',
        className,
      )}>
        <Icon style={{ width: size, height: size }} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-white text-gray-900 text-[10px] font-bold shadow-lg z-50 pointer-events-none"
          >
            {label}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── HeldItemMenu ─── */
export function HeldItemMenu({ userId, onResume, onReport, onBlock, onUnmatch }: { userId: string; onResume: () => void; onReport: () => void; onBlock: () => void; onUnmatch: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }}
              className="absolute right-0 top-full mt-1 z-50 w-52 py-1 rounded-xl bg-white border border-gray-200 shadow-2xl"
            >
              <button onClick={() => { setOpen(false); onResume(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-emerald-400 hover:bg-emerald-400/10 transition">
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
              <div className="h-px bg-gray-50 my-0.5" />
              <button onClick={() => { setOpen(false); onReport(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-amber-400/70 hover:bg-amber-400/5 transition">
                <Flag className="w-3.5 h-3.5" /> Report
              </button>
              <button onClick={() => { setOpen(false); onBlock(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-red-400/70 hover:bg-red-400/5 transition">
                <Ban className="w-3.5 h-3.5" /> Block
              </button>
              <button onClick={() => { setOpen(false); onUnmatch(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-red-400/70 hover:bg-red-400/5 transition">
                <UserMinus className="w-3.5 h-3.5" /> Unmatch
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── IncomingCard ─── */
export function IncomingCard({ item, onClick }: { item: any; onClick: () => void }) {
  const user = item.user || {};
  const name = user.displayName || 'User';
  const photo = user.photos?.[0]?.url || user.photos?.[0];
  const city = user.profile?.city;
  const age = user.profile?.age;
  const interests = (user.interests || []).slice(0, 3);

  const timeAgo = () => {
    const diff = Date.now() - new Date(item.createdAt).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200 transition-all overflow-hidden"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50">
            {photo ? (
              <img loading="lazy" src={photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-300">{name[0]}</div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center">
            {item.type === 'move' ? <span className="text-[11px]">💫</span> : item.type === 'like' ? <Heart className="w-3 h-3 text-pink-400 fill-pink-400" /> : <MessageCircle className="w-3 h-3 text-purple-400" />}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-bold text-gray-900 truncate">{name}</h3>
            {age && <span className="text-[12px] text-gray-400">{age}</span>}
            {user.verified && <Shield className="w-3.5 h-3.5 text-blue-400/60 flex-shrink-0" />}
          </div>
          {city && <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><MapPin className="w-2.5 h-2.5" />{city}</p>}
          {item.message && <p className="text-[11px] text-purple-300/70 truncate italic">&ldquo;{item.message}&rdquo;</p>}
          {!item.message && interests.length > 0 && (
            <div className="flex gap-1 mt-1">
              {interests.map((i: any) => <span key={i.name} className="px-1.5 py-0.5 rounded bg-gray-50 text-[9px] text-gray-400">{i.name}</span>)}
            </div>
          )}
        </div>

        {/* Time & CTA */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-[10px] text-gray-300 font-medium">{timeAgo()}</span>
          <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-pink-400/60" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ─── MatchCard ─── */
export function MatchCard({ match, onOpenMenu, onChat, onVideoCall }: { match: any; onOpenMenu: (id: string, e: React.MouseEvent) => void; onChat: (m: any) => void; onVideoCall?: () => void }) {
  const other = match.matchedUser || {};
  const name = other.displayName || 'User';
  const photo = other.photos?.[0]?.url || other.photos?.[0];
  const city = other.profile?.city || '';
  const age = other.profile?.age;
  const verified = other.verified;
  const online = other.profile?.online;
  const lastMsg = match.lastMessage;
  const isNew = match.isNew;
  const isFavorite = match.isFavorite;
  const isPinned = match.isPinned;

  const matchTime = new Date(match.createdAt);
  const daysDiff = Math.floor((Date.now() - matchTime.getTime()) / (1000 * 60 * 60 * 24));
  const timeLabel = daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Yesterday' : daysDiff < 7 ? `${daysDiff}d ago` : matchTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn('group rounded-2xl border transition-all cursor-pointer', isPinned ? 'bg-gray-50 border-gray-200' : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-200')}
      onClick={() => onChat(match)}>
      <div className="flex items-center gap-4 p-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50">
            {photo ? <img loading="lazy" src={photo} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg font-black text-gray-300">{name[0]}</div>}
          </div>
          {online && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-miamo-bg flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /></div>}
          {isPinned && <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md"><Pin className="w-2.5 h-2.5 text-gray-900" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-bold text-gray-900 truncate">{name}</h3>
            {verified && <Shield className="w-3.5 h-3.5 text-blue-400/40 flex-shrink-0" />}
            {isNew && <span className="px-2 py-0.5 rounded-md bg-purple-400/15 text-purple-300 text-[9px] font-bold uppercase">New</span>}
            {isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            {city && <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{city}</span>}
            {age && <span>{age}</span>}
          </div>
          {lastMsg ? <p className="text-[11px] text-gray-400 mt-1.5 truncate max-w-[260px]">{lastMsg.content}</p> : <p className="text-[11px] text-purple-400/50 mt-1.5 italic">No messages yet — say hi!</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-gray-300 font-medium mr-2 hidden sm:block">{timeLabel}</span>
          <TooltipButton icon={MessageCircle} label="Message" onClick={(e: any) => { e?.stopPropagation(); onChat(match); }} />
          {onVideoCall && <TooltipButton icon={Video} label="Video" onClick={(e: any) => { e?.stopPropagation(); onVideoCall(); }} />}
          <TooltipButton icon={MoreHorizontal} label="More" onClick={(e: any) => { e?.stopPropagation(); onOpenMenu(match.id, e); }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── ContextMenu ─── */
export function ContextMenu({
  isOpen, position, onClose, onFavorite, onPin, onUnmatch, onReport, onHold, onBlock, isFavorite, isPinned,
}: {
  isOpen: boolean; position: { x: number; y: number }; onClose: () => void;
  onFavorite: () => void; onPin: () => void; onUnmatch: () => void; onReport: () => void;
  onHold: () => void; onBlock: () => void;
  isFavorite: boolean; isPinned: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const menuItems = [
    { label: isFavorite ? 'Remove Favorite' : 'Add to Favorites', icon: isFavorite ? StarOff : Star, onClick: onFavorite, color: 'text-amber-400' },
    { label: isPinned ? 'Unpin' : 'Pin to Top', icon: isPinned ? PinOff : Pin, onClick: onPin, color: 'text-gray-600' },
    { label: 'Put on Hold', icon: Pause, onClick: onHold, color: 'text-amber-400/70' },
    { divider: true },
    { label: 'Report', icon: Flag, onClick: onReport, color: 'text-orange-400' },
    { label: 'Block', icon: Ban, onClick: onBlock, color: 'text-red-400' },
    { label: 'Unmatch', icon: UserMinus, onClick: onUnmatch, color: 'text-red-400' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div ref={ref} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.12 }}
        className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] py-1.5 w-48"
        style={{ top: position.y, left: Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - 210 : 200) }}>
        {menuItems.map((item, i) => {
          if ('divider' in item) return <div key={i} className="my-1.5 h-px bg-gray-50" />;
          const Icon = item.icon;
          return (
            <button key={i} onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors">
              <Icon className={cn('w-4 h-4', item.color)} />
              <span className={cn('text-[12px] font-medium', item.color)}>{item.label}</span>
            </button>
          );
        })}
      </motion.div>
    </>
  );
}
