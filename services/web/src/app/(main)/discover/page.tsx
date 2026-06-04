'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Heart, Shield, Brain, SlidersHorizontal, Sparkles, Zap, Eye,
 ThumbsDown, Ghost, MapPin, Camera, Users as UsersIcon, X, Check,
 Bookmark, Undo2,
} from 'lucide-react';
import { ProfileCardSkeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackActivity, useTrackScrollDepth, useTrackPhotoViews } from '@/hooks/useTrackActivity';
import { usePersistentState } from '@/hooks/usePersistentState';
import { track } from '@/lib/track';
import {
 trackDiscoverSeeLater,
 trackDiscoverBatchExhausted,
} from '@/lib/track/collectors/deferred';
import { swipeTracker } from '@/lib/track/collectors/swipe';
import { DeferredPileModal } from '@/components/deferred/DeferredPileModal';
import { AllCaughtUpScreen } from '@/components/deferred/AllCaughtUpScreen';
import { Portal } from '@/components/ui/portal';
import { type DiscoverProfile, type AiData, type Filters, DEFAULT_FILTERS } from './components/constants';
import { FilterPanel } from './components/FilterPanel';
import { ShortcutBar } from './components/ShortcutBar';
import { ProfileCard } from './components/ProfileCard';
import { AiSidePanel } from './components/AiSidePanel';

/* ═══════════════════════════════════════════════════════
 MAIN DISCOVER PAGE
 ═══════════════════════════════════════════════════════ */
