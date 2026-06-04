'use client';

import React, { useState, useEffect, useId, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Hourglass, CheckCheck, Clock, Zap, AlertTriangle,
 MoreVertical, UserMinus, Volume2, Flag, Ban,
 ArrowUp, ArrowDown, ChevronRight, Lightbulb, Send, Activity, Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Card } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { BeatMatch, BEAT_TYPES, ICE_BREAKERS, MILESTONE_EMOJIS } from './constants';
import { Portal } from '@/components/ui/portal';

/* ═══════════════════════════════════════════════════════════
 BEATS ICON — UNIQUE ANIMATED HEARTBEAT PULSE
 ═══════════════════════════════════════════════════════════ */
export function BeatsIcon({ size = 24, className, animate = false }: { size?: number; className?: string; animate?: boolean }) {
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
 <stop offset="0%" stopColor="#C97856" />
 <stop offset="50%" stopColor="#B8694A" />
 <stop offset="100%" stopColor="#B8694A" />
 </linearGradient>
 <linearGradient id={`s${id}`} x1="3" y1="6" x2="29" y2="28" gradientUnits="userSpaceOnUse">
 <stop offset="0%" stopColor="#D4896A" />
 <stop offset="100%" stopColor="#8B4513" />
 </linearGradient>
 </defs>
 </motion.svg>
 );
}

/* ═══════════════════════════════════════════════════════════
 STREAK FLAME BADGE
 ═══════════════════════════════════════════════════════════ */
export function StreakFlame({ count, size = 'md' }: { count: number; size?: 'sm' | 'md' | 'lg' }) {
 const sizeMap = { sm: 'w-7 h-7 text-[9px]', md: 'w-9 h-9 text-[11px]', lg: 'w-12 h-12 text-sm' };
 const color = count >= 30 ? 'from-rose-alt to-rose-main' : count >= 14 ? 'from-rose to-rose-dark' : count >= 7 ? 'from-rose-main to-rose-main' : 'from-miamo-elevated to-border-light';
 return (
 <motion.div
 animate={count >= 7 ? { scale: [1, 1.1, 1] } : undefined}
 transition={count >= 7 ? { duration: 2, repeat: Infinity } : undefined}
 className={cn('relative rounded-full bg-gradient-to-br flex items-center justify-center font-black text-text-primary shadow-lg', sizeMap[size], color)}
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
export function StreakCountdown({ deadline }: { deadline: string }) {
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
 urgent ? 'bg-rose-soft text-rose-main border border-rose-light' :
 'bg-miamo-surface text-text-muted border border-border'
 )}
 >
 <Hourglass className={cn('w-3 h-3', critical ? 'text-red-500' : urgent ? 'text-rose-main' : 'text-text-muted')} />
 {h > 0 ? `${h}h ${m}m` : `${m}m`}
 </motion.div>
 );
}

/* ═══════════════════════════════════════════════════════════
 BEAT STATUS — shows who still needs to send
 ═══════════════════════════════════════════════════════════ */
export function BeatDayStatus({ beat }: { beat: BeatMatch }) {
 const { iSentToday, theyCompletedToday, todayCompleted } = beat;
 const name = beat.matchedUser?.displayName?.split(' ')[0] || 'They';

 if (todayCompleted) {
 return (
 <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-main bg-rose-soft px-2.5 py-1 rounded-lg border border-rose-soft">
 <CheckCheck className="w-3 h-3" /> Both sent — streak saved!
 </div>
 );
 }
 if (iSentToday && !theyCompletedToday) {
 return (
 <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-main bg-rose-soft px-2.5 py-1 rounded-lg border border-rose-soft">
 <Clock className="w-3 h-3" /> You sent — waiting for {name}
 </div>
 );
 }
 if (!iSentToday && theyCompletedToday) {
 return (
 <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}
 className="flex items-center gap-1.5 text-[10px] font-semibold text-rose bg-miamo-surface px-2.5 py-1 rounded-lg border border-border">
 <Zap className="w-3 h-3" /> {name} sent — your turn!
 </motion.div>
 );
 }
 // Neither sent
 return (
 <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}
 className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-main bg-rose-soft px-2.5 py-1 rounded-lg border border-rose-light">
 <AlertTriangle className="w-3 h-3" /> No one sent yet!
 </motion.div>
 );
}

