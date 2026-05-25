'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Search, Heart, Sparkles, Pin, Clock, Pause,
 Check, Play, MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { GridSkeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { mainTabs, matchFilters } from './components/constants';
import { ProfileModal } from './components/ProfileModal';
import { FeedbackModal } from './components/FeedbackModal';
import { IncomingCard, MatchCard, ContextMenu, HeldItemMenu } from './components/MatchCard';

/* ═══════════════════════════════════════════════════════
 MAIN MATCHES PAGE
 ═══════════════════════════════════════════════════════ */
export default function MatchesPage() {
 const router = useRouter();
 const [activeTab, setActiveTab] = useState('incoming');
 const [matchFilter, setMatchFilter] = useState('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [incoming, setIncoming] = useState<any[]>([]);
 const [matches, setMatches] = useState<any[]>([]);
 const [heldItems, setHeldItems] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [incomingMeta, setIncomingMeta] = useState<any>({});

 useTrackPageView('matches');
 useTrackScrollDepth('matches');

 // Profile modal
 const [selectedIncoming, setSelectedIncoming] = useState<any>(null);

 // Menu state
 const [menuOpen, setMenuOpen] = useState<string | null>(null);
 const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

 // Feedback modal
 const [feedbackModal, setFeedbackModal] = useState<{ type: 'unmatch' | 'report' | 'block'; matchId: string; matchName: string } | null>(null);

 // Toast
 const toastCtx = useToast();
 const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
 if (type === 'success') toastCtx.success(msg);
 else toastCtx.info(msg);
 };

 // Multi-select for On Hold
 const [selectMode, setSelectMode] = useState(false);
 const [selectedHeldIds, setSelectedHeldIds] = useState<Set<string>>(new Set());
 const toggleHeldSelect = (userId: string) => {
 setSelectedHeldIds(prev => {
 const next = new Set(prev);
 if (next.has(userId)) next.delete(userId); else next.add(userId);
 return next;
 });
 };
 const selectAllHeld = () => {
 setSelectedHeldIds(new Set(heldItems.map(i => i.user?.id).filter(Boolean)));
 };
 const clearSelection = () => { setSelectedHeldIds(new Set()); setSelectMode(false); };
 const handleBulkResume = async () => {
 const ids = Array.from(selectedHeldIds);
 let resumed = 0;
 for (const id of ids) {
 try { await api.resumeIncoming(id); resumed++; } catch {}
 }
 showToast(`Resumed ${resumed} profile${resumed !== 1 ? 's' : ''}`, 'success');
 clearSelection();
 loadData();
 };

 const loadData = useCallback(async () => {
 setLoading(true);
 try {
 const [inc, mtch, held, heldMatches] = await Promise.allSettled([
 api.getIncomingLikes(),
 api.getMatches(matchFilter !== 'all' ? { filter: matchFilter } : undefined),
 api.getIncomingLikes({ showHeld: 'true' }),
 api.getMatches({ includeHeld: 'true' }),
 ]);
 const incData = inc.status === 'fulfilled' ? inc.value.data || [] : [];
 const mtchData = mtch.status === 'fulfilled' ? mtch.value.data || [] : [];
 setIncoming(incData);
 if (inc.status === 'fulfilled') setIncomingMeta(inc.value.meta || {});
 setMatches(mtchData);
 // Merge held incoming + held matches for the On Hold tab
 const heldList: any[] = [];
 const seenUserIds = new Set<string>();
 if (held.status === 'fulfilled') {
 const all = held.value.data || [];
 all.filter((i: any) => i.isHeld).forEach((item: any) => {
 const uid = item.user?.id;
 if (uid && !seenUserIds.has(uid)) { seenUserIds.add(uid); heldList.push(item); }
 });
 }
 if (heldMatches.status === 'fulfilled') {
 (heldMatches.value.data || []).filter((m: any) => m.isHeld).forEach((m: any) => {
 const uid = m.matchedUser?.id;
 if (uid && !seenUserIds.has(uid)) {
 seenUserIds.add(uid);
 heldList.push({ id: m.id, user: m.matchedUser, isHeld: true, createdAt: m.createdAt, matchId: m.id });
 }
 });
 }
 setHeldItems(heldList);
 } catch (e: any) {
 if (process.env.NODE_ENV === 'development') console.warn('Failed to load matches data:', e);
 setIncoming([]);
 setMatches([]);
 } finally {
 setLoading(false);
 }
 }, [matchFilter]);

 useEffect(() => { loadData(); }, [loadData]);

 // Refresh held data when switching to the held tab
 useEffect(() => {
 if (activeTab === 'held') {
 Promise.allSettled([
 api.getIncomingLikes({ showHeld: 'true' }),
 api.getMatches({ includeHeld: 'true' }),
 ]).then(([held, heldMatches]) => {
 const heldList: any[] = [];
 const seenUserIds = new Set<string>();
 if (held.status === 'fulfilled') {
 (held.value.data || []).filter((i: any) => i.isHeld).forEach((item: any) => {
 const uid = item.user?.id;
 if (uid && !seenUserIds.has(uid)) { seenUserIds.add(uid); heldList.push(item); }
 });
 }
 if (heldMatches.status === 'fulfilled') {
 (heldMatches.value.data || []).filter((m: any) => m.isHeld).forEach((m: any) => {
 const uid = m.matchedUser?.id;
 if (uid && !seenUserIds.has(uid)) {
 seenUserIds.add(uid);
 heldList.push({ id: m.id, user: m.matchedUser, isHeld: true, createdAt: m.createdAt, matchId: m.id });
 }
 });
 }
 setHeldItems(heldList);
 });
 }
 }, [activeTab]);

 const searchTimer = useRef<NodeJS.Timeout | null>(null);
 const handleSearch = (val: string) => {
 setSearchQuery(val);
 if (searchTimer.current) clearTimeout(searchTimer.current);
 searchTimer.current = setTimeout(async () => {
 if (val.trim()) {
 const res = await api.getMatches({ q: val.trim() });
 setMatches(res.data || []);
 } else { loadData(); }
 }, 300);
 };

 /* ─── Actions ─── */
 const handleMatchBack = async () => {
 if (!selectedIncoming) return;
 try {
 const res = await api.matchBack(selectedIncoming.user.id);
 showToast("It's a Match! 🎉 Chat is ready");
 setSelectedIncoming(null);
 loadData();
 if (res.data?.chatId) setTimeout(() => router.push(`/messages?chat=${res.data.chatId}`), 1200);
 } catch { showToast('Something went wrong', 'info'); }
 };

 const handleMatchMove = async (message: string) => {
 if (!selectedIncoming) return;
 try {
 const res = await api.matchBackWithMove(selectedIncoming.user.id, message);
 showToast('Matched with a Move! 💫');
 setSelectedIncoming(null);
 loadData();
 if (res.data?.chatId) setTimeout(() => router.push(`/messages?chat=${res.data.chatId}`), 1200);
 } catch { showToast('Something went wrong', 'info'); }
 };

 const handleHold = async () => {
 if (!selectedIncoming) return;
 const userId = selectedIncoming.user.id;
 setSelectedIncoming(null);
 try {
 await api.holdIncoming(userId);
 showToast('Saved for later ⏸️');
 await loadData();
 } catch (e) {
 if (process.env.NODE_ENV === 'development') console.warn('[Miamo] hold error:', e);
 showToast('Failed to hold — try again', 'info');
 }
 };

 const handleResume = async (userId?: string) => {
 const id = userId || selectedIncoming?.user?.id;
 if (!id) return;
 try {
 await api.resumeIncoming(id);
 showToast('Resumed — moved back to incoming');
 if (selectedIncoming) setSelectedIncoming(null);
 await loadData();
 } catch (e) {
 if (process.env.NODE_ENV === 'development') console.warn('[Miamo] resume error:', e);
 showToast('Failed to resume', 'info');
 }
 };

 const handleHide = async (userId?: string) => {
 const id = userId || selectedIncoming?.user?.id;
 if (!id) return;
 try { await api.hideIncoming(id); showToast('Hidden'); if (selectedIncoming) setSelectedIncoming(null); loadData(); } catch {}
 };

 const handleReport = async (userId?: string) => {
 const id = userId || selectedIncoming?.user?.id;
 if (!id) return;
 const heldItem = heldItems.find(i => i.user?.id === id);
 const matchItem = matches.find(m => m.matchedUser?.id === id);
 const matchId = heldItem?.matchId || heldItem?.id || matchItem?.id || `report-${id}`;
 const matchName = heldItem?.user?.displayName || matchItem?.matchedUser?.displayName || selectedIncoming?.user?.displayName || 'User';
 setFeedbackModal({ type: 'report', matchId, matchName });
 if (selectedIncoming) setSelectedIncoming(null);
 };

 const handleBlock = async (userId?: string) => {
 const id = userId || selectedIncoming?.user?.id;
 if (!id) return;
 const heldItem = heldItems.find(i => i.user?.id === id);
 const matchItem = matches.find(m => m.matchedUser?.id === id);
 const matchId = heldItem?.matchId || heldItem?.id || matchItem?.id || `block-${id}`;
 const matchName = heldItem?.user?.displayName || matchItem?.matchedUser?.displayName || selectedIncoming?.user?.displayName || 'User';
 setFeedbackModal({ type: 'block', matchId, matchName });
 if (selectedIncoming) setSelectedIncoming(null);
 };

 const handleFavorite = useCallback(async (matchId: string) => {
 try { const res = await api.favoriteMatch(matchId); setMatches(p => p.map(m => m.id === matchId ? { ...m, isFavorite: res.data.isFavorite } : m)); } catch {}
 }, []);
 const handlePin = useCallback(async (matchId: string) => {
 try { const res = await api.pinMatch(matchId); setMatches(p => p.map(m => m.id === matchId ? { ...m, isPinned: res.data.isPinned } : m)); } catch {}
 }, []);
 const handleUnmatch = async (reason: string, details: string) => {
 if (!feedbackModal) return;
 try {
 await api.unmatch(feedbackModal.matchId, reason, details);
 setMatches(p => p.filter(m => m.id !== feedbackModal.matchId));
 setHeldItems(p => p.filter(i => (i.matchId || i.id) !== feedbackModal.matchId));
 showToast('Unmatched');
 loadData();
 } catch {}
 };
 const handleReportMatch = async (reason: string, details: string) => {
 if (!feedbackModal) return;
 const isSynthetic = feedbackModal.matchId.startsWith('report-');
 const targetUserId = isSynthetic ? feedbackModal.matchId.replace('report-', '') : getMatchById(feedbackModal.matchId)?.matchedUser?.id;
 try {
 if (isSynthetic && targetUserId) {
 await api.reportUser({ reportedId: targetUserId, reason, details });
 } else {
 await api.reportMatch(feedbackModal.matchId, reason, details);
 }
 showToast('Reported — thanks for keeping Miamo safe');
 loadData();
 } catch {}
 };
 const handleBlockMatch = async (reason: string, details: string) => {
 if (!feedbackModal) return;
 // Support both real matchId and synthetic block-{userId}
 const isSynthetic = feedbackModal.matchId.startsWith('block-');
 const targetUserId = isSynthetic ? feedbackModal.matchId.replace('block-', '') : getMatchById(feedbackModal.matchId)?.matchedUser?.id;
 if (!targetUserId) return;
 try {
 await api.blockUser(targetUserId);
 // Store feedback reason for AI algorithm improvement
 try { await api.blockByUser(targetUserId, reason, details); } catch {}
 if (!isSynthetic) {
 setMatches(p => p.filter(m => m.id !== feedbackModal.matchId));
 setHeldItems(p => p.filter(i => (i.matchId || i.id) !== feedbackModal.matchId));
 }
 showToast('User blocked');
 loadData();
 } catch {}
 };

 const handleChat = useCallback((match: any) => { router.push(match.chatId ? `/messages?chat=${match.chatId}` : '/messages'); }, [router]);
 const handleVideoCall = useCallback(() => { toastCtx.info('Video calls coming soon!'); }, [toastCtx]);

 const openMenu = (matchId: string, event: React.MouseEvent) => {
 event.stopPropagation();
 const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
 // Clamp to viewport bounds
 const y = Math.min(rect.bottom + 4, window.innerHeight - 300);
 const x = Math.min(rect.right - 192, window.innerWidth - 210);
 setMenuPosition({ x: Math.max(8, x), y: Math.max(8, y) });
 setMenuOpen(matchId);
 };

 const getMatchById = (id: string) => matches.find(m => m.id === id);
 const getMatchName = (id: string) => getMatchById(id)?.matchedUser?.displayName || 'User';

 const pinnedMatches = useMemo(() => matches.filter(m => m.isPinned), [matches]);
 const unpinnedMatches = useMemo(() => matches.filter(m => !m.isPinned), [matches]);
 const hasPinned = pinnedMatches.length > 0;

 /* ─── Loading ─── */
 if (loading && incoming.length === 0 && matches.length === 0) {
 return <GridSkeleton count={6} />;
 }

 return (
 <ErrorBoundary>
 <div className="h-full overflow-y-auto">
 <div className="max-w-3xl mx-auto px-6 py-6">

 {/* ─── Header ─── */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="font-brand font-semibold text-3xl text-text-primary">Matches</h1>
 <p className="text-[13px] text-text-secondary mt-1">
 {incoming.length > 0 && <span className="text-rose">{incoming.length} incoming</span>}
 {incoming.length > 0 && matches.length > 0 && <span className="text-text-muted"> · </span>}
 {matches.length > 0 && <span>{matches.length} mutual</span>}
 {incoming.length === 0 && matches.length === 0 && 'Your matches will appear here'}
 </p>
 </div>
 </div>



 {/* ─── Main Tabs — Rose Accent Glass ─── */}
 <div className="flex gap-1 mb-5 p-1 rounded-2xl glass-rose shadow-soft">
 {mainTabs.map(tab => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 const count = tab.id === 'incoming' ? incoming.length : tab.id === 'matches' ? matches.length : heldItems.length;
 return (
 <button key={tab.id} onClick={() => setActiveTab(tab.id)}
 className={cn('flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-semibold transition-all duration-300', isActive ? 'bg-gradient-to-r from-[#C97856] to-[#D4896A] text-white shadow-[0_4px_12px_rgba(201,120,86,0.25)]' : 'text-text-muted hover:text-[#C97856] hover:bg-white/60')}>
 <Icon className="w-3.5 h-3.5" />
 {tab.label}
 {count > 0 && (
 <span className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center', isActive ? 'bg-white/25 text-white' : 'bg-[#C97856]/10 text-[#C97856]')}>
 {count > 99 ? '99+' : count}
 </span>
 )}
 </button>
 );
 })}
 </div>

 {/* ═══ INCOMING TAB ═══ */}
 {activeTab === 'incoming' && (
 <div>
 {incoming.length === 0 ? (
 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
 <div className="w-16 h-16 rounded-full bg-rose-soft border border-rose-main/15 flex items-center justify-center mx-auto mb-5">
 <Heart className="w-7 h-7 text-rose" />
 </div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">Quiet</p>
 <h3 className="font-brand font-semibold text-2xl text-text-primary mb-2">No incoming yet.</h3>
 <p className="text-[14px] text-text-secondary max-w-[320px] mx-auto leading-relaxed">
 When someone likes your profile, they’ll appear here. Keep showing up — the right people find you.
 </p>
 <button onClick={() => router.push('/discover')}
 className="mt-7 h-10 px-6 rounded-xl bg-rose-main text-white text-[13px] font-semibold shadow-soft hover:bg-rose-dark hover:-translate-y-0.5 transition-all duration-300">
 Explore Discover
 </button>
 </motion.div>
 ) : (
 <div className="space-y-2">
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
 <Heart className="w-3.5 h-3.5 text-rose-light" /> People who liked you
 <span className="ml-auto text-[10px] text-text-secondary font-normal normal-case">Tap to view profile</span>
 </p>
 {incoming.map((item) => (
 <IncomingCard key={item.id} item={item} onClick={() => setSelectedIncoming(item)} />
 ))}
 </div>
 )}
 </div>
 )}

 {/* ═══ MY MATCHES TAB ═══ */}
 {activeTab === 'matches' && (
 <div>
 <div className="flex gap-3 mb-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
 <input value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Search matches..."
 className="w-full h-9 rounded-xl bg-miamo-surface border border-border text-text-primary text-[12px] pl-9 pr-4 focus:border-border focus:outline-none placeholder:text-text-muted transition" />
 </div>
 </div>
 <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
 {matchFilters.map(f => (
 <button key={f.id} onClick={() => setMatchFilter(f.id)}
 className={cn('px-3.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all duration-300 border', matchFilter === f.id ? 'bg-[#C97856]/8 border-[#C97856]/25 text-[#C97856] shadow-[0_2px_8px_rgba(201,120,86,0.08)]' : 'border-[#C97856]/8 text-text-muted hover:text-[#C97856] hover:border-[#C97856]/20 hover:bg-[#C97856]/4')}>
 {f.label}
 </button>
 ))}
 </div>

 {matches.length === 0 ? (
 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
 <div className="w-14 h-14 rounded-full bg-rose-soft border border-rose-main/15 flex items-center justify-center mx-auto mb-4">
 <Sparkles className="w-6 h-6 text-rose" />
 </div>
 <h3 className="font-brand font-semibold text-xl text-text-primary mb-2">
 {searchQuery ? 'No matches found' : matchFilter !== 'all' ? `No ${matchFilter} matches` : 'No mutual matches yet'}
 </h3>
 <p className="text-[13px] text-text-secondary max-w-xs mx-auto leading-relaxed">
 {searchQuery ? 'Try a different search.' : "When you match back with someone, they'll appear here — ready to chat."}
 </p>
 </motion.div>
 ) : (
 <div className="space-y-2">
 {hasPinned && (
 <>
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1 flex items-center gap-1.5"><Pin className="w-3 h-3" /> Pinned</p>
 {pinnedMatches.map(match => <MatchCard key={match.id} match={match} onOpenMenu={openMenu} onChat={handleChat} onVideoCall={handleVideoCall} />)}
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mt-4 mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> All Matches</p>
 </>
 )}
 {unpinnedMatches.map(match => <MatchCard key={match.id} match={match} onOpenMenu={openMenu} onChat={handleChat} onVideoCall={handleVideoCall} />)}
 </div>
 )}
 </div>
 )}

 {/* ═══ ON HOLD TAB ═══ */}
 {activeTab === 'held' && (
 <div>
 {heldItems.length === 0 ? (
 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
 <div className="w-14 h-14 rounded-full bg-rose-soft border border-rose-main/15 flex items-center justify-center mx-auto mb-4">
 <Pause className="w-6 h-6 text-rose" />
 </div>
 <h3 className="font-brand font-semibold text-xl text-text-primary mb-2">Nothing on hold</h3>
 <p className="text-[13px] text-text-secondary max-w-xs mx-auto leading-relaxed">When you’re not sure about someone, put them on hold to revisit later.</p>
 {incomingMeta?.heldCount > 0 && (
 <button onClick={loadData} className="mt-4 px-4 py-2 rounded-lg bg-white border border-border-light text-text-secondary text-[12px] font-medium hover:border-rose-main/30 hover:text-rose transition">
 Refresh
 </button>
 )}
 </motion.div>
 ) : (
 <div className="space-y-2">
 {/* Header with Select toggle */}
 <div className="flex items-center justify-between mb-3">
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] flex items-center gap-2">
 <Pause className="w-3.5 h-3.5 text-[#C97856]" /> Saved for later ({heldItems.length})
 </p>
 <button
 onClick={() => { if (selectMode) clearSelection(); else setSelectMode(true); }}
 className={cn(
 "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-300",
 selectMode ? "bg-[#C97856]/12 text-[#C97856] border border-[#C97856]/25 shadow-[0_2px_8px_rgba(201,120,86,0.08)]" : "bg-white border border-[#C97856]/10 text-text-muted hover:bg-[#C97856]/5 hover:text-[#C97856]"
 )}
 >
 {selectMode ? 'Cancel' : 'Select'}
 </button>
 </div>

 {/* Bulk action toolbar */}
 <AnimatePresence>
 {selectMode && selectedHeldIds.size > 0 && (
 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
 className="mb-3 p-3 rounded-xl glass-rose border border-[#C97856]/12 flex items-center justify-between shadow-[0_4px_16px_rgba(201,120,86,0.06)]"
 >
 <span className="text-[11px] text-[#C97856] font-medium">{selectedHeldIds.size} selected</span>
 <div className="flex items-center gap-2">
 <button onClick={selectAllHeld} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white border border-[#C97856]/10 text-text-muted hover:text-[#C97856] transition-all">
 All
 </button>
 <button onClick={handleBulkResume} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#C97856] to-[#D4896A] text-white text-[11px] font-semibold shadow-[0_4px_12px_rgba(201,120,86,0.2)] hover:shadow-[0_6px_16px_rgba(201,120,86,0.3)] transition-all duration-300 flex items-center gap-1">
 <Play className="w-3 h-3" /> Resume All
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {heldItems.map((item) => {
 const user = item.user || {};
 const userId = user.id;
 const name = user.displayName || 'User';
 const photo = user.photos?.[0]?.url || user.photos?.[0];
 const city = user.profile?.city;
 const age = user.profile?.age;
 const isSelected = selectedHeldIds.has(userId);
 return (
 <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
 className={cn(
 "rounded-2xl border transition-all duration-300 overflow-hidden",
 isSelected ? "border-[#C97856]/25 bg-[#C97856]/[0.05] shadow-[0_4px_12px_rgba(201,120,86,0.06)]" : "border-[#C97856]/8 bg-white/80 hover:bg-[#C97856]/[0.03] hover:border-[#C97856]/15"
 )}
 >
 <div className="flex items-center gap-3 p-4">
 {/* Checkbox in select mode */}
 {selectMode && (
 <button onClick={() => toggleHeldSelect(userId)} className="flex-shrink-0">
 <div className={cn(
 "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
 isSelected ? "bg-[#C97856] border-[#C97856] shadow-[0_2px_8px_rgba(201,120,86,0.2)]" : "border-[#C97856]/20 bg-transparent hover:border-[#C97856]/40"
 )}>
 {isSelected && <Check className="w-3 h-3 text-white" />}
 </div>
 </button>
 )}
 <button onClick={() => selectMode ? toggleHeldSelect(userId) : setSelectedIncoming(item)} className="relative flex-shrink-0">
 <div className="w-14 h-14 rounded-xl overflow-hidden bg-miamo-surface">
 {photo ? <img loading="lazy" src={photo} alt={name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg font-black text-text-secondary">{name[0]}</div>}
 </div>
 {!selectMode && (
 <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#C97856]/15 border border-[#C97856]/25 flex items-center justify-center shadow-[0_2px_6px_rgba(201,120,86,0.12)]">
 <Pause className="w-2.5 h-2.5 text-[#C97856]" />
 </div>
 )}
 </button>
 <button onClick={() => selectMode ? toggleHeldSelect(userId) : setSelectedIncoming(item)} className="flex-1 min-w-0 text-left">
 <div className="flex items-center gap-2 mb-0.5">
 <h3 className="text-[14px] font-bold text-text-primary truncate">{name}</h3>
 {age && <span className="text-[12px] text-text-muted">{age}</span>}
 </div>
 {city && <p className="text-[11px] text-text-muted flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{city}</p>}
 </button>
 {!selectMode && (
 <div className="flex items-center gap-2">
 <button onClick={() => handleResume(userId)} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C97856] to-[#D4896A] text-white text-[11px] font-semibold shadow-[0_3px_10px_rgba(201,120,86,0.18)] hover:shadow-[0_5px_14px_rgba(201,120,86,0.25)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-1">
 <Play className="w-3 h-3" /> Resume
 </button>
 <HeldItemMenu userId={userId} onResume={() => handleResume(userId)} onReport={() => handleReport(userId)} onBlock={() => handleBlock(userId)} onUnmatch={() => {
 const matchId = item.matchId || item.id;
 setFeedbackModal({ type: 'unmatch', matchId, matchName: name });
 }} />
 </div>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>

 {/* ─── Profile Modal ─── */}
 <AnimatePresence>
 {selectedIncoming && (
 <ProfileModal
 isOpen={!!selectedIncoming}
 onClose={() => setSelectedIncoming(null)}
 incoming={selectedIncoming}
 onMatchBack={handleMatchBack}
 onMatchMove={handleMatchMove}
 onHold={handleHold}
 onHide={() => handleHide()}
 onReport={() => handleReport()}
 onBlock={() => handleBlock()}
 />
 )}
 </AnimatePresence>

 {/* ─── Context Menu ─── */}
 <ContextMenu
 isOpen={!!menuOpen}
 position={menuPosition}
 onClose={() => setMenuOpen(null)}
 onFavorite={() => menuOpen && handleFavorite(menuOpen)}
 onPin={() => menuOpen && handlePin(menuOpen)}
 onHold={() => {
 if (menuOpen) {
 const match = getMatchById(menuOpen);
 if (match?.matchedUser?.id) {
 api.holdIncoming(match.matchedUser.id).then(() => {
 showToast('Moved to On Hold ⏸️');
 loadData();
 }).catch(() => showToast('Failed to hold', 'info'));
 }
 setMenuOpen(null);
 }
 }}
 onBlock={() => {
 if (menuOpen) {
 setFeedbackModal({ type: 'block', matchId: menuOpen!, matchName: getMatchName(menuOpen!) });
 setMenuOpen(null);
 }
 }}
 onUnmatch={() => { if (menuOpen) { setFeedbackModal({ type: 'unmatch', matchId: menuOpen!, matchName: getMatchName(menuOpen!) }); setMenuOpen(null); } }}
 onReport={() => { if (menuOpen) { setFeedbackModal({ type: 'report', matchId: menuOpen!, matchName: getMatchName(menuOpen!) }); setMenuOpen(null); } }}
 isFavorite={menuOpen ? getMatchById(menuOpen)?.isFavorite : false}
 isPinned={menuOpen ? getMatchById(menuOpen)?.isPinned : false}
 />

 {/* ─── Feedback Modal ─── */}
 <FeedbackModal
 isOpen={!!feedbackModal}
 onClose={() => setFeedbackModal(null)}
 type={feedbackModal?.type || 'unmatch'}
 matchName={feedbackModal?.matchName || ''}
 onSubmit={feedbackModal?.type === 'report' ? handleReportMatch : feedbackModal?.type === 'block' ? handleBlockMatch : handleUnmatch}
 />

 {/* ─── Toast ─── */}
 </div>
 </ErrorBoundary>
 );
}