export default function DiscoverPage() {
 const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
 const [currentIndex, setCurrentIndex] = useState(0);
 const [loading, setLoading] = useState(true);
 // v6.7: cursor for the rolling top-10 contract. After the user has consumed
 // (acted on / deferred) all 10 cards in the current batch, we silently
 // fetch the next batch using this cursor. Each request re-runs the full
 // ranking pipeline with freshly-aggregated tracking signals, so the next
 // 10 reflect what the user just did.
 const [cursor, setCursor] = useState<string | null>(null);
 const [exhausted, setExhausted] = useState(false); // server returned <10 → no more pages
 const [refreshing, setRefreshing] = useState(false);
 const [filters, setFilters] = usePersistentState<Filters>('discover:filters', DEFAULT_FILTERS);
 const [showFilters, setShowFilters] = useState(false);
 const [aiData, setAiData] = useState<Record<string, AiData>>({});
 const [activeQuickFilter, setActiveQuickFilter] = usePersistentState<string>('discover:quickFilter', 'all');
 const [passFeedback, setPassFeedback] = useState<{ userId: string; name: string } | null>(null);
 const [passCount, setPassCount] = useState(0);
 const [showDeferred, setShowDeferred] = useState(false);
 const [deferredCount, setDeferredCount] = useState(0);
 // v3.4 — action history for undo. Stores at most the last 5 client-side
 // decisions so the user can rewind a mistaken pass / like / super-like.
 // Server-side records remain (de-dup on re-decide), but the user gets the
 // card back on screen to review.
 type ActionEntry = {
 type: 'pass' | 'like' | 'super' | 'maybe' | 'move';
 profile: DiscoverProfile;
 prevIndex: number;
 };
 const [actionHistory, setActionHistory] = useState<ActionEntry[]>([]);
 const pushAction = useCallback((entry: ActionEntry) => {
 setActionHistory((h) => [...h.slice(-4), entry]);
 }, []);
 // Track per-batch counters so we can emit discover.batch.exhausted with
 // accurate `acted` / `deferred` numbers when the queue empties.
 const [batchId, setBatchId] = useState<string>(() => `b_${Date.now()}`);
 const [batchActed, setBatchActed] = useState(0);
 const [batchDeferred, setBatchDeferred] = useState(0);
 const [batchExhaustedFired, setBatchExhaustedFired] = useState(false);
 const toast = useToast();

 useTrackPageView('discover');
 useTrackScrollDepth('discover');
 const trackActivity = useTrackActivity();
 const { onPhotoView, flushPhotoTracking } = useTrackPhotoViews();

 const buildParams = useCallback((f: Filters, quick: string): Record<string, string> => {
 const p: Record<string, string> = {};
 if (f.minAge > 18) p.minAge = String(f.minAge);
 if (f.maxAge < 99) p.maxAge = String(f.maxAge);
 if (f.minHeight) p.minHeight = String(f.minHeight);
 if (f.maxHeight) p.maxHeight = String(f.maxHeight);
 if (f.city) p.city = f.city;
 if (f.genders) p.gender = f.genders;
 if (f.sexualities) p.sexuality = f.sexualities;
 if (f.lookingFor) p.lookingFor = f.lookingFor;
 if (f.smoking) p.smoking = f.smoking;
 if (f.drinking) p.drinking = f.drinking;
 if (f.exercise) p.exercise = f.exercise;
 if (f.education) p.education = f.education;
 if (f.religion) p.religion = f.religion;
 if (f.zodiac) p.zodiac = f.zodiac;
 if (f.pets) p.pets = f.pets;
 if (f.children) p.children = f.children;
 if (f.diet) p.diet = f.diet;
 if (f.politics) p.politics = f.politics;
 if (f.languages) p.languages = f.languages;
 if (f.maritalStatus) p.maritalStatus = f.maritalStatus;
 if (f.incomeBand) p.incomeBand = f.incomeBand;
 if (f.willingToRelocate) p.willingToRelocate = 'true';
 if (f.distance && f.distance > 0) p.distance = String(f.distance);
 if (f.activeToday) p.activeToday = 'true';
 if (f.newHere) p.newHere = 'true';
 if (f.verified) p.verifiedOnly = 'true';
 if (f.hasPhotos) p.hasPhotos = 'true';
 if (quick === 'serious') p.seriousOnly = 'true';
 if (quick === 'nearby') p.activeToday = 'true';
 if (quick === 'new') p.newHere = 'true';
 if (quick === 'verified') p.verifiedOnly = 'true';
 if (quick === 'ai') p.aiPicks = 'true';
 return p;
 }, []);

 const loadProfiles = useCallback(async () => {
 setLoading(true);
 try {
 const params = buildParams(filters, activeQuickFilter);
 params.limit = '10';
 const res = await api.getDiscover(params);
 const data = res.data || [];
 setProfiles(data);
 setCurrentIndex(0);
 setCursor(res.cursor || null);
 setExhausted(data.length < 10);
 setBatchId(`b_${Date.now()}`);
 setBatchActed(0);
 setBatchDeferred(0);
 setBatchExhaustedFired(false);
 } catch (err) {
 setProfiles([]);
 if (typeof window !== 'undefined') {
 console.error('[Discover] Failed to load profiles:', err);
 }
 }
 finally { setLoading(false); }
 }, [filters, activeQuickFilter, buildParams]);

 // v6.7: silently swap in the next 10 best-ranked profiles. Triggered when
 // the user reaches the end of the current batch. Each call re-runs the
 // backend ranking pipeline with freshly-aggregated tracking signals.
 const refreshTopTen = useCallback(async () => {
 if (refreshing || exhausted) return;
 setRefreshing(true);
 try {
 trackDiscoverBatchExhausted({ batchId, shown: profiles.length, acted: batchActed, deferred: batchDeferred });
 const params = buildParams(filters, activeQuickFilter);
 params.limit = '10';
 if (cursor) params.cursor = cursor;
 const res = await api.getDiscover(params);
 const data = res.data || [];
 if (data.length === 0) {
 setExhausted(true);
 setProfiles([]);
 return;
 }
 setProfiles(data);
 setCurrentIndex(0);
 setCursor(res.cursor || null);
 setExhausted(data.length < 10);
 setBatchId(`b_${Date.now()}`);
 setBatchActed(0);
 setBatchDeferred(0);
 setBatchExhaustedFired(false);
 track('discover.batch.refreshed', { count: data.length });
 if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mio:feedrefresh', { detail: { surface: '/discover' } }));
 } catch (err) {
 if (typeof window !== 'undefined') console.error('[Discover] refresh failed:', err);
 } finally {
 setRefreshing(false);
 }
 }, [refreshing, exhausted, batchId, profiles.length, batchActed, batchDeferred, buildParams, filters, activeQuickFilter, cursor]);

 // Advance to next card; when end reached, fetch next batch of 10 instead
 // of dropping to the All-Caught-Up screen.
 const advanceCard = useCallback(() => {
 setCurrentIndex((i) => {
 if (i < profiles.length - 1) return i + 1;
 // Last card just acted on — trigger refresh; UI will show loading.
 void refreshTopTen();
 return i + 1; // beyond array → currentUser becomes undefined briefly
 });
 }, [profiles.length, refreshTopTen]);

 useEffect(() => { loadProfiles(); }, [loadProfiles]);

 // Refresh deferred-pile size on mount and whenever the modal closes so
 // the "View N deferred" CTA on the all-caught-up screen stays accurate.
 const refreshDeferredCount = useCallback(async () => {
 try {
 const res = await api.listDeferred({ surface: 'discover', kind: 'pending', limit: 100 });
 setDeferredCount(res.data?.count ?? 0);
 } catch { /* swallow */ }
 }, []);
 useEffect(() => { refreshDeferredCount(); }, [refreshDeferredCount]);
 useEffect(() => { if (!showDeferred) refreshDeferredCount(); }, [showDeferred, refreshDeferredCount]);

 const currentUser = profiles[currentIndex];
 useEffect(() => {
 if (currentUser) trackActivity('view_profile', 'profile', currentUser.id);
 if (!currentUser || aiData[currentUser.id]) return;
 api.getAiScore(currentUser.id).then(res => {
 setAiData(prev => ({ ...prev, [currentUser.id]: res.data }));
 }).catch(() => {});
 }, [currentUser?.id]);

 const handlePass = () => {
 const passedUser = profiles[currentIndex];
 if (passedUser) {
 pushAction({ type: 'pass', profile: passedUser, prevIndex: currentIndex });
 trackActivity('pass', 'profile', passedUser.id);
 track('discover.swipe', { dir: 'left', tt: 'profile', tid: passedUser.id });
 swipeTracker.onSwipeCommit('left', 0, 0);
 api.passUser(passedUser.id).catch(() => {});
 setBatchActed((n) => n + 1);
 const newCount = passCount + 1;
 setPassCount(newCount);
 // Show feedback prompt every 3rd pass
 if (newCount % 3 === 0) {
 setPassFeedback({ userId: passedUser.id, name: passedUser.displayName || 'this person' });
 }
 }
 advanceCard();
 };

 const handleMove = async (message: string, targetType: string, targetId?: string) => {
 if (!currentUser) return;
 pushAction({ type: 'move', profile: currentUser, prevIndex: currentIndex });
 trackActivity('like', 'profile', currentUser.id);
 track('discover.swipe', { dir: 'right', tt: 'profile', tid: currentUser.id, hasMessage: !!message });
 swipeTracker.onSwipeCommit('right', 0, 0);
 setBatchActed((n) => n + 1);
 try {
 await api.sendMiamoMove(currentUser.id, message, targetType, targetId);
 toast.love('Move sent!', `Your move to ${currentUser.displayName} was delivered`);
 } catch {
 try { await api.sendLike(currentUser.id, targetType, targetId); toast.success('Like sent!'); } catch { toast.error('Failed to send'); }
 }
 advanceCard();
 };

 const handleLike = async () => {
 if (!currentUser) return;
 pushAction({ type: 'like', profile: currentUser, prevIndex: currentIndex });
 trackActivity('like', 'profile', currentUser.id);
 track('discover.swipe', { dir: 'right', tt: 'profile', tid: currentUser.id, hasMessage: false });
 swipeTracker.onSwipeCommit('right', 0, 0);
 setBatchActed((n) => n + 1);
 try { await api.sendLike(currentUser.id); toast.love('Liked!', `${currentUser.displayName} will see your like`); } catch { toast.error('Like failed'); }
 advanceCard();
 };

 const handleSuperLike = async () => {
 if (!currentUser) return;
 pushAction({ type: 'super', profile: currentUser, prevIndex: currentIndex });
 trackActivity('super_like', 'profile', currentUser.id);
 track('discover.swipe', { dir: 'super', tt: 'profile', tid: currentUser.id });
 swipeTracker.onSwipeCommit('up', 0, 0);
 setBatchActed((n) => n + 1);
 try { await api.superLikeUser(currentUser.id); toast.love('Super Like!', `${currentUser.displayName} will see your Super Like`); } catch { toast.error('Super Like failed'); }
 advanceCard();
 };

 const handleSeeLater = async () => {
 if (!currentUser) return;
 const tid = currentUser.id;
 pushAction({ type: 'maybe', profile: currentUser, prevIndex: currentIndex });
 trackDiscoverSeeLater({ tid, batchId, reason: 'not_now' });
 setBatchDeferred((n) => n + 1);
 setDeferredCount((n) => n + 1);
 try {
 await api.deferItem({ surface: 'discover', targetId: tid, batchId, reason: 'not_now' });
 toast.success('Saved for later');
 } catch { /* still advance even if persistence fails */ }
 advanceCard();
 };

 // v3.4 — Undo last action. Pops the history stack, rewinds the index,
 // and (best-effort) re-inserts the profile if the queue was emptied.
  // All side-effects done outside the updater so StrictMode's double-invoke
  // doesn't fire them twice.
  const handleUndo = () => {
    if (actionHistory.length === 0) return;
    const last = actionHistory[actionHistory.length - 1];
    setProfiles((curr) => {
      if (curr.length === 0) return [last.profile];
      if (curr[last.prevIndex]?.id !== last.profile.id) {
        const filtered = curr.filter((p) => p.id !== last.profile.id);
        return [last.profile, ...filtered];
      }
      return curr;
    });
    setCurrentIndex(last.prevIndex);
    if (last.type === 'maybe') {
      setDeferredCount((n) => Math.max(0, n - 1));
      setBatchDeferred((n) => Math.max(0, n - 1));
    } else {
      setBatchActed((n) => Math.max(0, n - 1));
    }
    setActionHistory((h) => h.slice(0, -1));
  };

 const handleApplyFilters = async (newFilters: Filters) => {
 const before = JSON.stringify(filters);
 setFilters(newFilters);
 if (JSON.stringify(newFilters) !== before) {
 track('filter.changed', { surface: 'discover', kind: 'advanced', count: Object.keys(newFilters).length });
 }
 try { await api.saveDiscoverFilters(newFilters); } catch {}
 };

 const quickFilters = [
 { id: 'all', label: 'For You', icon: Heart },
 { id: 'new', label: 'New', icon: Sparkles },
 { id: 'nearby', label: 'Active', icon: Zap },
 { id: 'verified', label: 'Verified', icon: Shield },
 { id: 'serious', label: 'Serious', icon: Eye },
 { id: 'ai', label: 'AI Picks', icon: Brain },
 ];
 void quickFilters;

 const activeFilterCount = useMemo(() => Object.entries(filters).filter(([k, v]) => {
 if (k === 'minAge' && v === 18) return false;
 if (k === 'maxAge' && v === 99) return false;
 if (k === 'distance' && v === 50) return false;
 return v !== '' && v !== null && v !== false;
 }).length, [filters]);

 /* ─── Loading State ─── */
 if (loading || refreshing) {
 return <ProfileCardSkeleton />;
 }

/* ─── All Caught Up Terminal (v6.6) ─── */
 if (!currentUser && exhausted) {
 // Fire batch.exhausted exactly once per batch when the queue empties.
 if (!batchExhaustedFired) {
 trackDiscoverBatchExhausted({
 batchId,
 shown: profiles.length,
 acted: batchActed,
 deferred: batchDeferred,
 });
 setBatchExhaustedFired(true);
 }
 return (
 <>
 <AllCaughtUpScreen
 surface="discover"
 deferredCount={deferredCount}
 onViewDeferred={() => setShowDeferred(true)}
 onAdjustFilters={() => setShowFilters(true)}
 />
 <FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={handleApplyFilters} />
 <DeferredPileModal
 surface="discover"
 isOpen={showDeferred}
 onClose={() => setShowDeferred(false)}
 renderItem={(item) => (
 <div>
 <p className="text-[13px] font-semibold text-text-primary">Profile {item.targetId.slice(0, 8)}…</p>
 <p className="text-[10px] text-text-muted mt-1">
 Saved {new Date(item.deferredAt).toLocaleDateString()}
 </p>
 </div>
 )}
 />
 </>
 );
 }

 // Defensive: queue advanced past the end but next batch hasn't arrived yet.
 if (!currentUser) return <ProfileCardSkeleton />;

 return (
 <ErrorBoundary>
 <div className="h-full overflow-y-auto">
 <div className="max-w-[1080px] mx-auto px-6 pb-6">

 {/* ─── Top Bar (sticky so shortcuts stay visible while scrolling) ─── */}
 <div className="sticky top-0 z-30 -mx-6 px-6 pt-4 pb-3 mb-4 bg-miamo-bg/85 backdrop-blur-xl border-b border-[#C97856]/8 flex items-center gap-3">
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => setShowFilters(true)}
 className={cn(
 'shrink-0 flex items-center gap-2 h-10 px-4 rounded-xl border text-[13px] font-semibold transition-all duration-300',
 activeFilterCount > 0
 ? 'bg-white text-[#C97856] border-[#C97856]/20 shadow-[0_4px_16px_rgba(201,120,86,0.08)]'
 : 'bg-white border-[#C97856]/8 text-text-muted hover:border-[#C97856]/20 hover:text-[#C97856]',
 )}
 >
 <SlidersHorizontal className="w-4 h-4" />
 Filters
 {activeFilterCount > 0 && (
 <span className="ml-0.5 w-5 h-5 rounded-full bg-[#C97856] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_2px_6px_rgba(201,120,86,0.25)]">
 {activeFilterCount}
 </span>
 )}
 </motion.button>

 <ShortcutBar
 filters={filters}
 onChangeFilters={(f) => handleApplyFilters(f)}
 activeMode={activeQuickFilter}
 onChangeMode={(id) => {
 const prev = activeQuickFilter;
 setActiveQuickFilter(id);
 if (prev !== id) {
 track('filter.changed', { surface: 'discover', from: prev, to: id });
 if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mio:filterchange', { detail: { surface: 'discover', from: prev, to: id } }));
 }
 }}
 />

 {/* v3.4 — Undo + Saved buttons */}
 <motion.button
 whileHover={actionHistory.length ? { scale: 1.03 } : undefined}
 whileTap={actionHistory.length ? { scale: 0.97 } : undefined}
 onClick={handleUndo}
 disabled={actionHistory.length === 0}
 title={actionHistory.length ? 'Undo last action' : 'No actions to undo'}
 className={cn(
 'shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border',
 actionHistory.length
 ? 'bg-white border-[#C97856]/20 text-[#C97856] hover:border-[#C97856]/40 shadow-[0_2px_8px_rgba(201,120,86,0.08)]'
 : 'bg-stone-50 border-stone-200 text-stone-300 cursor-not-allowed',
 )}
 >
 <Undo2 className="w-3.5 h-3.5" /> Undo
 </motion.button>

 <motion.button
 whileHover={{ scale: 1.03 }}
 whileTap={{ scale: 0.97 }}
 onClick={() => setShowDeferred(true)}
 title="View profiles you saved for later"
 className="shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border bg-white border-amber-200 text-amber-700 hover:border-amber-300 shadow-[0_2px_8px_rgba(180,140,40,0.08)]"
 >
 <Bookmark className="w-3.5 h-3.5" /> Saved
 {deferredCount > 0 && (
 <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
 {deferredCount}
 </span>
 )}
 </motion.button>
 </div>

 {/* ─── Profile Counter & Score ─── */}
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-3">
 <span className="text-[12px] text-text-muted font-semibold tabular-nums">
 {currentIndex + 1} <span className="text-text-secondary">of</span> {profiles.length}
 </span>
 <div className="flex -space-x-1">
 {profiles.slice(currentIndex, currentIndex + 4).map((p, i) => (
 <div key={p.id} className={cn(
 'w-6 h-6 rounded-full border-2 border-miamo-bg overflow-hidden',
 i === 0 ? 'ring-2 ring-white/20' : '',
 )} style={{ zIndex: 4 - i }}>
 {p.photos?.[0] ? (
 <img loading="lazy" src={p.photos[0].url || p.photos[0]} alt={`${p.displayName || 'Profile'} photo`} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full bg-miamo-card/10 flex items-center justify-center text-[8px] text-text-muted font-bold">{p.displayName?.[0]}</div>
 )}
 </div>
 ))}
 </div>
 </div>
 {aiData[currentUser.id] && (
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-miamo-surface border border-border"
 >
 <Brain className="w-3.5 h-3.5 text-text-muted" />
 <span className="text-[12px] font-bold text-text-secondary tabular-nums">{aiData[currentUser.id].score}%</span>
 <span className="text-[11px] text-text-muted font-medium">match</span>
 </motion.div>
 )}
 </div>

 {/* ─── Two Column Layout ─── */}
 <div className="flex gap-6 items-start">
 <div className="flex-1 min-w-0 max-w-[480px]">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentUser.id}
 initial={{ opacity: 0, y: 30, scale: 0.97, rotateX: 3 }}
 animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
 exit={{ opacity: 0, y: -30, scale: 0.95 }}
 transition={{ type: 'spring', stiffness: 300, damping: 30 }}
 className="tilt-3d"
 data-mio-profile-id={currentUser.id}
 >
 <ProfileCard
 user={currentUser}
 aiData={aiData[currentUser.id] || null}
 onPass={handlePass}
 onMove={handleMove}
 onLike={handleLike}
 onSuperLike={handleSuperLike}
 onSeeLater={handleSeeLater}
 isActive={true}
 />
 </motion.div>
 </AnimatePresence>
 </div>

 <div className="hidden lg:block w-[340px] flex-shrink-0 sticky top-6">
 <AnimatePresence mode="wait">
 <motion.div
 key={`ai-${currentUser.id}`}
 initial={{ opacity: 0, x: 24 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: 24 }}
 transition={{ duration: 0.35, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
 >
 <AiSidePanel
 user={currentUser}
 aiData={aiData[currentUser.id] || null}
 onSendMove={handleMove}
 loading={!aiData[currentUser.id]}
 />
 </motion.div>
 </AnimatePresence>
 </div>
 </div>
 </div>

 <FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={handleApplyFilters} />

 {/* v6.6 Deferred-pile modal */}
 <DeferredPileModal
 surface="discover"
 isOpen={showDeferred}
 onClose={() => setShowDeferred(false)}
 renderItem={(item) => (
 <div>
 <p className="text-[13px] font-semibold text-text-primary">Profile {item.targetId.slice(0, 8)}…</p>
 <p className="text-[10px] text-text-muted mt-1">
 Saved {new Date(item.deferredAt).toLocaleDateString()}
 </p>
 </div>
 )}
 />

 {/* Pass Feedback Modal */}
 <AnimatePresence>
 {passFeedback && (
 <PassFeedbackModal
 userName={passFeedback.name}
 onSubmit={(reason, details) => {
 api.passUserFeedback(passFeedback.userId, reason, details).catch(() => {});
 trackActivity('pass_feedback', 'profile', passFeedback.userId, { reason, details });
 setPassFeedback(null);
 }}
 onSkip={() => setPassFeedback(null)}
 />
 )}
 </AnimatePresence>
 </div>
 </ErrorBoundary>
 );
}