/* ═══════════════════════════════════════════════════════════
 MILESTONE CELEBRATION POPUP
 ═══════════════════════════════════════════════════════════ */
export function MilestoneCelebration({ count, onClose }: { count: number; onClose: () => void }) {
 const milestone = Object.entries(MILESTONE_EMOJIS).reverse().find(([k]) => count >= Number(k));
 if (!milestone) return null;
 const [, data] = milestone;
 return (
 <Portal>
 <motion.div
 initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}
 >
 <motion.div
 initial={{ y: 50 }} animate={{ y: 0 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}
 className="card-premium p-8 text-center max-w-sm mx-4 relative overflow-hidden"
 >
 <div className="absolute inset-0 bg-gradient-to-br from-rose-main/10 to-rose-soft/50" />
 <div className="relative z-10">
 <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: 2 }}
 className="text-6xl mb-4">{data.emoji}</motion.div>
 <h2 className={cn('text-2xl font-black mb-2', data.color)}>{data.label}</h2>
 <p className="text-text-muted text-sm mb-1">{count} day streak achieved!</p>
 <p className="text-xs text-text-muted mb-6">You&apos;re building something special. Keep the connection alive!</p>
 <Button onClick={onClose} size="lg" className="shimmer-glass">Amazing!</Button>
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 );
}

/* ═══════════════════════════════════════════════════════════
 CONFIRMATION POPUP
 ═══════════════════════════════════════════════════════════ */
export function ConfirmPopup({ title, message, confirmText, danger, onConfirm, onCancel }: {
 title: string; message: string; confirmText: string; danger?: boolean;
 onConfirm: () => void; onCancel: () => void;
}) {
 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}
 >
 <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e: React.MouseEvent) => e.stopPropagation()}
 className="card-premium p-6 max-w-sm mx-4"
 >
 <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
 <p className="text-sm text-text-muted mb-6">{message}</p>
 <div className="flex gap-3">
 <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
 <Button variant={danger ? 'danger' : 'default'} className="flex-1" onClick={onConfirm}>{confirmText}</Button>
 </div>
 </motion.div>
 </motion.div>
 </Portal>
 );
}

/* ═══════════════════════════════════════════════════════════
 THREE-DOT MENU
 ═══════════════════════════════════════════════════════════ */
export function BeatMenu({ onRemove, onBlock, onReport, onMute }: {
 onRemove: () => void; onBlock: () => void; onReport: () => void; onMute: () => void;
}) {
 const [open, setOpen] = useState(false);
 const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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

 const handleOpen = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (open) { setOpen(false); return; }
 const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
 const MENU_W = 208; // w-52
 const MENU_H = 200; // 4 items × ~42 + padding
 const spaceBelow = window.innerHeight - rect.bottom;
 const y = spaceBelow >= MENU_H + 8 ? rect.bottom + 4 : Math.max(8, rect.top - MENU_H - 4);
 const x = Math.max(8, Math.min(rect.right - MENU_W, window.innerWidth - MENU_W - 8));
 setPos({ x, y });
 setOpen(true);
 };

 return (
 <div className="relative" ref={ref}>
 <button onClick={handleOpen}
 className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-miamo-surface transition-all">
 <MoreVertical className="w-4 h-4" />
 </button>
 <AnimatePresence>
 {open && (
 <Portal>
 <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
 <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
 style={{ position: 'fixed', top: pos.y, left: pos.x }}
 className="w-52 bg-miamo-card rounded-xl shadow-2xl border border-border z-50 py-1 overflow-visible"
 >
 {items.map(item => {
 const ItemIcon = item.icon;
 return (
 <button key={item.label} onClick={(e) => { e.stopPropagation(); setOpen(false); item.action(); }}
 className={cn('flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] font-medium transition-colors',
 item.danger ? 'text-red-500 hover:bg-red-50' : 'text-text-secondary hover:bg-miamo-surface'
 )}>
 <ItemIcon className="w-4 h-4" /> {item.label}
 </button>
 );
 })}
 </motion.div>
 </Portal>
 )}
 </AnimatePresence>
 </div>
 );
}

