'use client';

import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Zap, Clock, Trophy, Flame, AlertTriangle, Send,
 ChevronDown, ArrowUp, ArrowDown, Users, Crown,
 Check, CheckCheck, Lightbulb, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import { BeatsSkeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { api } from '@/lib/api';
import { BEAT_STATES } from '@/lib/constants';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';

import { BeatMatch, BeatEntry, BEAT_TYPES, MILESTONE_EMOJIS, getStreakDeadline } from './components/constants';
import {
 BeatsIcon, StreakFlame, StreakCountdown, BeatDayStatus,
 MilestoneCelebration, ConfirmPopup, BeatMenu, BeatListView,
 IceBreakerPanel, NudgeBar, StatCard, BeatTypeButton,
} from './components/BeatWidgets';
import { MatchBeatsChatView } from './components/MatchBeatsChatView';

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
 if (process.env.NODE_ENV === 'development') console.warn('[BeatsErrorBoundary]', error, info?.componentStack);
 }
 render() {
 if (this.state.hasError) {
 return (
 <div className="max-w-3xl mx-auto p-6 text-center py-20">
 <Zap className="w-10 h-10 text-rose-light mx-auto mb-4" />
 <h2 className="text-lg font-bold text-text-primary mb-2">Something went wrong</h2>
 <p className="text-sm text-text-muted mb-4">The Beats page encountered an error. Please try refreshing.</p>
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
 MAIN BEATS PAGE
 ═══════════════════════════════════════════════════════════ */
export default function BeatsPage() {
 return (
 <ErrorBoundary>
 <BeatsPageInner />
 </ErrorBoundary>
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
 const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'block' | 'delete' | 'report'; beatId: string; entryId?: string } | null>(null);
 const [celebration, setCelebration] = useState<number | null>(null);
 const [completing, setCompleting] = useState<string | null>(null);
 const [quickBeatType, setQuickBeatType] = useState<string | null>(null); // match selection modal
 const [pendingBeatType, setPendingBeatType] = useState<string | null>(null); // pre-fill chat view type
 const [pendingIceBreaker, setPendingIceBreaker] = useState<string | null>(null); // pre-fill ice breaker text

 useTrackPageView('beats');
 useTrackScrollDepth('beats');

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
 _events: events, // carry raw events for chat view
 } as any;
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
 const { totalSent, totalReceived, longest, completedToday } = useMemo(() => ({
 totalSent: beats.reduce((s, b) => s + (b.totalSent || 0), 0),
 totalReceived: beats.reduce((s, b) => s + (b.totalReceived || 0), 0),
 longest: beats.reduce((max, b) => Math.max(max, b.longestStreak || b.count || 0), 0),
 completedToday: beats.filter(b => b.todayCompleted).length,
 }), [beats]);

 const handleSendBeat = async (beatId: string, type: string, content?: string) => {
 if (completing) return; // Prevent concurrent sends
 // Check if already sent today
 const beat = beats.find(b => b.id === beatId);
 if (beat?.iSentToday) return; // Already sent today

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
 // Also update selectedBeat if we're in chat view
 if (selectedBeat?.id === beatId) {
 setSelectedBeat(prev => prev ? { ...prev, iSentToday: true, todayCompleted: serverData.todayCompleted ?? prev.theyCompletedToday, count: serverData.count ?? prev.count, totalSent: (prev.totalSent || 0) + 1 } : prev);
 // Add the new entry to beatEntries
 setBeatEntries(prev => [...prev, {
 id: `new-${Date.now()}`,
 type,
 content: content || `Quick ${type} beat!`,
 sender: 'me',
 sentAt: new Date().toISOString(),
 seen: false,
 showInChat: false,
 }]);
 }
 // Refresh from server to stay in sync
 loadBeats();
 } catch (e: any) {
 // If "already sent today" error, mark iSentToday
 if (e?.data?.iSentToday || e?.message?.includes('already sent')) {
 setBeats(prev => prev.map(b => b.id !== beatId ? b : { ...b, iSentToday: true }));
 if (selectedBeat?.id === beatId) setSelectedBeat(prev => prev ? { ...prev, iSentToday: true } : prev);
 }
 }
 setCompleting(null);
 };

 const handleSelectMatch = useCallback((beat: BeatMatch, beatType?: string | null, iceText?: string | null) => {
 setSelectedBeat(beat);
 if (beatType) setPendingBeatType(beatType);
 if (iceText) setPendingIceBreaker(iceText);
 // Load beat entries from stored events
 const rawBeat = (beats as any).find((b: any) => b.id === beat.id);
 const events = rawBeat?._events || [];
 const entries: BeatEntry[] = events.map((e: any) => ({
 id: e.id,
 beatId: beat.id,
 type: (e.type || 'text') as any,
 content: e.content || '',
 sender: e.userId === beat.matchedUser.id ? 'them' as const : 'me' as const,
 sentAt: e.createdAt || new Date().toISOString(),
 seen: true,
 showInChat: false,
 }));
 setBeatEntries(entries);
 setChatFilter('all');
 }, [beats]);

 const handleDeleteEntry = useCallback((entryId: string) => {
 setBeatEntries(prev => prev.filter(e => e.id !== entryId));
 }, []);

 const handleToggleChat = useCallback((entryId: string) => {
 setBeatEntries(prev => prev.map(e => e.id === entryId ? { ...e, showInChat: !e.showInChat } : e));
 }, []);

 const handleRemoveBeat = useCallback(async (beatId: string) => {
 try { await api.archiveBeat(beatId); } catch {}
 setBeats(prev => prev.filter(b => b.id !== beatId));
 setConfirmAction(null);
 if (selectedBeat?.id === beatId) setSelectedBeat(null);
 }, [selectedBeat?.id]);

 const handleBlockUser = useCallback(async (beatId: string) => {
 const beat = beats.find(b => b.id === beatId);
 if (beat?.matchedUser?.id) { try { await api.blockUser(beat.matchedUser.id); } catch {} }
 setBeats(prev => prev.filter(b => b.id !== beatId));
 setConfirmAction(null);
 if (selectedBeat?.id === beatId) setSelectedBeat(null);
 }, [beats, selectedBeat?.id]);

 if (loading) return <BeatsSkeleton />;

 // ── MATCH BEATS CHAT VIEW ──
 if (selectedBeat) {
 return (
 <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
 <MatchBeatsChatView
 beat={selectedBeat}
 entries={beatEntries}
 onBack={() => { setSelectedBeat(null); setPendingBeatType(null); setPendingIceBreaker(null); }}
 onSendBeat={(type, content) => handleSendBeat(selectedBeat.id, type, content)}
 onDeleteEntry={handleDeleteEntry}
 onToggleChat={handleToggleChat}
 filter={chatFilter}
 setFilter={setChatFilter}
 sending={completing === selectedBeat.id}
 initialType={pendingBeatType}
 initialText={pendingIceBreaker}
 />
 </div>
 );
 }

 return (
 <div style={{ height: '100%', overflow: 'auto' }}>
 <div className="max-w-3xl mx-auto p-6 space-y-5 pb-24">
 {/* HEADER */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <BeatsIcon size={28} animate className="drop-shadow-lg" />
 <div>
 <h1 className="text-xl font-black text-text-primary tracking-tight">Beats</h1>
 <p className="text-[11px] text-text-muted font-medium">Daily connection streaks with your matches</p>
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
 <StatCard label="Active Beats" value={activeCount} color="from-rose to-rose-dark"
 icon={<BeatsIcon size={18} />} />
 <StatCard label="Longest Streak" value={longest} color="from-rose-alt to-rose-main"
 icon={<Trophy className="w-5 h-5 text-text-primary" />} />
 <StatCard label="Total Sent" value={totalSent} color="from-rose-alt to-rose-main"
 icon={<ArrowUp className="w-5 h-5 text-text-primary" />} clickable
 subtitle={activeView === 'sent' ? '\u2190 Back' : 'Tap to view \u2192'}
 onClick={() => setActiveView(activeView === 'sent' ? 'dashboard' : 'sent')} />
 <StatCard label="Total Received" value={totalReceived} color="from-rose-alt to-rose-main"
 icon={<ArrowDown className="w-5 h-5 text-text-primary" />} clickable
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
 <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
 <Zap className="w-4 h-4 text-rose" /> Quick Beat Actions
 </h3>
 <span className="text-[10px] text-text-muted">Tap to choose who to send</span>
 </div>
 <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
 {BEAT_TYPES.map(bt => (
 <BeatTypeButton key={bt.type} bt={bt} onClick={() => {
 if (beats.length === 0) return;
 if (beats.length === 1) {
 handleSelectMatch(beats[0], bt.type);
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
 <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
 {(() => { const bt = BEAT_TYPES.find(b => b.type === quickBeatType); if (!bt) return null; const Icon = bt.icon; return <><Icon className={cn('w-5 h-5', bt.color)} /> Send {bt.label} Beat</>; })()}
 </h3>
 <button onClick={() => setQuickBeatType(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-miamo-surface">
 <X className="w-4 h-4" />
 </button>
 </div>
 <p className="text-xs text-text-muted mb-3">Choose who to send this beat to:</p>
 <div className="flex-1 overflow-y-auto space-y-1.5">
 {beats.map(beat => {
 const other = beat.matchedUser || { id: '', displayName: 'Unknown', photos: [] };
 const photo = other.photos?.[0]?.url || other.photos?.[0] || undefined;
 return (
 <motion.button
 key={beat.id}
 whileHover={{ x: 3 }}
 onClick={() => { handleSelectMatch(beat, quickBeatType); setQuickBeatType(null); }}
 disabled={beat.iSentToday}
 className={cn("flex items-center gap-3 w-full p-3 rounded-xl hover:bg-miamo-surface/40 transition-all text-left", beat.iSentToday && "opacity-50")}
 >
 <div className="relative">
 <Avatar src={photo} name={other.displayName} size="sm" online={other.online} verified={other.verified} />
 <div className="absolute -bottom-1 -right-1">
 <StreakFlame count={beat.count} size="sm" />
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-[13px] font-semibold text-text-primary truncate">{other.displayName}</p>
 <p className="text-[11px] text-text-muted">{beat.count} day streak</p>
 </div>
 {beat.iSentToday ? (
 <Badge variant="default" className="text-[10px] gap-1 bg-rose-soft text-rose-main border-rose-soft">
 <Check className="w-3 h-3" /> Sent
 </Badge>
 ) : (
 <Badge variant="default" className="text-[10px] gap-1 bg-miamo-surface text-rose border-border">
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
 className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-soft/80 to-rose-soft/60 border border-rose-soft/50 hover:border-rose-light transition-all"
 >
 <div className="flex items-center gap-2">
 <Lightbulb className="w-4 h-4 text-rose-main" />
 <span className="text-[12px] font-bold text-rose-dark">Ice Breakers — Don&apos;t know what to say?</span>
 </div>
 <ChevronDown className={cn('w-4 h-4 text-rose-alt transition-transform', showIceBreakers && 'rotate-180')} />
 </motion.button>
 <AnimatePresence>
 {showIceBreakers && (
 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
 <IceBreakerPanel onSend={(text) => {
 if (beats.length === 0) return;
 if (beats.length === 1) {
 handleSelectMatch(beats[0], 'text', text);
 } else {
 setPendingIceBreaker(text);
 setQuickBeatType('text');
 }
 }} />
 </motion.div>
 )}
 </AnimatePresence>

 {/* YOUR MATCHES WITH BEATS */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
 <Users className="w-4 h-4 text-rose" /> Your Beat Matches
 </h3>
 <span className="text-[10px] text-text-muted">{beats.length} active</span>
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
 <Card hover className={cn('p-4', isUrgent && 'border-rose-alt/30 shadow-[0_0_16px_rgba(245,158,11,0.06)]')}>
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
 <h3 className="text-[13px] font-bold text-text-primary truncate">{other.displayName}</h3>
 <Badge variant={beat.state === 'strong' ? 'success' : beat.state === 'critical' ? 'danger' : beat.state === 'weak' ? 'warning' : 'default'}>
 {state.label}
 </Badge>
 {milestone && <span className="text-xs">{milestone[1].emoji}</span>}
 </div>
 <p className="text-[11px] text-text-muted mt-0.5">
 {beat.count} day streak &bull; Best: {beat.longestStreak || beat.count} &bull; {beat.lastBeatAt ? formatRelativeTime(beat.lastBeatAt) : 'Start now'}
 </p>
 {/* Day Status — who sent, who hasn't */}
 <BeatDayStatus beat={beat} />
 <div className="flex items-center gap-3 mt-1">
 <span className="text-[10px] text-text-muted flex items-center gap-0.5">
 <ArrowUp className="w-2.5 h-2.5 text-rose-light" /> {beat.totalSent || 0} sent
 </span>
 <span className="text-[10px] text-text-muted flex items-center gap-0.5">
 <ArrowDown className="w-2.5 h-2.5 text-rose-alt" /> {beat.totalReceived || 0} received
 </span>
 {/* Countdown timer */}
 <StreakCountdown deadline={beat.streakDeadline} />
 </div>
 </button>

 {/* Actions — 2 states: Done (both sent), Waiting (I sent), Beat (not sent) */}
 <div className="flex items-center gap-1.5 shrink-0">
 {beat.todayCompleted ? (
 <Button size="sm" variant="secondary"
 disabled
 className="text-[11px] gap-1 bg-rose-soft text-rose-main border-rose-soft cursor-default"
 >
 <CheckCheck className="w-3 h-3" /> Done ✓
 </Button>
 ) : beat.iSentToday ? (
 <Button size="sm" variant="secondary"
 disabled
 className="text-[11px] gap-1 bg-rose-soft text-rose-main border-rose-soft cursor-default"
 >
 <Clock className="w-3 h-3" /> Waiting
 </Button>
 ) : (
 <Button size="sm" variant={isUrgent ? 'default' : 'secondary'}
 disabled={completing === beat.id}
 onClick={() => handleSelectMatch(beat)}
 className="text-[11px] gap-1"
 >
 <BeatsIcon size={14} /> {completing === beat.id ? '\u2026' : 'Beat'}
 </Button>
 )}
 <BeatMenu
 onRemove={() => setConfirmAction({ type: 'remove', beatId: beat.id })}
 onBlock={() => setConfirmAction({ type: 'block', beatId: beat.id })}
 onReport={() => setConfirmAction({ type: 'report', beatId: beat.id })}
 onMute={() => {
 api.updateSettings({ pushNotifications: false } as any).catch(() => {});
 }}
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
 className="mt-3 flex items-center gap-2 bg-rose-soft px-3 py-2 rounded-lg border border-rose-soft">
 <Clock className="w-3.5 h-3.5 text-rose-alt shrink-0" />
 <span className="text-[11px] text-rose-main font-medium">{beat.iSentToday ? `You sent — waiting for ${other.displayName}` : 'Your turn! Don\'t let it fade!'}</span>
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
 <Card className="p-5 border-border/30">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-main/15 to-rose-soft flex items-center justify-center shrink-0 shadow-sm">
 <BeatsIcon size={20} />
 </div>
 <div>
 <h4 className="text-sm font-bold text-text-primary mb-1.5">How Beats Work</h4>
 <div className="space-y-2 text-[12px] text-text-muted leading-relaxed">
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
 <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-3">
 <Crown className="w-4 h-4 text-rose-main" /> Streak Milestones
 </h3>
 <div className="flex items-center gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
 {Object.entries(MILESTONE_EMOJIS).map(([days, data]) => {
 const achieved = beats.some(b => b.count >= Number(days));
 return (
 <div key={days} className={cn('flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[60px] transition-all',
 achieved ? 'bg-gradient-to-b from-rose-soft to-rose-soft border border-rose-soft' : 'bg-miamo-surface opacity-40'
 )}>
 <span className="text-lg">{data.emoji}</span>
 <span className={cn('text-[9px] font-bold', achieved ? data.color : 'text-text-muted')}>{days}d</span>
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
 {confirmAction?.type === 'report' && (
 <ConfirmPopup
 title="Report User?"
 message="This will report the user for inappropriate behavior. Our safety team will review the report."
 confirmText="Report"
 danger
 onConfirm={async () => {
 const beat = beats.find(b => b.id === confirmAction.beatId);
 if (beat) { try { await api.reportUser({ reportedId: beat.matchedUser.id, reason: 'inappropriate' }); } catch {} }
 setConfirmAction(null);
 }}
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
 </div>
 );
}