/* ─── Pass Feedback Modal ─── */
const PASS_REASONS = [
 { code: 'not-attractive', label: 'Not my type', icon: ThumbsDown },
 { code: 'too-far', label: 'Too far away', icon: MapPin },
 { code: 'fake-profile', label: 'Seems fake', icon: Camera },
 { code: 'no-effort', label: 'Low effort profile', icon: Ghost },
 { code: 'different-goals', label: 'Different goals', icon: UsersIcon },
];

function PassFeedbackModal({ userName, onSubmit, onSkip }: {
 userName: string;
 onSubmit: (reason: string, details: string) => void;
 onSkip: () => void;
}) {
 const [selected, setSelected] = useState('');
 const [details, setDetails] = useState('');

 return (
 <Portal>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onSkip} />
 <motion.div
 initial={{ opacity: 0, y: 40, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 40, scale: 0.95 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="fixed bottom-6 inset-x-4 max-w-sm mx-auto bg-miamo-card border border-border rounded-2xl shadow-2xl z-[60] p-5"
 >
 <div className="flex items-center justify-between mb-4">
 <div>
 <p className="text-[13px] font-bold text-text-primary">Why did you pass?</p>
 <p className="text-[11px] text-text-muted mt-0.5">Helps us show better matches</p>
 </div>
 <button onClick={onSkip} className="w-7 h-7 rounded-lg bg-miamo-surface flex items-center justify-center">
 <X className="w-3.5 h-3.5 text-text-muted" />
 </button>
 </div>
 <div className="flex flex-wrap gap-2 mb-3">
 {PASS_REASONS.map(r => {
 const Icon = r.icon;
 return (
 <button key={r.code} onClick={() => setSelected(r.code)}
 className={cn(
 'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-medium transition-all',
 selected === r.code ? 'bg-[#C97856]/10 border-[#C97856]/30 text-[#C97856]' : 'bg-miamo-surface border-border text-text-muted hover:border-border',
 )}>
 <Icon className="w-3 h-3" /> {r.label}
 </button>
 );
 })}
 </div>
 {selected && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
 <textarea value={details} onChange={e => setDetails(e.target.value)}
 placeholder="Tell us more (optional)..."
 className="w-full h-14 rounded-xl bg-miamo-surface border border-border text-text-primary text-[11px] px-3 py-2 resize-none focus:outline-none placeholder:text-text-muted mb-3" />
 </motion.div>
 )}
 <div className="flex gap-2">
 <button onClick={onSkip} className="flex-1 h-9 rounded-xl border border-border text-text-muted text-[11px] font-semibold hover:bg-miamo-surface transition">Skip</button>
 <button onClick={() => { if (selected) onSubmit(selected, details); else onSkip(); }}
 disabled={!selected}
 className={cn(
 'flex-1 h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all',
 selected ? 'bg-[#C97856] text-white' : 'bg-miamo-surface text-text-secondary cursor-not-allowed',
 )}>
 <Check className="w-3 h-3" /> Submit
 </button>
 </div>
 </motion.div>
 </Portal>
 );
}
