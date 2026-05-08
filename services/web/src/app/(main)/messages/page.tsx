'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Phone, Video, MoreVertical, Pin, Archive, Image, Mic, Send, Smile, Paperclip,
  Shield, MessageCircle, ChevronLeft, Trash2, VolumeX, Reply, Edit3, X, Heart, Check,
  CheckCheck, Lock, AlertTriangle, Sparkles, Palette, EyeOff, Flag, Ban, Copy,
  Clock, Zap, Music, Gamepad2, User as UserIcon, Film, PauseCircle, PlayCircle,
  Download, Eye, UserX, Unlink, CheckSquare, Square, ListChecks, UserMinus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';

// ── Quick Reactions ──
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
const ALL_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍', '😍', '🤔', '👏', '🙌', '💀', '💯', '🎉', '😭', '🥰', '😈'];

// ── Entertainment Zone ──
const ENTERTAINMENT_ITEMS = [
  { icon: '🎮', label: 'Would You Rather', prompts: ['Travel to the future or the past?', 'Have unlimited money or unlimited time?', 'Be able to fly or be invisible?', 'Live by the ocean or in the mountains?'] },
  { icon: '💭', label: 'This or That', prompts: ['Netflix or chill?', 'Coffee or tea?', 'Morning person or night owl?', 'Cat or dog?'] },
  { icon: '🎲', label: 'Truth or Dare', prompts: ['What\'s your guilty pleasure?', 'Most embarrassing moment?', 'Send a screenshot of your last DM', 'Send your most used emoji'] },
  { icon: '❓', label: 'Deep Questions', prompts: ['What makes you feel alive?', 'What\'s your biggest dream?', 'If you could have dinner with anyone, who?', 'What\'s the best advice you\'ve received?'] },
  { icon: '🎵', label: 'Song Battle', prompts: ['Drop your favorite song right now 🎵', 'Song that describes your love life?', 'Your ultimate road trip anthem?', 'Song that makes you cry every time?'] },
  { icon: '📸', label: 'Photo Challenge', prompts: ['Show me your view right now!', 'Last photo in your gallery?', 'Your favorite selfie ever', 'A photo that makes you happy'] },
];

// ── Conversation Starter Categories ──
const SUGGESTION_CATEGORIES = [
  { label: '✨ Starters', context: undefined },
  { label: '💬 Casual', context: 'casual' },
  { label: '🔥 Flirty', context: 'flirty' },
  { label: '🧠 Deep', context: 'deep' },
  { label: '😄 Fun', context: 'fun' },
];

// ── Report Reasons ──
const REPORT_REASONS = [
  'Inappropriate messages',
  'Spam or scam',
  'Fake profile',
  'Harassment or bullying',
  'Underage user',
  'Threatening behavior',
  'Other',
];

// ── Unmatch Reasons ──
const UNMATCH_REASONS = [
  'Not feeling a connection',
  'Communication styles don\'t match',
  'Different life goals',
  'Distance is an issue',
  'Found someone else',
  'Moving too fast / too slow',
  'Incompatible values',
  'Not ready to date',
  'Other',
];

// ── Block Reasons ──
const BLOCK_REASONS = [
  'Inappropriate or offensive behavior',
  'Harassment',
  'Spam or scam',
  'Made me feel unsafe',
  'Fake profile',
  'Threatening behavior',
  'Other',
];

