'use client';

import React, { useState, useEffect, useId, useRef, useCallback, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Camera, Mic, MessageSquare, Palette, Heart, Clock, Trophy, Flame, Shield,
  AlertTriangle, Send, MoreVertical, ChevronLeft, ChevronRight, Trash2, Ban,
  Flag, Eye, EyeOff, Film, Sparkles, Moon, Music, Lightbulb,
  ChevronDown, Play, ArrowUp, ArrowDown, Users, Crown,
  Check, CheckCheck, Volume2, Coffee, Activity, UserMinus, ThumbsUp, Filter, X,
  Hourglass, Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { BEAT_STATES } from '@/lib/constants';
import { cn, formatRelativeTime } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════
   ERROR BOUNDARY — prevents full page crash
   ═══════════════════════════════════════════════════════════ */
class BeatsErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[BeatsErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-3xl mx-auto p-6 text-center py-20">
          <Zap className="w-10 h-10 text-pink-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-4">The Beats page encountered an error. Please try refreshing.</p>
          {this.state.error && (
            <p className="text-xs text-red-400 font-mono mb-4 max-w-lg mx-auto break-all">
              {this.state.error.message}
            </p>
          )}
          <Button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
            Refresh Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════════════════════
   BEATS ICON — UNIQUE ANIMATED HEARTBEAT PULSE
   ═══════════════════════════════════════════════════════════ */
function BeatsIcon({ size = 24, className, animate = false }: { size?: number; className?: string; animate?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}
      animate={animate ? { scale: [1, 1.15, 1, 1.1, 1] } : undefined}
      transition={animate ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <path d="M16 28S3 20 3 12a6.5 6.5 0 0 1 13-1 6.5 6.5 0 0 1 13 1c0 8-13 16-13 16Z"
        fill={`url(#g${id})`} stroke={`url(#s${id})`} strokeWidth="1.5" />
      <path d="M6 15h4l2-4 3 8 2-6 2 4 3-2h4"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity="0.9" />
      <circle cx="8" cy="9" r="1" fill="white" opacity="0.6" />
      <circle cx="24" cy="9" r="1" fill="white" opacity="0.6" />
      <defs>
        <linearGradient id={`g${id}`} x1="3" y1="6" x2="29" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EC407A" />
          <stop offset="50%" stopColor="#E91E63" />
          <stop offset="100%" stopColor="#AD1457" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="3" y1="6" x2="29" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F48FB1" />
          <stop offset="100%" stopColor="#880E4F" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & TYPES
   ═══════════════════════════════════════════════════════════ */
const BEAT_TYPES = [
  { type: 'photo', icon: Camera, label: 'Photo', color: 'text-sky-500', bg: 'bg-sky-500/10', desc: 'Share a moment' },
  { type: 'video', icon: Film, label: 'Video', color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Send a clip' },
  { type: 'voice', icon: Mic, label: 'Voice', color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Voice note' },
  { type: 'text', icon: MessageSquare, label: 'Text', color: 'text-pink-500', bg: 'bg-pink-500/10', desc: 'Quick thought' },
  { type: 'creative', icon: Palette, label: 'Creative', color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Art & doodles' },
  { type: 'mood', icon: Heart, label: 'Mood', color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'How you feel' },
  { type: 'music', icon: Music, label: 'Music', color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'Share a song' },
  { type: 'gif', icon: Play, label: 'GIF', color: 'text-orange-500', bg: 'bg-orange-500/10', desc: 'Fun reaction' },
];

const ICE_BREAKERS: { category: string; icon: any; prompts: string[] }[] = [
  { category: 'Starters', icon: Lightbulb, prompts: [
    "What's the best thing that happened to you today? \u2600\uFE0F",
    "If you could teleport anywhere right now, where would you go? \uD83C\uDF0D",
    "What song is stuck in your head today? \uD83C\uDFB5",
    "Tell me something random about yourself I'd never guess \uD83E\uDD14",
    "What's your comfort food when you're having a bad day? \uD83C\uDF55",
  ]},
  { category: 'Fun', icon: Sparkles, prompts: [
    "Would you rather always be slightly cold or slightly hot? \uD83E\uDDCA\uD83D\uDD25",
    "What's the most embarrassing autocorrect you've had? \uD83D\uDE02",
    "On a scale of 1-10, how addicted to your phone are you? \uD83D\uDCF1",
    "What's your go-to karaoke song? \uD83C\uDFA4",
    "If you were a pizza topping, what would you be? \uD83C\uDF55",
  ]},
  { category: 'Deep', icon: Moon, prompts: [
    "What's something you're proud of but rarely get to talk about? \uD83C\uDF1F",
    "What does your ideal lazy Sunday look like? \u2615",
    "If money wasn't a thing, what would you do with your life? \uD83D\uDCAD",
    "What's a small act of kindness that stuck with you? \uD83D\uDC95",
    "What's on your bucket list that surprises people? \u2708\uFE0F",
  ]},
  { category: 'Know You', icon: Coffee, prompts: [
    "Morning person or night owl? No wrong answer \uD83C\uDF05\uD83E\uDD89",
    "What are you binge-watching right now? \uD83D\uDCFA",
    "Dogs, cats, or... chameleons? \uD83D\uDC15\uD83D\uDC08",
    "What's your love language? \uD83D\uDC9D",
    "Coffee, tea, or neither? This is important. \u2615\uD83C\uDF75",
  ]},
];

const MILESTONE_EMOJIS: Record<number, { emoji: string; label: string; color: string }> = {
  3: { emoji: '🔥', label: 'First Spark!', color: 'text-orange-500' },
  7: { emoji: '⭐', label: 'Week Warrior!', color: 'text-amber-500' },
  14: { emoji: '💫', label: 'Two Week Champion!', color: 'text-purple-500' },
  30: { emoji: '🏆', label: 'Monthly Master!', color: 'text-yellow-500' },
  50: { emoji: '💎', label: 'Diamond Streak!', color: 'text-cyan-500' },
  100: { emoji: '👑', label: 'Beat Royalty!', color: 'text-amber-400' },
  150: { emoji: '🌟', label: 'Legendary!', color: 'text-yellow-300' },
  200: { emoji: '🔱', label: 'Unstoppable!', color: 'text-blue-400' },
  365: { emoji: '🎂', label: '1 Year Anniversary!', color: 'text-pink-500' },
  500: { emoji: '💝', label: 'Soulmate Streak!', color: 'text-rose-500' },
  730: { emoji: '💍', label: '2 Year Bond!', color: 'text-violet-500' },
  1095: { emoji: '🏛️', label: '3 Year Legacy!', color: 'text-indigo-500' },
  1460: { emoji: '🌍', label: '4 Year Journey!', color: 'text-emerald-500' },
  1825: { emoji: '♾️', label: '5 Year Forever!', color: 'text-amber-300' },
};

const REMOVE_REASONS = [
  { code: 'lost-interest', label: 'Lost interest', icon: ThumbsUp },
  { code: 'no-response', label: 'They never respond', icon: EyeOff },
  { code: 'uncomfortable', label: 'Made me uncomfortable', icon: Shield },
  { code: 'found-someone', label: 'Found someone else', icon: Heart },
  { code: 'taking-break', label: 'Taking a break', icon: Coffee },
];

const BLOCK_REASONS = [
  { code: 'harassment', label: 'Harassment', icon: AlertTriangle },
  { code: 'inappropriate', label: 'Inappropriate content', icon: Flag },
  { code: 'spam', label: 'Spam / fake', icon: Ban },
  { code: 'unsafe', label: 'Made me feel unsafe', icon: Shield },
];

interface BeatMatch {
  id: string;
  matchId: string;
  matchedUser: { id: string; displayName: string; photos: any[]; online?: boolean; verified?: boolean };
  count: number;
  state: string;
  todayCompleted: boolean;
  iSentToday: boolean;
  theyCompletedToday: boolean;
  streakDeadline: string; // ISO timestamp — when the 24h window ends
  lastBeatAt?: string;
  longestStreak?: number;
  totalSent?: number;
  totalReceived?: number;
}

interface BeatEntry {
  id: string;
  type: string;
  content: string;
  sender: 'me' | 'them';
  sentAt: string;
  seen?: boolean;
  showInChat?: boolean;
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA — used when API returns empty (demo)
   ═══════════════════════════════════════════════════════════ */
// Helpers for streak deadline (end of current 24h window)
function getStreakDeadline(): string {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setHours(23, 59, 59, 999);
  return deadline.toISOString();
}

function getHoursLeft(deadline: string): number {
  return Math.max(0, (new Date(deadline).getTime() - Date.now()) / 3600000);
}

function formatTimeLeft(deadline: string): string {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

/* ═══════════════════════════════════════════════════════════
   STREAK FLAME BADGE
   ═══════════════════════════════════════════════════════════ */
function StreakFlame({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-7 h-7 text-[9px]', md: 'w-9 h-9 text-[11px]', lg: 'w-12 h-12 text-sm' };
  const color = count >= 30 ? 'from-amber-400 to-orange-500' : count >= 14 ? 'from-pink-500 to-rose-500' : count >= 7 ? 'from-pink-400 to-pink-500' : 'from-gray-300 to-gray-400';
  return (
    <motion.div
      animate={count >= 7 ? { scale: [1, 1.1, 1] } : undefined}
      transition={count >= 7 ? { duration: 2, repeat: Infinity } : undefined}
      className={cn('relative rounded-full bg-gradient-to-br flex items-center justify-center font-black text-white shadow-lg', sizeMap[size], color)}
    >
      {count >= 7 && <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />}
      <span className="relative z-10">{count}</span>
      {count >= 14 && (
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -top-0.5 -right-0.5 text-[10px]">{'\uD83D\uDD25'}</motion.div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STREAK COUNTDOWN — hourglass with time remaining
   ═══════════════════════════════════════════════════════════ */
function StreakCountdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const urgent = h < 3;
  const critical = h < 1;
  return (
    <motion.div
      animate={critical ? { scale: [1, 1.08, 1] } : undefined}
      transition={critical ? { duration: 1.5, repeat: Infinity } : undefined}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold',
        critical ? 'bg-red-50 text-red-600 border border-red-200' :
        urgent ? 'bg-amber-50 text-amber-600 border border-amber-200' :
        'bg-gray-50 text-gray-500 border border-gray-100'
      )}
    >
      <Hourglass className={cn('w-3 h-3', critical ? 'text-red-500' : urgent ? 'text-amber-500' : 'text-gray-400')} />
      {h > 0 ? `${h}h ${m}m` : `${m}m`}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BEAT STATUS — shows who still needs to send
   ═══════════════════════════════════════════════════════════ */
function BeatDayStatus({ beat }: { beat: BeatMatch }) {
  const { iSentToday, theyCompletedToday, todayCompleted } = beat;
  const name = beat.matchedUser?.displayName?.split(' ')[0] || 'They';

  if (todayCompleted) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
        <CheckCheck className="w-3 h-3" /> Both sent — streak saved!
      </div>
    );
  }
  if (iSentToday && !theyCompletedToday) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
        <Clock className="w-3 h-3" /> You sent — waiting for {name}
      </div>
    );
  }
  if (!iSentToday && theyCompletedToday) {
    return (
      <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200">
        <Zap className="w-3 h-3" /> {name} sent — your turn!
      </motion.div>
    );
  }
  // Neither sent
  return (
    <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}
      className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> No one sent yet!
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MILESTONE CELEBRATION POPUP
   ═══════════════════════════════════════════════════════════ */
function MilestoneCelebration({ count, onClose }: { count: number; onClose: () => void }) {
  const milestone = Object.entries(MILESTONE_EMOJIS).reverse().find(([k]) => count >= Number(k));
  if (!milestone) return null;
  const [, data] = milestone;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }} animate={{ y: 0 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="card-premium p-8 text-center max-w-sm mx-4 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-amber-50/50" />
        <div className="relative z-10">
          <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: 2 }}
            className="text-6xl mb-4">{data.emoji}</motion.div>
          <h2 className={cn('text-2xl font-black mb-2', data.color)}>{data.label}</h2>
          <p className="text-gray-500 text-sm mb-1">{count} day streak achieved!</p>
          <p className="text-xs text-gray-400 mb-6">You&apos;re building something special. Keep the connection alive!</p>
          <Button onClick={onClose} size="lg" className="shimmer-glass">Amazing!</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONFIRMATION POPUP
   ═══════════════════════════════════════════════════════════ */
function ConfirmPopup({ title, message, confirmText, danger, onConfirm, onCancel }: {
  title: string; message: string; confirmText: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}
    >
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="card-premium p-6 max-w-sm mx-4"
      >
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'default'} className="flex-1" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   THREE-DOT MENU
   ═══════════════════════════════════════════════════════════ */
function BeatMenu({ onRemove, onBlock, onReport, onMute }: {
  onRemove: () => void; onBlock: () => void; onReport: () => void; onMute: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { label: 'Remove from Beats', icon: UserMinus, action: onRemove, danger: false },
    { label: 'Mute notifications', icon: Volume2, action: onMute, danger: false },
    { label: 'Report', icon: Flag, action: () => { setOpen(false); onReport(); }, danger: false },
    { label: 'Block user', icon: Ban, action: onBlock, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
              className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 py-1 overflow-visible"
            >
              {items.map(item => {
                const ItemIcon = item.icon;
                return (
                  <button key={item.label} onClick={(e) => { e.stopPropagation(); setOpen(false); item.action(); }}
                    className={cn('flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] font-medium transition-colors',
                      item.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-50'
                    )}>
                    <ItemIcon className="w-4 h-4" /> {item.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BEAT ENTRY ROW — single sent/received beat
   ═══════════════════════════════════════════════════════════ */
function BeatEntryRow({ entry, onDelete, onToggleChat }: {
  entry: BeatEntry; onDelete: (id: string) => void; onToggleChat: (id: string) => void;
}) {
  const beatType = BEAT_TYPES.find(t => t.type === entry.type) || BEAT_TYPES[3];
  const Icon = beatType.icon;
  const isMine = entry.sender === 'me';

  return (
    <motion.div initial={{ opacity: 0, x: isMine ? 10 : -10 }} animate={{ opacity: 1, x: 0 }}
      className={cn('flex gap-3 py-3 px-4 rounded-xl transition-colors hover:bg-gray-50/50', isMine ? 'flex-row-reverse' : '')}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', beatType.bg)}>
        <Icon className={cn('w-4 h-4', beatType.color)} />
      </div>
      <div className={cn('flex-1 min-w-0', isMine ? 'text-right' : '')}>
        <p className="text-[13px] text-gray-700 leading-relaxed">{entry.content}</p>
        <div className={cn('flex items-center gap-2 mt-1', isMine ? 'justify-end' : '')}>
          <span className="text-[10px] text-gray-400">{formatRelativeTime(entry.sentAt)}</span>
          {isMine && entry.seen && <CheckCheck className="w-3 h-3 text-sky-400" />}
          {entry.showInChat && <span className="text-[9px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded-full font-medium">In Chat</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onToggleChat(entry.id)} title={entry.showInChat ? 'Hide from chat' : 'Show in chat'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-pink-500 hover:bg-pink-50 transition-all">
          {entry.showInChat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onDelete(entry.id)} title="Delete"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MATCH BEATS CHAT VIEW — shows beat history for one match
   ═══════════════════════════════════════════════════════════ */
function MatchBeatsChatView({ beat, entries, onBack, onSendBeat, onDeleteEntry, onToggleChat, filter, setFilter }: {
  beat: BeatMatch; entries: BeatEntry[]; onBack: () => void;
  onSendBeat: (type: string) => void; onDeleteEntry: (id: string) => void;
  onToggleChat: (id: string) => void; filter: 'all' | 'sent' | 'received';
  setFilter: (f: 'all' | 'sent' | 'received') => void;
}) {
  const other = beat.matchedUser || { id: '', displayName: 'Unknown', photos: [], online: false, verified: false };
  const photo = other.photos?.[0]?.url || other.photos?.[0] || undefined;
  const filtered = entries.filter(e =>
    filter === 'all' ? true : filter === 'sent' ? e.sender === 'me' : e.sender === 'them'
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-pink-100/30">
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <Avatar src={photo} name={other.displayName} size="sm" online={other.online} verified={other.verified} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            {other.displayName}
            {other.verified && <Check className="w-3.5 h-3.5 text-pink-500" />}
          </h3>
          <p className="text-[11px] text-gray-400">{beat.count} day streak &bull; {beat.totalSent || 0} sent &bull; {beat.totalReceived || 0} received</p>
        </div>
        <StreakFlame count={beat.count} size="sm" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-pink-100/20">
        {([
          { key: 'all' as const, label: 'All Beats' },
          { key: 'sent' as const, label: 'Sent' },
          { key: 'received' as const, label: 'Received' },
        ]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
              filter === f.key ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'text-gray-500 hover:bg-gray-50'
            )}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-400">{filtered.length} beats</span>
      </div>

      {/* Beat entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <BeatsIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm text-gray-400">No beats yet. Send the first one!</p>
          </div>
        ) : (
          filtered.map(entry => (
            <BeatEntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} onToggleChat={onToggleChat} />
          ))
        )}
      </div>

      {/* Quick send bar */}
      <div className="border-t border-pink-100/30 p-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {BEAT_TYPES.slice(0, 6).map(bt => {
            const BtIcon = bt.icon;
            return (
            <button key={bt.type} onClick={() => onSendBeat(bt.type)}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all',
                'bg-gradient-to-r from-white to-pink-50/50 border border-pink-100/30 text-gray-600 hover:border-pink-200 hover:shadow-sm active:scale-95'
              )}>
              <BtIcon className={cn('w-3.5 h-3.5', bt.color)} /> {bt.label}
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SENT / RECEIVED LIST VIEW
   ═══════════════════════════════════════════════════════════ */
function BeatListView({ beats, direction, onSelectMatch }: {
  beats: BeatMatch[]; direction: 'sent' | 'received'; onSelectMatch: (b: BeatMatch) => void;
}) {
  const total = beats.reduce((sum, b) => sum + (direction === 'sent' ? (b.totalSent || 0) : (b.totalReceived || 0)), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          {direction === 'sent' ? <ArrowUp className="w-4 h-4 text-pink-500" /> : <ArrowDown className="w-4 h-4 text-emerald-500" />}
          Total {direction === 'sent' ? 'Sent' : 'Received'}: <span className="text-pink-600">{total}</span>
        </h3>
      </div>
      <div className="space-y-2">
        {beats.filter(b => (direction === 'sent' ? (b.totalSent || 0) : (b.totalReceived || 0)) > 0).map(beat => {
          const other = beat.matchedUser || { id: '', displayName: 'Unknown', photos: [], online: false, verified: false };
          const photo = other.photos?.[0]?.url || other.photos?.[0] || undefined;
          const count = direction === 'sent' ? (beat.totalSent || 0) : (beat.totalReceived || 0);
          return (
            <motion.button key={beat.id} whileHover={{ x: 3 }} onClick={() => onSelectMatch(beat)}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-pink-50/40 transition-all text-left"
            >
              <Avatar src={photo} name={other.displayName} size="sm" online={other.online} verified={other.verified} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">{other.displayName}</p>
                <p className="text-[11px] text-gray-400">{count} {direction} &bull; Last: {beat.lastBeatAt ? formatRelativeTime(beat.lastBeatAt) : 'Never'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700">{count}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ICE BREAKER PANEL
   ═══════════════════════════════════════════════════════════ */
function IceBreakerPanel({ onSend }: { onSend: (text: string) => void }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const category = ICE_BREAKERS[activeCategory];

  return (
    <Card className="p-4 border-amber-200/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Ice Breakers</h3>
          <p className="text-[10px] text-gray-400">Don&apos;t know what to say? Try these!</p>
        </div>
      </div>
      <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {ICE_BREAKERS.map((cat, i) => {
          const CatIcon = cat.icon;
          return (
            <button key={cat.category} onClick={() => setActiveCategory(i)}
              className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all',
                activeCategory === i ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              )}>
              <CatIcon className="w-3 h-3" /> {cat.category}
            </button>
          );
        })}
      </div>
      <div className="space-y-1.5">
        {category.prompts.map((prompt, i) => (
          <motion.button key={i} whileHover={{ x: 4 }} onClick={() => onSend(prompt)}
            className="flex items-center gap-2 w-full text-left p-2.5 rounded-lg hover:bg-amber-50/50 transition-all group"
          >
            <span className="text-[12px] text-gray-600 leading-relaxed flex-1">{prompt}</span>
            <Send className="w-3.5 h-3.5 text-gray-300 group-hover:text-pink-500 transition-colors shrink-0" />
          </motion.button>
        ))}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   NUDGE SYSTEM
   ═══════════════════════════════════════════════════════════ */
function NudgeBar({ beats }: { beats: BeatMatch[] }) {
  const needsAttention = beats.filter(b => !b.todayCompleted && (b.state === 'weak' || b.state === 'critical'));
  const ghosted = beats.filter(b => b.lastBeatAt && Date.now() - new Date(b.lastBeatAt).getTime() > 48 * 3600000);

  if (needsAttention.length === 0 && ghosted.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="card-premium p-4 border-amber-200/40 bg-gradient-to-r from-amber-50/60 to-orange-50/40"
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-bold text-amber-700">Attention Needed</span>
      </div>
      {needsAttention.length > 0 && (
        <p className="text-[11px] text-amber-600 mb-1">
          {needsAttention.length} streak{needsAttention.length > 1 ? 's' : ''} fading — send a beat to keep {needsAttention.length > 1 ? 'them' : 'it'} alive!
        </p>
      )}
      {ghosted.length > 0 && (
        <p className="text-[11px] text-amber-600">
          {ghosted.length} match{ghosted.length > 1 ? 'es' : ''} haven&apos;t responded in 48h — try an ice breaker?
        </p>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, color, icon, clickable, subtitle, onClick }: {
  label: string; value: number; color: string; icon: React.ReactNode;
  clickable?: boolean; subtitle?: string; onClick?: () => void;
}) {
  return (
    <motion.div whileHover={clickable ? { y: -2 } : undefined}
      className={cn('card-premium p-4 text-center', clickable && 'cursor-pointer')}
      onClick={onClick}
    >
      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br mx-auto mb-2 flex items-center justify-center shadow-lg', color)}>
        {icon}
      </div>
      <p className="text-2xl font-black text-gray-800">{value}</p>
      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
      {subtitle && (
        <p className="text-[9px] text-pink-400 font-semibold mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BEAT TYPE BUTTON
   ═══════════════════════════════════════════════════════════ */
function BeatTypeButton({ bt, onClick }: { bt: typeof BEAT_TYPES[number]; onClick: () => void }) {
  const Icon = bt.icon;
  return (
    <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.93 }} onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-b from-white to-gray-50/50 border border-gray-100/60 hover:border-pink-200/60 hover:shadow-sm transition-all"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bt.bg)}>
        <Icon className={cn('w-4 h-4', bt.color)} />
      </div>
      <span className="text-[10px] font-semibold text-gray-500">{bt.label}</span>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN BEATS PAGE
   ═══════════════════════════════════════════════════════════ */
export default function BeatsPage() {
  return (
    <BeatsErrorBoundary>
      <BeatsPageInner />
    </BeatsErrorBoundary>
  );
}

function BeatsPageInner() {
  const [beats, setBeats] = useState<BeatMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'sent' | 'received'>('dashboard');
  const [selectedBeat, setSelectedBeat] = useState<BeatMatch | null>(null);
  const [beatEntries, setBeatEntries] = useState<BeatEntry[]>([]);
  const [chatFilter, setChatFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [showIceBreakers, setShowIceBreakers] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'block' | 'delete'; beatId: string; entryId?: string } | null>(null);
  const [celebration, setCelebration] = useState<number | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [quickBeatType, setQuickBeatType] = useState<string | null>(null); // match selection modal
  // Tick every 60s so StreakCountdown components re-render with fresh times
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(iv);
  }, []);

  const loadBeats = useCallback(() => {
    setLoading(true);
    api.getBeats().then(res => {
      const raw = res.data || [];
      // Map API response format to our BeatMatch interface
      const mapped: BeatMatch[] = raw.map((b: any) => {
        const apiUser = b.user || b.matchedUser || {};
        const events = b.events || [];
        const sentEvents = events.filter((e: any) => e.userId);
        const photos = apiUser.photos || [];
        const photoUrl = photos[0]?.url || photos[0]?.imageUrl || undefined;
        let state = b.state || 'active';
        if (state === 'active') state = b.count >= 7 ? 'strong' : b.count >= 3 ? 'soft' : 'soft';
        // Use server-computed flags (reliable 24h window from lastUser1/lastUser2)
        const iSentToday = !!b.iSentToday;
        const theyCompletedToday = !!b.theyCompletedToday;
        const todayCompleted = !!b.todayCompleted || (iSentToday && theyCompletedToday);
        
        return {
          id: b.id,
          matchId: b.id,
          matchedUser: {
            id: apiUser.id || '',
            displayName: apiUser.displayName || apiUser.name || apiUser.username || 'User',
            photos: photoUrl ? [{ url: photoUrl }] : photos,
            online: apiUser.active || false,
            verified: apiUser.verified || false,
          },
          count: b.count || 0,
          state,
          todayCompleted,
          iSentToday,
          theyCompletedToday,
          streakDeadline: getStreakDeadline(),
          lastBeatAt: b.updatedAt || b.createdAt || undefined,
          longestStreak: b.count || 0,
          totalSent: sentEvents.length || 0,
          totalReceived: Math.max(0, events.length - sentEvents.length),
        };
      });
      const hasNames = mapped.some(b => b.matchedUser.displayName !== 'User' && b.matchedUser.displayName !== 'Unknown');
      setBeats(hasNames ? mapped : []);
      setLoading(false);
    }).catch(() => {
      setBeats([]);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadBeats(); }, [loadBeats]);

  // Stats
  const activeCount = beats.length;
  const totalSent = beats.reduce((s, b) => s + (b.totalSent || 0), 0);
  const totalReceived = beats.reduce((s, b) => s + (b.totalReceived || 0), 0);
  const longest = beats.reduce((max, b) => Math.max(max, b.longestStreak || b.count || 0), 0);
  const completedToday = beats.filter(b => b.todayCompleted).length;

  const handleSendBeat = async (beatId: string, type: string, content?: string) => {
    if (completing) return; // Prevent concurrent sends

    setCompleting(beatId);
    try {
      const res = await api.completeBeat(beatId, type, content || `Quick ${type} beat!`);
      const serverData = res.data || {};
      // Update local state using server response
      setBeats(prev => prev.map(b => {
        if (b.id !== beatId) return b;
        const newCount = serverData.count ?? b.count;
        const iSentToday = serverData.iSentToday ?? true;
        const theyCompletedToday = serverData.theyCompletedToday ?? b.theyCompletedToday;
        const todayCompleted = serverData.todayCompleted ?? (iSentToday && theyCompletedToday);
        if (serverData.countIncremented && MILESTONE_EMOJIS[newCount]) setCelebration(newCount);
        return {
          ...b,
          iSentToday,
          theyCompletedToday,
          todayCompleted,
          count: newCount,
          totalSent: (b.totalSent || 0) + 1,
          lastBeatAt: new Date().toISOString(),
          longestStreak: Math.max(b.longestStreak || 0, newCount),
        };
      }));
      // Refresh from server to stay in sync
      loadBeats();
    } catch (e) {
      // Fallback: optimistic update
      setBeats(prev => prev.map(b => {
        if (b.id !== beatId) return b;
        const shouldIncrement = b.theyCompletedToday && !b.iSentToday;
        const newCount = shouldIncrement ? (b.count || 0) + 1 : b.count;
        if (shouldIncrement && MILESTONE_EMOJIS[newCount]) setCelebration(newCount);
        return { ...b, iSentToday: true, todayCompleted: b.theyCompletedToday, count: newCount, totalSent: (b.totalSent || 0) + 1, lastBeatAt: new Date().toISOString() };
      }));
    }
    setCompleting(null);
  };

  const handleSelectMatch = (beat: BeatMatch) => {
    setSelectedBeat(beat);
    setBeatEntries([]);
    setChatFilter('all');
  };

  const handleDeleteEntry = (entryId: string) => {
    setBeatEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const handleToggleChat = (entryId: string) => {
    setBeatEntries(prev => prev.map(e => e.id === entryId ? { ...e, showInChat: !e.showInChat } : e));
  };

  const handleRemoveBeat = (beatId: string) => {
    setBeats(prev => prev.filter(b => b.id !== beatId));
    setConfirmAction(null);
    if (selectedBeat?.id === beatId) setSelectedBeat(null);
  };

  const handleBlockUser = (beatId: string) => {
    setBeats(prev => prev.filter(b => b.id !== beatId));
    setConfirmAction(null);
    if (selectedBeat?.id === beatId) setSelectedBeat(null);
  };

  if (loading) return <MiamoLoader text="Loading beats..." />;

  // ── MATCH BEATS CHAT VIEW ──
  if (selectedBeat) {
    return (
      <div className="max-w-3xl mx-auto h-full flex flex-col">
        <MatchBeatsChatView
          beat={selectedBeat}
          entries={beatEntries}
          onBack={() => setSelectedBeat(null)}
          onSendBeat={(type) => handleSendBeat(selectedBeat.id, type)}
          onDeleteEntry={handleDeleteEntry}
          onToggleChat={handleToggleChat}
          filter={chatFilter}
          setFilter={setChatFilter}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5 pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BeatsIcon size={28} animate className="drop-shadow-lg" />
          <div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight">Beats</h1>
            <p className="text-[11px] text-gray-400 font-medium">Daily connection streaks with your matches</p>
          </div>
        </div>
        <Badge variant="default" className="gap-1">
          <Flame className="w-3 h-3" /> {completedToday}/{activeCount} today
        </Badge>
      </div>

      {/* NUDGE BAR */}
      <NudgeBar beats={beats} />

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Beats" value={activeCount} color="from-pink-500 to-rose-500"
          icon={<BeatsIcon size={18} />} />
        <StatCard label="Longest Streak" value={longest} color="from-amber-400 to-orange-500"
          icon={<Trophy className="w-5 h-5 text-white" />} />
        <StatCard label="Total Sent" value={totalSent} color="from-sky-400 to-blue-500"
          icon={<ArrowUp className="w-5 h-5 text-white" />} clickable
          subtitle={activeView === 'sent' ? '\u2190 Back' : 'Tap to view \u2192'}
          onClick={() => setActiveView(activeView === 'sent' ? 'dashboard' : 'sent')} />
        <StatCard label="Total Received" value={totalReceived} color="from-emerald-400 to-green-500"
          icon={<ArrowDown className="w-5 h-5 text-white" />} clickable
          subtitle={activeView === 'received' ? '\u2190 Back' : 'Tap to view \u2192'}
          onClick={() => setActiveView(activeView === 'received' ? 'dashboard' : 'received')} />
      </div>

      {/* SENT / RECEIVED LIST (expandable) */}
      <AnimatePresence mode="wait">
        {activeView !== 'dashboard' && (
          <motion.div key={activeView} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4">
              <BeatListView beats={beats} direction={activeView} onSelectMatch={handleSelectMatch} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK BEAT ACTIONS */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-pink-500" /> Quick Beat Actions
          </h3>
          <span className="text-[10px] text-gray-400">Tap to choose who to send</span>
        </div>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {BEAT_TYPES.map(bt => (
            <BeatTypeButton key={bt.type} bt={bt} onClick={() => {
              if (beats.length === 0) return;
              if (beats.length === 1) {
                handleSendBeat(beats[0].id, bt.type);
              } else {
                setQuickBeatType(bt.type);
              }
            }} />
          ))}
        </div>
      </Card>

      {/* MATCH SELECTION MODAL for Quick Beat */}
      <AnimatePresence>
        {quickBeatType && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setQuickBeatType(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="card-premium p-6 max-w-sm mx-4 w-full max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  {(() => { const bt = BEAT_TYPES.find(b => b.type === quickBeatType); if (!bt) return null; const Icon = bt.icon; return <><Icon className={cn('w-5 h-5', bt.color)} /> Send {bt.label} Beat</>; })()}
                </h3>
                <button onClick={() => setQuickBeatType(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-3">Choose who to send this beat to:</p>
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {beats.map(beat => {
                  const other = beat.matchedUser || { id: '', displayName: 'Unknown', photos: [] };
                  const photo = other.photos?.[0]?.url || other.photos?.[0] || undefined;
                  return (
                    <motion.button
                      key={beat.id}
                      whileHover={{ x: 3 }}
                      onClick={() => { handleSendBeat(beat.id, quickBeatType!); setQuickBeatType(null); }}
                      disabled={completing === beat.id}
                      className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-pink-50/40 transition-all text-left"
                    >
                      <div className="relative">
                        <Avatar src={photo} name={other.displayName} size="sm" online={other.online} verified={other.verified} />
                        <div className="absolute -bottom-1 -right-1">
                          <StreakFlame count={beat.count} size="sm" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 truncate">{other.displayName}</p>
                        <p className="text-[11px] text-gray-400">{beat.count} day streak</p>
                      </div>
                      {beat.iSentToday ? (
                        <Badge variant="default" className="text-[10px] gap-1 bg-blue-50 text-blue-600 border-blue-100">
                          <Check className="w-3 h-3" /> Sent
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px] gap-1 bg-pink-50 text-pink-600 border-pink-100">
                          <Send className="w-3 h-3" /> Send
                        </Badge>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ICE BREAKER TOGGLE */}
      <motion.button
        onClick={() => setShowIceBreakers(!showIceBreakers)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/60 border border-amber-100/50 hover:border-amber-200 transition-all"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-[12px] font-bold text-amber-700">Ice Breakers — Don&apos;t know what to say?</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-amber-400 transition-transform', showIceBreakers && 'rotate-180')} />
      </motion.button>
      <AnimatePresence>
        {showIceBreakers && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <IceBreakerPanel onSend={(text) => {
              if (beats.length === 0) return;
              if (beats.length === 1) {
                handleSendBeat(beats[0].id, 'text', text);
              } else {
                // For ice breakers, send as text type with the modal
                setQuickBeatType('text');
              }
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* YOUR MATCHES WITH BEATS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500" /> Your Beat Matches
          </h3>
          <span className="text-[10px] text-gray-400">{beats.length} active</span>
        </div>

        {beats.length === 0 ? (
          <EmptyState
            icon={<BeatsIcon size={32} />}
            title="No Beats Yet"
            description="Match with someone and start a daily streak! Send photos, voice notes, videos — keep the connection alive."
            action={<Button onClick={() => window.location.href = '/discover'}>Find Matches</Button>}
          />
        ) : (
          <div className="space-y-2">
            {beats.map((beat, i) => {
              const other = beat.matchedUser || { id: '', displayName: 'Unknown', photos: [], online: false, verified: false };
              const photo = other.photos?.[0]?.url || other.photos?.[0] || undefined;
              const state = BEAT_STATES[beat.state as keyof typeof BEAT_STATES] || BEAT_STATES.soft;
              const isUrgent = beat.state === 'critical' || beat.state === 'weak';
              const milestone = Object.entries(MILESTONE_EMOJIS).reverse().find(([k]) => beat.count >= Number(k));

              return (
                <motion.div key={beat.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                >
                  <Card hover className={cn('p-4', isUrgent && 'border-amber-400/30 shadow-[0_0_16px_rgba(245,158,11,0.06)]')}>
                    <div className="flex items-center gap-3">
                      {/* Avatar + streak badge */}
                      <button onClick={() => handleSelectMatch(beat)} className="relative shrink-0">
                        <Avatar src={photo} name={other.displayName} size="md" online={other.online} verified={other.verified} />
                        <div className="absolute -bottom-1 -right-1">
                          <StreakFlame count={beat.count} size="sm" />
                        </div>
                      </button>

                      {/* Info */}
                      <button onClick={() => handleSelectMatch(beat)} className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-bold text-gray-800 truncate">{other.displayName}</h3>
                          <Badge variant={beat.state === 'strong' ? 'success' : beat.state === 'critical' ? 'danger' : beat.state === 'weak' ? 'warning' : 'default'}>
                            {state.label}
                          </Badge>
                          {milestone && <span className="text-xs">{milestone[1].emoji}</span>}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {beat.count} day streak &bull; Best: {beat.longestStreak || beat.count} &bull; {beat.lastBeatAt ? formatRelativeTime(beat.lastBeatAt) : 'Start now'}
                        </p>
                        {/* Day Status — who sent, who hasn't */}
                        <BeatDayStatus beat={beat} />
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <ArrowUp className="w-2.5 h-2.5 text-pink-400" /> {beat.totalSent || 0} sent
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <ArrowDown className="w-2.5 h-2.5 text-emerald-400" /> {beat.totalReceived || 0} received
                          </span>
                          {/* Countdown timer */}
                          <StreakCountdown deadline={beat.streakDeadline} />
                        </div>
                      </button>

                      {/* Actions — 3 states: Done (both sent), Sent (I sent, waiting), Beat (not sent) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {beat.todayCompleted ? (
                          <Button size="sm" variant="secondary"
                            disabled={completing === beat.id}
                            onClick={() => handleSendBeat(beat.id, 'text')}
                            className="text-[11px] gap-1 bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                          >
                            <Check className="w-3 h-3" /> {completing === beat.id ? '…' : 'Done ✓'}
                          </Button>
                        ) : beat.iSentToday ? (
                          <Button size="sm" variant="secondary"
                            disabled={completing === beat.id}
                            onClick={() => handleSendBeat(beat.id, 'text')}
                            className="text-[11px] gap-1 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                          >
                            <Check className="w-3 h-3" /> {completing === beat.id ? '…' : 'Sent +'}
                          </Button>
                        ) : (
                          <Button size="sm" variant={isUrgent ? 'default' : 'secondary'}
                            disabled={completing === beat.id}
                            onClick={() => handleSendBeat(beat.id, 'text')}
                            className="text-[11px] gap-1"
                          >
                            <BeatsIcon size={14} /> {completing === beat.id ? '\u2026' : 'Beat'}
                          </Button>
                        )}
                        <BeatMenu
                          onRemove={() => setConfirmAction({ type: 'remove', beatId: beat.id })}
                          onBlock={() => setConfirmAction({ type: 'block', beatId: beat.id })}
                          onReport={() => {}}
                          onMute={() => {}}
                        />
                      </div>
                    </div>

                    {/* Urgent / weak streak warnings */}
                    {beat.state === 'critical' && !beat.todayCompleted && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mt-3 flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-[11px] text-red-500 font-medium">Streak expires soon! {beat.iSentToday ? `Waiting for ${other.displayName}...` : 'Send a beat now!'}</span>
                      </motion.div>
                    )}
                    {beat.state === 'weak' && !beat.todayCompleted && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mt-3 flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[11px] text-amber-600 font-medium">{beat.iSentToday ? `You sent — waiting for ${other.displayName}` : 'Your turn! Don\'t let it fade!'}</span>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* HOW BEATS WORK */}
      <Card className="p-5 border-pink-200/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center shrink-0 shadow-sm">
            <BeatsIcon size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-1.5">How Beats Work</h4>
            <div className="space-y-2 text-[12px] text-gray-500 leading-relaxed">
              <p><strong>Send daily beats</strong> — photos, videos, voice notes, or messages to keep your streak alive.</p>
              <p><strong>Build your streak</strong> — both of you must send at least one beat per day. The counter grows daily!</p>
              <p><strong>Don&apos;t get ghosted</strong> — Beats remind both of you to stay connected. No more awkward silence.</p>
              <p><strong>Earn milestones</strong> — Hit 7, 30, 100, 365, 730, 1095, 1460, 1825 days for special badges and celebrations up to 5 years!</p>
              <p><strong>Ice breakers</strong> — Stuck? Use our conversation starters to keep things flowing naturally.</p>
              <p><strong>Show in chat</strong> — Choose which beats appear in your regular messages. Private by default.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* MILESTONE LEADERBOARD */}
      {beats.some(b => b.count >= 3) && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-500" /> Streak Milestones
          </h3>
          <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {Object.entries(MILESTONE_EMOJIS).map(([days, data]) => {
              const achieved = beats.some(b => b.count >= Number(days));
              return (
                <div key={days} className={cn('flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[60px] transition-all',
                  achieved ? 'bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-100' : 'bg-gray-50 opacity-40'
                )}>
                  <span className="text-lg">{data.emoji}</span>
                  <span className={cn('text-[9px] font-bold', achieved ? data.color : 'text-gray-400')}>{days}d</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CONFIRMATION POPUPS */}
      <AnimatePresence>
        {confirmAction?.type === 'remove' && (
          <ConfirmPopup
            title="Remove from Beats?"
            message="Are you sure you want to remove this person from Beats? Your streak will be permanently lost and cannot be recovered."
            confirmText="Yes, Remove"
            danger
            onConfirm={() => handleRemoveBeat(confirmAction.beatId)}
            onCancel={() => setConfirmAction(null)}
          />
        )}
        {confirmAction?.type === 'block' && (
          <ConfirmPopup
            title="Block User?"
            message="Blocking will remove them from your Beats, matches, and messages. They won't be able to contact you. This action cannot be undone."
            confirmText="Block"
            danger
            onConfirm={() => handleBlockUser(confirmAction.beatId)}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>

      {/* MILESTONE CELEBRATION */}
      <AnimatePresence>
        {celebration && (
          <MilestoneCelebration count={celebration} onClose={() => setCelebration(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