/* ═══════════════════════════════════════════════════════════
 SENT / RECEIVED LIST VIEW
 ═══════════════════════════════════════════════════════════ */
export function BeatListView({ beats, direction, onSelectMatch }: {
 beats: BeatMatch[]; direction: 'sent' | 'received' | 'active' | 'longest'; onSelectMatch: (b: BeatMatch) => void;
}) {
 const total = useMemo(() => {
 if (direction === 'sent') return beats.reduce((s, b) => s + (b.totalSent || 0), 0);
 if (direction === 'received') return beats.reduce((s, b) => s + (b.totalReceived || 0), 0);
 if (direction === 'active') return beats.filter(b => b.state !== 'expired').length;
 return beats.reduce((m, b) => Math.max(m, b.count || 0), 0);
 }, [beats, direction]);
 const filteredBeats = useMemo(() => {
 if (direction === 'sent') return beats.filter(b => (b.totalSent || 0) > 0).sort((a, b) => (b.totalSent || 0) - (a.totalSent || 0));
 if (direction === 'received') return beats.filter(b => (b.totalReceived || 0) > 0).sort((a, b) => (b.totalReceived || 0) - (a.totalReceived || 0));
 if (direction === 'active') return beats.filter(b => b.state !== 'expired').sort((a, b) => (b.count || 0) - (a.count || 0));
 return [...beats].sort((a, b) => (b.count || 0) - (a.count || 0));
 }, [beats, direction]);
 const headingLabel = direction === 'sent' ? 'Total Sent'
 : direction === 'received' ? 'Total Received'
 : direction === 'active' ? 'Active Beats'
 : 'Longest Streak';
 const HeadingIcon = direction === 'sent' ? ArrowUp
 : direction === 'received' ? ArrowDown
 : direction === 'active' ? Zap
 : Trophy;

 return (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-text-secondary flex items-center gap-2">
 <HeadingIcon className="w-4 h-4 text-rose" />
 {headingLabel}: <span className="text-rose">{total}</span>
 </h3>
 </div>
 <div className="space-y-2">
 {filteredBeats.map(beat => {
 const other = beat.matchedUser || { id: '', displayName: 'Unknown', photos: [], online: false, verified: false };
 const photo = other.photos?.[0]?.url || other.photos?.[0] || undefined;
 const count = direction === 'sent' ? (beat.totalSent || 0)
 : direction === 'received' ? (beat.totalReceived || 0)
 : (beat.count || 0);
 const sublabel = direction === 'sent' ? `${count} sent`
 : direction === 'received' ? `${count} received`
 : direction === 'active' ? `${count} day streak`
 : `${count} day streak`;
 return (
 <motion.button key={beat.id} whileHover={{ x: 3 }} onClick={() => onSelectMatch(beat)}
 className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-miamo-surface/40 transition-all text-left"
 >
 <Avatar src={photo} name={other.displayName} size="sm" online={other.online} verified={other.verified} />
 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-semibold text-text-primary truncate">{other.displayName}</p>
 <p className="text-[11px] text-text-muted">{sublabel} &bull; Last: {beat.lastBeatAt ? formatRelativeTime(beat.lastBeatAt) : 'Never'}</p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-text-secondary">{count}</span>
 <ChevronRight className="w-4 h-4 text-text-secondary" />
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
export function IceBreakerPanel({ onSend }: { onSend: (text: string) => void }) {
 const [activeCategory, setActiveCategory] = useState(0);
 const category = ICE_BREAKERS[activeCategory];

 return (
 <Card className="p-4 border-rose-light/30">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-soft to-rose-soft flex items-center justify-center">
 <Lightbulb className="w-4 h-4 text-rose-main" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-text-primary">Ice Breakers</h3>
 <p className="text-[10px] text-text-muted">Don&apos;t know what to say? Try these!</p>
 </div>
 </div>
 <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
 {ICE_BREAKERS.map((cat, i) => {
 const CatIcon = cat.icon;
 return (
 <button key={cat.category} onClick={() => setActiveCategory(i)}
 className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all',
 activeCategory === i ? 'bg-rose-soft text-rose-dark border border-rose-light' : 'text-text-muted hover:text-text-secondary hover:bg-miamo-surface'
 )}>
 <CatIcon className="w-3 h-3" /> {cat.category}
 </button>
 );
 })}
 </div>
 <div className="space-y-1.5">
 {category.prompts.map((prompt, i) => (
 <motion.button key={i} whileHover={{ x: 4 }} onClick={() => onSend(prompt)}
 className="flex items-center gap-2 w-full text-left p-2.5 rounded-lg hover:bg-rose-soft/50 transition-all group"
 >
 <span className="text-[12px] text-text-secondary leading-relaxed flex-1">{prompt}</span>
 <Send className="w-3.5 h-3.5 text-text-secondary group-hover:text-rose transition-colors shrink-0" />
 </motion.button>
 ))}
 </div>
 </Card>
 );
}

/* ═══════════════════════════════════════════════════════════
 NUDGE SYSTEM
 ═══════════════════════════════════════════════════════════ */
export function NudgeBar({ beats }: { beats: BeatMatch[] }) {
 const needsAttention = useMemo(() => beats.filter(b => !b.todayCompleted && (b.state === 'weak' || b.state === 'critical')), [beats]);
 const ghosted = useMemo(() => beats.filter(b => b.lastBeatAt && Date.now() - new Date(b.lastBeatAt).getTime() > 48 * 3600000), [beats]);

 if (needsAttention.length === 0 && ghosted.length === 0) return null;

 return (
 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
 className="card-premium p-4 border-rose-light/40 bg-gradient-to-r from-rose-soft/60 to-rose-soft/40"
 >
 <div className="flex items-center gap-2 mb-2">
 <Activity className="w-4 h-4 text-rose-main" />
 <span className="text-xs font-bold text-rose-dark">Attention Needed</span>
 </div>
 {needsAttention.length > 0 && (
 <p className="text-[11px] text-rose-main mb-1">
 {needsAttention.length} streak{needsAttention.length > 1 ? 's' : ''} fading — send a beat to keep {needsAttention.length > 1 ? 'them' : 'it'} alive!
 </p>
 )}
 {ghosted.length > 0 && (
 <p className="text-[11px] text-rose-main">
 {ghosted.length} match{ghosted.length > 1 ? 'es' : ''} haven&apos;t responded in 48h — try an ice breaker?
 </p>
 )}
 </motion.div>
 );
}

/* ═══════════════════════════════════════════════════════════
 STAT CARD
 ═══════════════════════════════════════════════════════════ */
export function StatCard({ label, value, color, icon, clickable, subtitle, onClick }: {
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
 <p className="text-2xl font-black text-text-primary">{value}</p>
 <p className="text-[10px] text-text-muted font-medium mt-0.5">{label}</p>
 {subtitle && (
 <p className="text-[9px] text-rose-light font-semibold mt-1">{subtitle}</p>
 )}
 </motion.div>
 );
}

/* ═══════════════════════════════════════════════════════════
 BEAT TYPE BUTTON
 ═══════════════════════════════════════════════════════════ */
export function BeatTypeButton({ bt, onClick }: { bt: typeof BEAT_TYPES[number]; onClick: () => void }) {
 const Icon = bt.icon;
 return (
 <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.93 }} onClick={onClick}
 className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-b from-white to-miamo-card/50 border border-border/60 hover:border-border/60 hover:shadow-sm transition-all"
 >
 <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bt.bg)}>
 <Icon className={cn('w-4 h-4', bt.color)} />
 </div>
 <span className="text-[10px] font-semibold text-text-muted">{bt.label}</span>
 </motion.button>
 );
}