// ═══════════════════════════════════════════════════════════
// GLASS TOOLTIP BUTTON — shows label on hover with glass effect
// ═══════════════════════════════════════════════════════════
function GlassTooltipButton({ label, active, activeColor = 'lavender', onClick, children }: { label: string; active?: boolean; activeColor?: 'lavender' | 'amber'; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const colorActive = activeColor === 'amber' ? 'text-amber-400 bg-amber-400/10' : 'text-lavender-400 bg-lavender-400/10';
  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button onClick={onClick} className={cn('p-1.5 rounded-lg transition-all text-text-muted hover:text-text-primary', active && colorActive)}>
        {children}
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <span className="px-2 py-1 text-[10px] font-medium text-text-secondary whitespace-nowrap rounded-lg bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHAT LIST ITEM with 3-dot vertical menu
// ═══════════════════════════════════════════════════════════
function ChatListItem({ chat, active, onClick, onAction, selectMode, selected, onSelect }: { chat: any; active: boolean; onClick: () => void; onAction: (action: string, data?: any) => void; selectMode?: boolean; selected?: boolean; onSelect?: () => void }) {
  const other = chat.otherUser || chat.user1 || {};
  const name = other.displayName || 'User';
  const photo = other.photos?.[0]?.url || other.photos?.[0];
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const handleAction = (action: string, data?: any) => {
    setShowMenu(false);
    onAction(action, data);
  };

  return (
    <div className="relative">
      <button onClick={selectMode ? onSelect : onClick} className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-left group',
        active ? 'bg-lavender-400/10 border border-lavender-400/20' : 'hover:bg-miamo-elevated/50',
        selected && 'bg-lavender-400/5 border border-lavender-400/30',
        (chat.held || chat.onHold || chat._isHeld) && !active && 'opacity-40'
      )}>
        {selectMode && (
          <div className="shrink-0">
            {selected ? <CheckSquare className="w-5 h-5 text-lavender-400" /> : <Square className="w-5 h-5 text-text-muted/40" />}
          </div>
        )}
        <Avatar src={photo} name={name} size="md" online={other.online} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-text-primary truncate">{name}</h4>
              {chat._isHeld && <PauseCircle className="w-3 h-3 text-amber-400/70" />}
              {chat.muted && !chat._isHeld && <VolumeX className="w-3 h-3 text-text-muted/50" />}
              {chat.pinned && <Pin className="w-3 h-3 text-lavender-400" />}
            </div>
            {chat.lastMessageAt && <span className="text-[11px] text-text-muted shrink-0">{formatRelativeTime(chat.lastMessageAt)}</span>}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-text-muted truncate pr-2">{chat.lastMessagePreview || 'Start a conversation'}</p>
            {chat.unreadCount > 0 && (
              <span className="shrink-0 w-5 h-5 bg-lavender-400 text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center">{chat.unreadCount}</span>
            )}
          </div>
        </div>
        {/* 3-dot vertical menu trigger */}
        {!selectMode && (
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); setShowMenu(true); }}>
            <MoreVertical className="w-4 h-4 text-text-muted hover:text-text-primary" />
          </div>
        )}
      </button>

      {/* Chat list item context menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="absolute right-2 top-full mt-1 z-50 bg-miamo-card border border-border rounded-xl shadow-2xl py-1 w-52">
              <button onClick={() => handleAction('pin')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <Pin className="w-3 h-3" /> {chat.pinned ? 'Unpin chat' : 'Pin chat'}
              </button>
              <button onClick={() => handleAction('mute')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <VolumeX className="w-3 h-3" /> {chat.muted ? 'Unmute' : 'Mute notifications'}
              </button>
              <button onClick={() => handleAction('hold')} className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2">
                {chat._isHeld ? <><PlayCircle className="w-3 h-3" /> Resume</> : <><PauseCircle className="w-3 h-3" /> Hold</>}
              </button>
              <button onClick={() => handleAction('archive')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <Archive className="w-3 h-3" /> Archive
              </button>
              <button onClick={() => handleAction('hide')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <EyeOff className="w-3 h-3" /> Hide chat
              </button>
              <div className="h-px bg-border/30 my-0.5" />
              <button onClick={() => router.push('/profile')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <UserIcon className="w-3 h-3" /> View profile
              </button>
              <button onClick={() => handleAction('report')} className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-400/10 flex items-center gap-2">
                <Flag className="w-3 h-3" /> Report
              </button>
              <button onClick={() => handleAction('block')} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <Ban className="w-3 h-3" /> Block
              </button>
              <button onClick={() => handleAction('unmatch')} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <UserMinus className="w-3 h-3" /> Unmatch
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MESSAGE BUBBLE with double-click like, long-press menu, reactions, reply
// ═══════════════════════════════════════════════════════════
function MessageBubble({
  msg, isOwn, onReply, onEdit, onReact, onDeleteForMe, onDeleteForAll, onCopy, onHide, onDownload, onView,
}: {
  msg: any; isOwn: boolean;
  onReply: () => void; onEdit: () => void; onReact: (emoji: string) => void;
  onDeleteForMe: () => void; onDeleteForAll: () => void; onCopy: () => void; onHide: () => void;
  onDownload?: () => void; onView?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [liked, setLiked] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef<number>(0);

  // Double-tap to send ❤️
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setLiked(true);
      onReact('❤️');
      setTimeout(() => setLiked(false), 1200);
    }
    lastTap.current = now;
  };

  // Long press → context menu
  const handlePointerDown = () => { longPressTimer.current = setTimeout(() => setShowMenu(true), 500); };
  const handlePointerUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  // Parse reactions
  let reactions: { emoji: string; count: number }[] = [];
  try {
    if (msg.reactions) {
      const parsed = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions;
      if (Array.isArray(parsed)) {
        const counts: Record<string, number> = {};
        parsed.forEach((r: any) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
        reactions = Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
      }
    }
  } catch {}

  const canEdit = msg.createdAt && (Date.now() - new Date(msg.createdAt).getTime() < 2 * 60 * 60 * 1000);
  const canDeleteForAll = isOwn && canEdit;
  const isMedia = msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'file' || msg.content?.startsWith('📷') || msg.content?.startsWith('🎥') || msg.content?.startsWith('🎵') || msg.content?.startsWith('📄');

  if (msg.deletedForAll) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[70%] px-4 py-2.5 rounded-2xl bg-miamo-elevated/30 border border-border/20">
          <p className="text-xs text-text-muted italic flex items-center gap-1.5"><Ban className="w-3 h-3" /> This message was deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex group relative', isOwn ? 'justify-end' : 'justify-start')}>
      {/* Heart animation on double-tap */}
      <AnimatePresence>
        {liked && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400 }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative max-w-[70%]">
        {/* Reply reference */}
        {msg.replyTo && (
          <div className={cn('text-[10px] px-3 py-1 mb-0.5 rounded-t-xl border-l-2',
            isOwn ? 'border-lavender-400/50 bg-lavender-400/5 text-lavender-300/70' : 'border-text-muted/30 bg-miamo-elevated/50 text-text-muted'
          )}>
            <span className="font-semibold">{msg.replyTo.senderName || 'User'}</span>
            <p className="truncate">{msg.replyTo.content}</p>
          </div>
        )}

        <div onClick={handleTap} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm cursor-pointer select-none transition-all',
            isOwn ? 'bg-gradient-to-r from-lavender-400/20 to-violet-deep/20 text-text-primary rounded-br-md'
              : 'bg-miamo-elevated text-text-primary rounded-bl-md',
            msg.type === 'image' && 'p-1',
          )}>
          {msg.type === 'voice' ? (
            <div className="flex items-center gap-2 min-w-[160px]">
              <div className="w-8 h-8 rounded-full bg-lavender-400/20 flex items-center justify-center shrink-0"><Mic className="w-4 h-4 text-lavender-400" /></div>
              <div className="flex-1 h-1 bg-text-muted/20 rounded-full"><div className="h-full w-2/3 bg-lavender-400 rounded-full" /></div>
              <span className="text-[10px] text-text-muted">0:12</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          )}
          <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
            <span className={cn('text-[10px]', isOwn ? 'text-lavender-300/50' : 'text-text-muted/50')}>
              {msg.createdAt ? formatRelativeTime(msg.createdAt) : ''}
            </span>
            {msg.editedAt && <span className="text-[9px] text-text-muted/40 italic">edited</span>}
            {isOwn && <span className="ml-0.5">{msg.read ? <CheckCheck className="w-3 h-3 text-lavender-400" /> : <Check className="w-3 h-3 text-text-muted/40" />}</span>}
          </div>
        </div>

        {/* Reactions below bubble */}
        {reactions.length > 0 && (
          <div className={cn('flex gap-0.5 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
            {reactions.map((r, i) => (
              <span key={i} className="bg-miamo-elevated border border-border/30 rounded-full px-1.5 py-0.5 text-[11px] flex items-center gap-0.5">
                {r.emoji} {r.count > 1 && <span className="text-text-muted text-[9px]">{r.count}</span>}
              </span>
            ))}
          </div>
        )}

        {/* Hover action buttons */}
        <div className={cn(
          'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-miamo-card border border-border/30 rounded-lg shadow-lg p-0.5',
          isOwn ? 'right-full mr-1' : 'left-full ml-1'
        )}>
          <button onClick={() => setShowReactions(true)} className="p-1 hover:bg-miamo-elevated rounded text-text-muted hover:text-text-primary" title="React"><Smile className="w-3.5 h-3.5" /></button>
          <button onClick={onReply} className="p-1 hover:bg-miamo-elevated rounded text-text-muted hover:text-text-primary" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowMenu(true)} className="p-1 hover:bg-miamo-elevated rounded text-text-muted hover:text-text-primary" title="More"><MoreVertical className="w-3.5 h-3.5" /></button>
        </div>

        {/* Emoji reaction picker */}
        <AnimatePresence>
          {showReactions && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowReactions(false)} />
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                className={cn('absolute z-50 bg-miamo-card border border-border rounded-2xl shadow-xl p-2 flex flex-wrap gap-1 max-w-[220px]',
                  isOwn ? 'right-0' : 'left-0', 'bottom-full mb-2')}>
                {ALL_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => { onReact(emoji); setShowReactions(false); }}
                    className="w-8 h-8 rounded-lg hover:bg-miamo-elevated flex items-center justify-center text-lg hover:scale-125 transition-transform">{emoji}</button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className={cn('absolute z-50 bg-miamo-card border border-border rounded-xl shadow-xl py-1 w-48',
                  isOwn ? 'right-0' : 'left-0', 'top-full mt-1')}>
                {/* Quick reactions row at top */}
                <div className="flex gap-1 px-2 py-1.5 border-b border-border/30">
                  {QUICK_REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => { onReact(emoji); setShowMenu(false); }}
                      className="w-7 h-7 rounded-lg hover:bg-miamo-elevated flex items-center justify-center text-base hover:scale-110 transition-transform">{emoji}</button>
                  ))}
                </div>
                <button onClick={() => { onReply(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Reply className="w-3 h-3" /> Reply</button>
                <button onClick={() => { onCopy(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Copy className="w-3 h-3" /> Copy text</button>
                {canEdit && <button onClick={() => { onEdit(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Edit3 className="w-3 h-3" /> Edit <span className="ml-auto text-[9px] text-text-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> 2h</span></button>}
                {isMedia && onView && <button onClick={() => { onView(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Eye className="w-3 h-3" /> View</button>}
                {isMedia && onDownload && <button onClick={() => { onDownload(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Download className="w-3 h-3" /> Download</button>}
                <button onClick={() => { onHide(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><EyeOff className="w-3 h-3" /> Hide message</button>
                <div className="h-px bg-border/30 my-0.5" />
                <button onClick={() => { onDeleteForMe(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-orange-400 hover:bg-orange-500/10 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Delete for me</button>
                {canDeleteForAll && (
                  <button onClick={() => { onDeleteForAll(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                    <Trash2 className="w-3 h-3" /> Delete for everyone
                    <span className="ml-auto text-[9px] text-text-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> 2h</span>
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BACKGROUND PICKER
// ═══════════════════════════════════════════════════════════
function BackgroundPicker({ chatId, currentBg, onClose, onSelect }: { chatId: string; currentBg: string; onClose: () => void; onSelect: (bg: string, bgName?: string) => void }) {
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [customColor, setCustomColor] = useState('#EC407A');
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');

  useEffect(() => { api.getChatBackgrounds().then(r => setBackgrounds(r.data || [])).catch(() => {}); }, []);

  const handleSelect = async (bgValue: string, bgName?: string) => {
    try { await api.setChatBackground(chatId, bgValue); onSelect(bgValue, bgName); } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-miamo-card border border-border rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><Palette className="w-4 h-4 text-lavender-400" /> Chat Background</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2 p-3 border-b border-border/30">
          <button onClick={() => setTab('presets')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', tab === 'presets' ? 'bg-lavender-400/20 text-lavender-400' : 'text-text-muted hover:text-text-primary')}>Scenes ({backgrounds.length})</button>
          <button onClick={() => setTab('custom')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', tab === 'custom' ? 'bg-lavender-400/20 text-lavender-400' : 'text-text-muted hover:text-text-primary')}>Custom RGB</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {tab === 'presets' ? (
            <div className="grid grid-cols-3 gap-2">
              {backgrounds.map(bg => (
                <button key={bg.id} onClick={() => handleSelect(bg.value, bg.name)}
                  className={cn('aspect-[3/4] rounded-xl border-2 overflow-hidden flex flex-col items-center justify-end p-2',
                    currentBg === bg.value ? 'border-lavender-400 ring-2 ring-lavender-400/30' : 'border-border/30 hover:border-lavender-400/50'
                  )} style={{ background: bg.value }}>
                  <span className="text-[10px] text-gray-800 font-medium bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">{bg.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-12 h-12 rounded-xl border-0 cursor-pointer bg-transparent" />
                <input value={customColor} onChange={e => setCustomColor(e.target.value)} className="input-premium flex-1 text-sm font-mono" placeholder="#EC407A" />
              </div>
              <div className="aspect-[4/3] rounded-xl border border-border/30 flex items-end p-3" style={{ background: customColor }}>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5"><span className="text-xs text-gray-800">Preview</span></div>
              </div>
              <Button className="w-full" onClick={() => handleSelect(customColor, 'Custom Color')}>Apply Custom Color</Button>
              <div className="flex flex-wrap gap-2">
                {['#EC407A', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#D81B60', '#06B6D4', '#F97316', '#84CC16', '#FF80AB', '#E11D48'].map(c => (
                  <button key={c} onClick={() => { setCustomColor(c); handleSelect(c, 'Custom Color'); }} className="w-8 h-8 rounded-full border-2 border-border/30 hover:scale-110 transition-transform" style={{ background: c }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// HARSH WORDS WARNING
// ═══════════════════════════════════════════════════════════
function HarshWarningModal({ warnings, onSend, onCancel }: { warnings: string[]; onSend: () => void; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-miamo-card border border-red-500/30 rounded-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Content Warning</h3>
            <p className="text-xs text-text-muted">Harsh language detected</p>
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Your message contains words that may violate Miamo community guidelines. Sending inappropriate content could result in your profile being <span className="text-red-400 font-semibold">flagged or permanently blocked</span>.
        </p>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <p className="text-[11px] text-red-300/80">Detected: {warnings.join(', ')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Edit Message</Button>
          <Button className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" onClick={onSend}>Send Anyway</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// VOICE / VIDEO CALL OVERLAY
// ═══════════════════════════════════════════════════════════
function CallOverlay({ type, user, onEnd }: { type: 'voice' | 'video'; user: any; onEnd: () => void }) {
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'ringing' | 'connected'>('ringing');

  useEffect(() => { const t = setTimeout(() => setStatus('connected'), 3000); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (status !== 'connected') return;
    const i = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-miamo-bg via-miamo-bg/95 to-miamo-bg flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className={cn('w-28 h-28 rounded-full flex items-center justify-center', status === 'ringing' && 'animate-pulse')}>
            <Avatar src={user?.photos?.[0]?.url} name={user?.displayName || 'User'} size="lg" />
          </div>
          {status === 'ringing' && <div className="absolute inset-0 rounded-full border-2 border-lavender-400/30 animate-ping" />}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary">{user?.displayName || 'User'}</h2>
          <p className="text-sm text-text-muted mt-1">{status === 'ringing' ? (type === 'video' ? 'Video calling…' : 'Calling…') : fmt(duration)}</p>
        </div>
        <div className="flex items-center gap-4 mt-8">
          {type === 'video' && (
            <button className="w-14 h-14 rounded-full bg-miamo-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary"><Video className="w-6 h-6" /></button>
          )}
          <button className="w-14 h-14 rounded-full bg-miamo-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary"><Mic className="w-6 h-6" /></button>
          <button onClick={onEnd} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-gray-900 hover:bg-red-600 shadow-lg shadow-red-500/30"><Phone className="w-7 h-7 rotate-[135deg]" /></button>
          <button className="w-14 h-14 rounded-full bg-miamo-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary"><VolumeX className="w-6 h-6" /></button>
        </div>
        <div className="flex items-center gap-2 mt-4"><Lock className="w-3 h-3 text-emerald-400" /><span className="text-[11px] text-text-muted">End-to-end encrypted</span></div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHAT VIEW
// ═══════════════════════════════════════════════════════════
function ChatView({ chat, onBack, onRefreshChats, onReport, onUnmatch, onBlock }: { chat: any; onBack: () => void; onRefreshChats: () => void; onReport: () => void; onUnmatch: () => void; onBlock: () => void }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEntertainment, setShowEntertainment] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [chatBackground, setChatBackground] = useState(chat.background || '#FDF2F5');
  const [harshWarning, setHarshWarning] = useState<{ warnings: string[]; content: string } | null>(null);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());
  const [attachedFile, setAttachedFile] = useState<{ file: File; preview: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const other = chat.otherUser || chat.user1 || {};
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages
  // Load messages & mark as read (backend marks read on getChatMessages)
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    api.getChatMessages(chat.id).then(r => {
      setMessages(r.data || []);
      // Refresh chat list to update unread counts after marking read
      onRefreshChats();
    }).catch(() => {}).finally(() => setLoading(false));
    setReplyTo(null); setEditingMsg(null); setShowSuggestions(false); setShowEntertainment(false);
    setChatBackground(chat.background || '#FDF2F5');
  }, [chat.id]);

  // Poll for new messages every 3s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      api.getChatMessages(chat.id).then(r => {
        const newMsgs = r.data || [];
        setMessages(prev => newMsgs.length !== prev.length ? newMsgs : prev);
      }).catch(() => {});
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [chat.id]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Send with harsh-words check
  const handleSend = async (forceSend = false) => {
    const content = message.trim();
    if (!content) return;
    if (!forceSend) {
      try {
        const check = await api.checkContent(content);
        if (check.data && !check.data.safe) { setHarshWarning({ warnings: check.data.warnings, content }); return; }
      } catch {}
    }
    try {
      if (editingMsg) {
        await api.editMessage(editingMsg.id, content);
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content, editedAt: new Date().toISOString() } : m));
        setEditingMsg(null);
      } else {
        const res = await api.sendMessage(chat.id, content, 'text', replyTo?.id);
        if (res.data) setMessages(prev => [...prev, res.data]);
        setReplyTo(null);
      }
      setMessage('');
      setShowSuggestions(false);
    } catch (e) { console.error(e); }
  };

  const handlePin = async () => { try { await api.pinChat(chat.id, !chat.pinned); setShowMenu(false); onRefreshChats(); } catch {} };
  const handleMute = async () => { try { await api.muteChat(chat.id, !chat.muted); setShowMenu(false); onRefreshChats(); } catch {} };
  const handleArchive = async () => { try { await api.archiveChat(chat.id); onBack(); onRefreshChats(); } catch {} };
  const handleClear = async () => { try { await api.clearChat(chat.id); setMessages([]); setShowMenu(false); } catch {} };
  const handleDeleteForMe = async (id: string) => { try { await api.deleteMessageForMe(id); setMessages(p => p.filter(m => m.id !== id)); } catch {} };
  const handleDeleteForAll = async (id: string) => { try { await api.deleteMessageForAll(id); setMessages(p => p.map(m => m.id === id ? { ...m, deletedForAll: true, content: 'This message was deleted' } : m)); } catch {} };
  const handleReact = async (id: string, emoji: string) => {
    try {
      await api.reactToMessage(id, emoji);
      setMessages(p => p.map(m => {
        if (m.id !== id) return m;
        const existing = m.reactions ? (typeof m.reactions === 'string' ? JSON.parse(m.reactions) : m.reactions) : [];
        existing.push({ emoji, userId: currentUser?.id });
        return { ...m, reactions: JSON.stringify(existing) };
      }));
    } catch {}
  };
  const handleCopy = (content: string) => navigator.clipboard.writeText(content);
  const handleHide = (id: string) => setHiddenMsgIds(p => { const n = new Set(p); n.add(id); return n; });

  // File picker for media sharing
  const handleFilePick = (accept: string, mediaType: string) => {
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.dataset.mediaType = mediaType;
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mediaType = e.target.dataset?.mediaType || 'file';
    const preview = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : '';
    setAttachedFile({ file, preview, type: mediaType });
    // Reset input
    e.target.value = '';
  };

  const handleSendWithAttachment = async () => {
    if (!attachedFile) { handleSend(); return; }
    const content = message.trim() || `${attachedFile.type === 'photo' ? '📷' : attachedFile.type === 'video' ? '🎥' : attachedFile.type === 'audio' ? '🎵' : '📄'} ${attachedFile.file.name}`;
    try {
      const res = await api.sendMessage(chat.id, content, attachedFile.type === 'photo' ? 'image' : attachedFile.type, replyTo?.id);
      if (res.data) setMessages(prev => [...prev, { ...res.data, attachmentPreview: attachedFile.preview, attachmentName: attachedFile.file.name }]);
      setMessage('');
      setAttachedFile(null);
      setReplyTo(null);
    } catch (e) { console.error(e); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try { const r = await api.searchMessages(chat.id, searchQuery); setSearchResults(r.data || []); } catch {}
  };

  const loadSuggestions = async (context?: string) => {
    try { const r = await api.getChatSuggestions(chat.id, context); setSuggestions(r.data || []); setShowSuggestions(true); } catch {}
  };

  const goToProfile = () => router.push('/profile');
  const visibleMessages = messages.filter(m => !hiddenMsgIds.has(m.id));

  return (
    <div className="flex flex-col h-full relative min-h-0">
      <AnimatePresence>{callType && <CallOverlay type={callType} user={other} onEnd={() => setCallType(null)} />}</AnimatePresence>
      <AnimatePresence>{showBgPicker && <BackgroundPicker chatId={chat.id} currentBg={chatBackground} onClose={() => setShowBgPicker(false)} onSelect={(bg, bgName) => {
        setChatBackground(bg);
        setShowBgPicker(false);
        // Insert system message about background change
        const systemMsg = {
          id: `system-bg-${Date.now()}`,
          type: 'system',
          content: `💜 Chat background changed to "${bgName || 'new theme'}"`,
          createdAt: new Date().toISOString(),
          isSystem: true,
        };
        setMessages(prev => [...prev, systemMsg]);
      }} />}</AnimatePresence>
      <AnimatePresence>{harshWarning && <HarshWarningModal warnings={harshWarning.warnings} onSend={() => { setHarshWarning(null); handleSend(true); }} onCancel={() => setHarshWarning(null)} />}</AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-miamo-surface/30 backdrop-blur-sm z-10">
        <button onClick={onBack} className="lg:hidden text-text-muted hover:text-text-primary"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={goToProfile} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar src={other.photos?.[0]?.url} name={other.displayName || 'User'} size="sm" online={other.online} verified={other.verified} />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-primary">{other.displayName || 'User'}</h3>
            <p className="text-[11px] text-text-muted flex items-center gap-1">
              {other.online ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Active now</> : 'Tap to view profile'}
            </p>
          </div>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setCallType('voice')} title="Voice call"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setCallType('video')} title="Video call"><Video className="w-4 h-4" /></Button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full bg-miamo-elevated hover:bg-miamo-card border border-border/30 text-text-muted hover:text-text-primary transition-colors"><MoreVertical className="w-4 h-4" /></button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="absolute right-0 top-full mt-1 z-40 bg-miamo-card border border-border rounded-xl shadow-xl py-1 w-48">
                    <button onClick={() => { setShowSearch(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Search className="w-3 h-3" /> Search in chat</button>
                    <button onClick={() => { setShowBgPicker(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Palette className="w-3 h-3" /> Change background</button>
                    <button onClick={handlePin} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Pin className="w-3 h-3" /> {chat.pinned ? 'Unpin' : 'Pin chat'}</button>
                    <button onClick={handleMute} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><VolumeX className="w-3 h-3" /> {chat.muted ? 'Unmute' : 'Mute'}</button>
                    <button onClick={handleArchive} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Archive className="w-3 h-3" /> Archive</button>
                    <div className="h-px bg-border/30 my-0.5" />
                    <button onClick={goToProfile} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><UserIcon className="w-3 h-3" /> View profile</button>
                    <button onClick={() => { setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><EyeOff className="w-3 h-3" /> Hide chat</button>
                    <button onClick={() => { setShowMenu(false); onReport(); }} className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-400/10 flex items-center gap-2"><Flag className="w-3 h-3" /> Report</button>
                    <button onClick={() => { setShowMenu(false); onBlock(); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Ban className="w-3 h-3" /> Block</button>
                    <button onClick={() => { setShowMenu(false); onUnmatch(); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><UserMinus className="w-3 h-3" /> Unmatch</button>
                    <div className="h-px bg-border/30 my-0.5" />
                    <button onClick={handleClear} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Clear chat</button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-border/50 overflow-hidden">
            <div className="p-3 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search messages…" className="input-premium w-full pl-8 text-xs" autoFocus />
              </div>
              <Button size="sm" onClick={handleSearch}>Search</Button>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
            {searchResults.length > 0 && (
              <div className="px-3 pb-3 max-h-32 overflow-y-auto space-y-1">
                {searchResults.map(r => (
                  <div key={r.id} className="text-xs bg-miamo-elevated/50 rounded-lg px-3 py-2">
                    <span className="text-text-muted">{r.sender?.displayName}: </span><span className="text-text-primary">{r.content}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ background: chatBackground.startsWith('linear') || chatBackground.startsWith('radial') ? chatBackground : chatBackground.startsWith('#') ? chatBackground : undefined }}>
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] text-text-muted">End-to-end encrypted</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><img src="/logo.png" alt="" className="w-8 h-8 rounded-lg animate-pulse" /></div>
        ) : visibleMessages.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-lavender-400/10 flex items-center justify-center"><MessageCircle className="w-8 h-8 text-lavender-400" /></div>
            <div>
              <p className="text-sm font-medium text-text-primary">Say hello to {other.displayName?.split(' ')[0] || 'your match'} 💜</p>
              <p className="text-xs text-text-muted mt-1">Need help? Try AI suggestions below!</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadSuggestions()} className="gap-2"><Sparkles className="w-3.5 h-3.5" /> Get conversation starters</Button>
          </div>
        ) : (
          visibleMessages.map((msg: any) => (
            msg.isSystem ? (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
                  <span className="text-[11px] text-text-muted">{msg.content}</span>
                </div>
              </div>
            ) : (
            <MessageBubble key={msg.id} msg={msg} isOwn={msg.isOwn}
              onReply={() => { setReplyTo(msg); inputRef.current?.focus(); }}
              onEdit={() => { setEditingMsg(msg); setMessage(msg.content); inputRef.current?.focus(); }}
              onReact={(emoji) => handleReact(msg.id, emoji)}
              onDeleteForMe={() => handleDeleteForMe(msg.id)}
              onDeleteForAll={() => handleDeleteForAll(msg.id)}
              onCopy={() => handleCopy(msg.content)}
              onHide={() => handleHide(msg.id)}
              onView={() => {
                // Open media in new tab for viewing
                if (msg.attachmentPreview) window.open(msg.attachmentPreview, '_blank');
                else if (msg.mediaUrl) window.open(msg.mediaUrl, '_blank');
              }}
              onDownload={() => {
                // Download media
                const url = msg.attachmentPreview || msg.mediaUrl;
                if (url) {
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = msg.attachmentName || msg.content || 'download';
                  a.click();
                }
              }}
            />
            )
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── AI Suggestions Panel ── */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-lavender-400" /> AI Suggestions</span>
                <button onClick={() => setShowSuggestions(false)} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s: any, i: number) => (
                  <button key={i} onClick={() => { setMessage(s.text); setShowSuggestions(false); inputRef.current?.focus(); }}
                    className="bg-miamo-elevated/50 border border-border/30 rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-lavender-400/10 hover:border-lavender-400/30 hover:text-lavender-400 transition-all text-left max-w-[280px]">
                    {s.text}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {SUGGESTION_CATEGORIES.map((cat, i) => (
                  <button key={i} onClick={() => loadSuggestions(cat.context)}
                    className="px-2 py-1 rounded-full bg-miamo-elevated/30 text-[10px] text-text-muted hover:text-lavender-400 hover:bg-lavender-400/10 transition-colors">{cat.label}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Entertainment Zone ── */}
      <AnimatePresence>
        {showEntertainment && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-2"><Gamepad2 className="w-3.5 h-3.5 text-lavender-400" /> Entertainment Zone</span>
                <button onClick={() => setShowEntertainment(false)} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ENTERTAINMENT_ITEMS.map((item, i) => (
                  <button key={i} onClick={() => { const p = item.prompts[Math.floor(Math.random() * item.prompts.length)]; setMessage(`${item.icon} ${item.label}: ${p}`); setShowEntertainment(false); inputRef.current?.focus(); }}
                    className="bg-miamo-elevated/30 border border-border/20 rounded-xl p-3 text-center hover:bg-lavender-400/10 hover:border-lavender-400/20 transition-all group">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="text-[10px] text-text-muted group-hover:text-lavender-400 mt-1 font-medium">{item.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reply / Edit Bar ── */}
      <AnimatePresence>
        {(replyTo || editingMsg) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-miamo-elevated/30">
              <div className={cn('w-1 h-8 rounded-full', editingMsg ? 'bg-amber-400' : 'bg-lavender-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold">{editingMsg ? <span className="text-amber-400">Editing message</span> : <span className="text-lavender-400">Replying to {replyTo?.isOwn ? 'yourself' : other.displayName}</span>}</p>
                <p className="text-xs text-text-muted truncate">{editingMsg?.content || replyTo?.content}</p>
              </div>
              <button onClick={() => { setReplyTo(null); setEditingMsg(null); setMessage(''); }} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ── */}
      <div className="p-3 border-t border-border/50 bg-miamo-surface/30 backdrop-blur-sm">
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

        {/* Attachment preview */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-2 overflow-hidden">
              <div className="flex items-center gap-3 bg-miamo-elevated/50 border border-border/30 rounded-xl p-3">
                {attachedFile.preview && attachedFile.type === 'photo' ? (
                  <img src={attachedFile.preview} alt="Preview" className="w-14 h-14 object-contain rounded-lg" />
                ) : attachedFile.preview && attachedFile.type === 'video' ? (
                  <video src={attachedFile.preview} className="w-14 h-14 object-contain rounded-lg" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-lavender-400/10 flex items-center justify-center">
                    <Paperclip className="w-6 h-6 text-lavender-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{attachedFile.file.name}</p>
                  <p className="text-[10px] text-text-muted">{(attachedFile.file.size / 1024).toFixed(1)} KB · {attachedFile.type}</p>
                </div>
                <button onClick={() => setAttachedFile(null)} className="text-text-muted hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <div className="flex gap-0.5 items-end">
            <div className="relative">
              <Button variant="ghost" size="icon-sm" onClick={() => setShowAttachMenu(!showAttachMenu)} title="Attach"><Paperclip className="w-4 h-4" /></Button>
              <AnimatePresence>
                {showAttachMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowAttachMenu(false)} />
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                      className="absolute bottom-full mb-2 left-0 z-40 bg-miamo-card border border-border rounded-xl shadow-xl p-2 space-y-1 w-40">
                      <button onClick={() => handleFilePick('image/*', 'photo')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center"><Image className="w-3.5 h-3.5 text-blue-400" /></div> Photo
                      </button>
                      <button onClick={() => handleFilePick('video/*', 'video')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center"><Film className="w-3.5 h-3.5 text-rose-400" /></div> Video
                      </button>
                      <button onClick={() => handleFilePick('audio/*', 'audio')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center"><Music className="w-3.5 h-3.5 text-emerald-400" /></div> Audio
                      </button>
                      <button onClick={() => handleFilePick('*/*', 'file')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center"><Paperclip className="w-3.5 h-3.5 text-amber-400" /></div> File
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <Button variant="ghost" size="icon-sm" title="Voice message" onClick={() => setMessage('[🎤 Voice message]')}><Mic className="w-4 h-4" /></Button>
          </div>
          <div className="flex-1 relative">
            <input ref={inputRef} value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); attachedFile ? handleSendWithAttachment() : handleSend(); } }}
              placeholder={editingMsg ? 'Edit message…' : attachedFile ? `Add caption for ${attachedFile.file.name}…` : 'Type a message…'} className="input-premium w-full pr-20 text-sm" />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button onClick={() => loadSuggestions()} className="p-1.5 text-text-muted hover:text-lavender-400 transition-colors" title="AI suggestions"><Sparkles className="w-3.5 h-3.5" /></button>
              <button onClick={() => setShowEntertainment(!showEntertainment)} className="p-1.5 text-text-muted hover:text-lavender-400 transition-colors" title="Entertainment"><Gamepad2 className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 text-text-muted hover:text-text-secondary transition-colors" title="Emoji"><Smile className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <Button size="icon" className="shrink-0" onClick={() => attachedFile ? handleSendWithAttachment() : handleSend()}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FEEDBACK MODAL — Report / Unmatch / Block with reasons
// ═══════════════════════════════════════════════════════════
function MessagesFeedbackModal({ type, userName, onClose, onSubmit }: {
  type: 'unmatch' | 'report' | 'block';
  userName: string;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
}) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reasons = type === 'report' ? REPORT_REASONS : type === 'block' ? BLOCK_REASONS : UNMATCH_REASONS;
  const title = type === 'report' ? 'Report' : type === 'block' ? 'Block' : 'Unmatch';
  const subtitle = type === 'report' ? 'Help keep Miamo safe' : type === 'block' ? 'They won\'t be able to contact you' : 'Help us improve your matches';
  const iconColor = type === 'report' ? 'text-red-400 bg-red-400/10' : type === 'block' ? 'text-red-400 bg-red-400/10' : 'text-amber-400 bg-amber-400/10';
  const submitColor = type === 'unmatch' ? 'bg-white text-[#FDF2F5]' : 'bg-red-500 text-gray-900';

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedReason, details);
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1500);
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-x-4 top-[5%] max-w-md mx-auto bg-white border border-gray-200 rounded-[20px] shadow-2xl z-[60] overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconColor)}>
              {type === 'unmatch' ? <UserMinus className="w-5 h-5" /> : type === 'block' ? <Ban className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">{title} {userName}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-pink-50 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-[14px] font-semibold text-gray-900">Thank you for your feedback</p>
              <p className="text-[11px] text-gray-400 mt-1">This helps our AI improve your experience</p>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 px-1">Select a reason</p>
              {reasons.map((reason) => {
                const isActive = selectedReason === reason;
                return (
                  <button key={reason} onClick={() => setSelectedReason(reason)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                      isActive ? 'bg-gray-100 border-pink-200' : 'bg-transparent border-gray-100 hover:bg-gray-50',
                    )}>
                    <span className={cn('text-[13px] font-medium', isActive ? 'text-gray-900' : 'text-gray-500')}>{reason}</span>
                    {isActive && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#151522]" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
              <div className="pt-3">
                <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Additional details (optional) — helps our AI learn your preferences"
                  className="w-full h-20 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[12px] px-4 py-3 resize-none focus:border-pink-200 focus:outline-none placeholder:text-gray-400 transition-colors" />
              </div>
            </div>
            <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-500 text-[13px] font-semibold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleSubmit} disabled={!selectedReason || submitting}
                className={cn(
                  'flex-1 h-11 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2',
                  selectedReason ? submitColor : 'bg-gray-50 text-gray-300 cursor-not-allowed',
                )}>
                {submitting ? <img src="/logo.png" alt="" className="w-4 h-4 rounded animate-pulse" /> : title}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// MESSAGES PAGE
// ═══════════════════════════════════════════════════════════
export default function MessagesPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'archived' | 'hidden' | 'held'>('all');
  const [totalMsgCount, setTotalMsgCount] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [heldChatIds, setHeldChatIds] = useState<Set<string>>(new Set());
  const [heldUserIds, setHeldUserIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ type: 'unmatch' | 'report' | 'block'; userId: string; userName: string } | null>(null);

  // Sync held state from backend (source of truth)
  const syncHeldFromBackend = useCallback(async () => {
    try {
      const [incoming, matches] = await Promise.allSettled([
        api.getIncomingLikes({ showHeld: 'true' }),
        api.getMatches({ includeHeld: 'true' }),
      ]);
      const heldUids = new Set<string>();
      if (incoming.status === 'fulfilled') {
        (incoming.value.data || []).filter((i: any) => i.isHeld).forEach((i: any) => {
          if (i.user?.id) heldUids.add(i.user.id);
        });
      }
      if (matches.status === 'fulfilled') {
        (matches.value.data || []).filter((m: any) => m.isHeld).forEach((m: any) => {
          if (m.matchedUser?.id) heldUids.add(m.matchedUser.id);
        });
      }
      setHeldUserIds(heldUids);
    } catch {}
  }, []);

  // Load held state on mount
  useEffect(() => {
    setMounted(true);
    syncHeldFromBackend();
  }, [syncHeldFromBackend]);

  // Persist held chats to localStorage (backup) and update local held set
  const updateHeldChats = (updater: (prev: Set<string>) => Set<string>) => {
    setHeldChatIds(prev => {
      const next = updater(prev);
      return next;
    });
  };

  const loadChats = useCallback(() => {
    setLoading(true);
    const fetcher = tab === 'archived' ? api.getArchivedChats() : api.getChats();
    fetcher.then(r => {
      let data = r.data || [];
      // Count total messages across all chats
      const total = data.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      setTotalMsgCount(total);
      // Mark held chats based on backend heldUserIds (source of truth)
      data = data.map((c: any) => {
        const otherUserId = (c.otherUser || c.user1)?.id;
        return { ...c, _isHeld: heldUserIds.has(otherUserId) || heldChatIds.has(c.id) };
      });
      // Filter by tab
      if (tab === 'held') {
        data = data.filter((c: any) => c._isHeld);
      }
      setChats(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tab, heldUserIds, heldChatIds]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Poll chats every 5s — also re-sync held state
  useEffect(() => {
    const i = setInterval(() => {
      syncHeldFromBackend();
      const f = tab === 'archived' ? api.getArchivedChats() : api.getChats();
      f.then(r => {
        let data = (r.data || []).map((c: any) => {
          const otherUserId = (c.otherUser || c.user1)?.id;
          return { ...c, _isHeld: heldUserIds.has(otherUserId) || heldChatIds.has(c.id) };
        });
        if (tab === 'held') data = data.filter((c: any) => c._isHeld);
        setChats(data);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(i);
  }, [tab, heldUserIds, heldChatIds, syncHeldFromBackend]);

  const filteredChats = chats.filter(c => {
    const other = c.otherUser || c.user1 || {};
    return (other.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeConversation = chats.find(c => c.id === activeChat);

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sidebar ── */}
      <div className={cn('w-full lg:w-[360px] border-r border-border/50 flex flex-col bg-miamo-surface/20', activeChat && 'hidden lg:flex')}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-lavender-400" /> Messages
              {totalMsgCount > 0 && (
                <span className="ml-1 min-w-[22px] h-[22px] bg-lavender-400 rounded-full text-[11px] font-bold text-gray-900 flex items-center justify-center px-1.5">
                  {totalMsgCount > 99 ? '99+' : totalMsgCount}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              <GlassTooltipButton label="Select" active={selectMode} onClick={() => { setSelectMode(!selectMode); setSelectedChats(new Set()); }}>
                <ListChecks className="w-4 h-4" />
              </GlassTooltipButton>
              <GlassTooltipButton label="Hidden" active={tab === 'hidden'} onClick={() => setTab(tab === 'hidden' ? 'all' : 'hidden')}>
                <EyeOff className="w-4 h-4" />
              </GlassTooltipButton>
              <GlassTooltipButton label="Archived" active={tab === 'archived'} onClick={() => setTab(tab === 'archived' ? 'all' : 'archived')}>
                <Archive className="w-4 h-4" />
              </GlassTooltipButton>
            </div>
          </div>
          {tab !== 'all' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setTab('all')} className="text-text-muted hover:text-text-primary"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-text-muted font-medium">{tab === 'archived' ? 'Archived Chats' : tab === 'held' ? 'On Hold' : 'Hidden Chats'}</span>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations…" className="input-premium w-full pl-9 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-12"><img src="/logo.png" alt="" className="w-8 h-8 rounded-lg animate-pulse" /></div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <MessageCircle className="w-10 h-10 text-text-muted/20 mx-auto" />
              <p className="text-sm text-text-muted">{searchQuery ? 'No results' : tab === 'archived' ? 'No archived chats' : tab === 'hidden' ? 'No hidden chats' : tab === 'held' ? 'No conversations on hold' : 'No conversations yet'}</p>
            </div>
          ) : (
            filteredChats.map(c => <ChatListItem key={c.id} chat={c} active={c.id === activeChat} onClick={() => setActiveChat(c.id)}
              selectMode={selectMode}
              selected={selectedChats.has(c.id)}
              onSelect={() => setSelectedChats(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
              onAction={async (action, data) => {
                try {
                  const otherUserId = (c.otherUser || c.user1)?.id;
                  const otherName = (c.otherUser || c.user1)?.displayName || 'User';
                  switch (action) {
                    case 'pin': await api.pinChat(c.id, !c.pinned); break;
                    case 'mute': await api.muteChat(c.id, !c.muted); break;
                    case 'hold':
                      if (c._isHeld) {
                        // Resume: call backend, then re-sync
                        if (otherUserId) try { await api.resumeIncoming(otherUserId); } catch {}
                        setHeldUserIds(prev => { const n = new Set(prev); n.delete(otherUserId); return n; });
                        updateHeldChats(prev => { const n = new Set(prev); n.delete(c.id); return n; });
                      } else {
                        // Hold: call backend, then re-sync
                        if (otherUserId) try { await api.holdIncoming(otherUserId); } catch {}
                        setHeldUserIds(prev => { const n = new Set(prev); n.add(otherUserId); return n; });
                        updateHeldChats(prev => { const n = new Set(prev); n.add(c.id); return n; });
                      }
                      break;
                    case 'archive': await api.archiveChat(c.id); break;
                    case 'hide': await api.archiveChat(c.id); break;
                    case 'block':
                      if (otherUserId) setFeedbackModal({ type: 'block', userId: otherUserId, userName: otherName });
                      return; // Don't reload yet — modal will handle it
                    case 'unmatch':
                      if (otherUserId) setFeedbackModal({ type: 'unmatch', userId: otherUserId, userName: otherName });
                      return;
                    case 'report':
                      if (otherUserId) setFeedbackModal({ type: 'report', userId: otherUserId, userName: otherName });
                      return;
                  }
                  loadChats();
                } catch {}
              }}
            />)
          )}
        </div>
        {/* Selection action bar */}
        {selectMode && selectedChats.size > 0 ? (
          <div className="p-3 border-t border-border/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">{selectedChats.size} selected</span>
              <button onClick={() => { setSelectedChats(new Set(filteredChats.map(c => c.id))); }} className="text-[11px] text-lavender-400 hover:underline">Select all</button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {tab === 'held' ? (
                <>
                  <button onClick={async () => {
                    // Resume all selected: call backend for each, then sync held state
                    for (const id of Array.from(selectedChats)) {
                      const chat = chats.find(ch => ch.id === id);
                      const otherUserId = (chat?.otherUser || chat?.user1)?.id;
                      if (otherUserId) try { await api.resumeIncoming(otherUserId); } catch {}
                    }
                    await syncHeldFromBackend();
                    updateHeldChats(prev => { const n = new Set(prev); Array.from(selectedChats).forEach(id => n.delete(id)); return n; });
                    setSelectedChats(new Set()); setSelectMode(false); loadChats();
                  }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors">
                    <PlayCircle className="w-3 h-3" /> Resume
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Unlink className="w-3 h-3" /> Unmatch
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-miamo-elevated border border-border/30 text-text-secondary text-[11px] font-medium hover:bg-miamo-card transition-colors">
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.muteChat(id, true); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-miamo-elevated border border-border/30 text-text-secondary text-[11px] font-medium hover:bg-miamo-card transition-colors">
                    <VolumeX className="w-3 h-3" /> Mute
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.pinChat(id, true); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-miamo-elevated border border-border/30 text-text-secondary text-[11px] font-medium hover:bg-miamo-card transition-colors">
                    <Pin className="w-3 h-3" /> Pin
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Unlink className="w-3 h-3" /> Unmatch
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-border/30">
            <div className="flex items-center justify-center gap-2 py-1"><Lock className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-text-muted">End-to-end encrypted</span></div>
          </div>
        )}
      </div>

      {/* ── Chat View ── */}
      <div className={cn('flex-1 flex flex-col min-h-0', !activeChat && 'hidden lg:flex')}>
        {activeConversation ? (
          <ChatView chat={activeConversation} onBack={() => setActiveChat(null)} onRefreshChats={loadChats}
            onReport={() => {
              const other = activeConversation.otherUser || activeConversation.user1;
              if (other?.id) setFeedbackModal({ type: 'report', userId: other.id, userName: other.displayName || 'User' });
            }}
            onUnmatch={() => {
              const other = activeConversation.otherUser || activeConversation.user1;
              if (other?.id) setFeedbackModal({ type: 'unmatch', userId: other.id, userName: other.displayName || 'User' });
            }}
            onBlock={() => {
              const other = activeConversation.otherUser || activeConversation.user1;
              if (other?.id) setFeedbackModal({ type: 'block', userId: other.id, userName: other.displayName || 'User' });
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-lavender-400/10 to-violet-deep/10 flex items-center justify-center"><MessageCircle className="w-10 h-10 text-lavender-400/40" /></div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Your Messages</h3>
                <p className="text-sm text-text-muted mt-1">Select a conversation to start chatting</p>
              </div>
              <div className="flex items-center justify-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-text-muted">All messages are private and encrypted</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Feedback Modal (Report / Unmatch / Block) ─── */}
      <AnimatePresence>
        {feedbackModal && (
          <MessagesFeedbackModal
            type={feedbackModal.type}
            userName={feedbackModal.userName}
            onClose={() => setFeedbackModal(null)}
            onSubmit={async (reason, details) => {
              const { type, userId } = feedbackModal;
              try {
                if (type === 'unmatch') {
                  await api.unmatchByUser(userId, reason, details);
                } else if (type === 'report') {
                  await api.reportByUser(userId, reason, details);
                } else if (type === 'block') {
                  await api.blockByUser(userId, reason, details);
                }
              } catch {}
              setFeedbackModal(null);
              loadChats();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}