'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Shield, Brain, SlidersHorizontal, Sparkles, Zap, Eye,
} from 'lucide-react';
import { ProfileCardSkeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackActivity, useTrackScrollDepth, useTrackPhotoViews } from '@/hooks/useTrackActivity';
import { type DiscoverProfile, type AiData, type Filters, DEFAULT_FILTERS } from './components/constants';
import { FilterPanel } from './components/FilterPanel';
import { ProfileCard } from './components/ProfileCard';
import { AiSidePanel } from './components/AiSidePanel';

/* ═══════════════════════════════════════════════════════
   MAIN DISCOVER PAGE
   ═══════════════════════════════════════════════════════ */
export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [aiData, setAiData] = useState<Record<string, AiData>>({});
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');
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
      const res = await api.getDiscover(params);
      const data = res.data || [];
      setProfiles(data);
      setCurrentIndex(0);
    } catch (err) {
      setProfiles([]);
      if (typeof window !== 'undefined') {
        console.error('[Discover] Failed to load profiles:', err);
      }
    }
    finally { setLoading(false); }
  }, [filters, activeQuickFilter, buildParams]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

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
      trackActivity('pass', 'profile', passedUser.id);
      api.passUser(passedUser.id).catch(() => {});
    }
    if (currentIndex < profiles.length - 1) setCurrentIndex(i => i + 1);
    else setProfiles([]);
  };

  const handleMove = async (message: string, targetType: string, targetId?: string) => {
    if (!currentUser) return;
    trackActivity('like', 'profile', currentUser.id);
    try {
      await api.sendMiamoMove(currentUser.id, message, targetType, targetId);
      toast.love('Move sent!', `Your move to ${currentUser.displayName} was delivered`);
    } catch {
      try { await api.sendLike(currentUser.id, targetType, targetId); toast.success('Like sent!'); } catch { toast.error('Failed to send'); }
    }
    if (currentIndex < profiles.length - 1) setCurrentIndex(i => i + 1);
    else setProfiles([]);
  };

  const handleSuperLike = async () => {
    if (!currentUser) return;
    trackActivity('super_like', 'profile', currentUser.id);
    try { await api.superLikeUser(currentUser.id); toast.love('Super Like!', `${currentUser.displayName} will see your Super Like`); } catch { toast.error('Super Like failed'); }
    if (currentIndex < profiles.length - 1) setCurrentIndex(i => i + 1);
    else setProfiles([]);
  };

  const handleApplyFilters = async (newFilters: Filters) => {
    setFilters(newFilters);
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

  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([k, v]) => {
    if (k === 'minAge' && v === 18) return false;
    if (k === 'maxAge' && v === 99) return false;
    if (k === 'distance' && v === 50) return false;
    return v !== '' && v !== null && v !== false;
  }).length, [filters]);

  /* ─── Loading State ─── */
  if (loading) {
    return <ProfileCardSkeleton />;
  }

  /* ─── Empty State ─── */
  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm px-8"
        >
          <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No more profiles</h3>
          <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-6 leading-relaxed">Check back later or adjust your filters</p>
          <button onClick={() => setShowFilters(true)}
            className="h-11 px-6 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-bold hover:bg-white/90 dark:hover:bg-gray-700 transition-all inline-flex items-center gap-2 shadow-lg">
            <SlidersHorizontal className="w-4 h-4" /> Adjust Filters
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1080px] mx-auto px-6 py-6">

        {/* ─── Top Bar ─── */}
        <div className="flex items-center gap-3 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(true)}
            className={cn(
              'flex items-center gap-2 h-10 px-4 rounded-xl border text-[13px] font-semibold transition-all',
              activeFilterCount > 0
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-white dark:border-gray-700 shadow-[0_0_16px_rgba(236,64,122,0.1)]'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-5 h-5 rounded-full bg-lavender-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </motion.button>

          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
            {quickFilters.map(f => {
              const Icon = f.icon;
              const isActive = activeQuickFilter === f.id;
              return (
                <motion.button
                  key={f.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveQuickFilter(f.id)}
                  className={cn(
                    'flex items-center gap-1.5 h-10 px-4 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border',
                    isActive
                      ? 'chip-glass-active'
                      : 'chip-glass text-gray-500 dark:text-gray-400',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {f.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ─── Profile Counter & Score ─── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-gray-400 dark:text-gray-500 font-semibold tabular-nums">
              {currentIndex + 1} <span className="text-gray-300 dark:text-gray-600">of</span> {profiles.length}
            </span>
            <div className="flex -space-x-1">
              {profiles.slice(currentIndex, currentIndex + 4).map((p, i) => (
                <div key={p.id} className={cn(
                  'w-6 h-6 rounded-full border-2 border-miamo-bg overflow-hidden',
                  i === 0 ? 'ring-2 ring-white/20' : '',
                )} style={{ zIndex: 4 - i }}>
                  {p.photos?.[0] ? (
                    <img loading="lazy" src={p.photos[0].url || p.photos[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/10 dark:bg-gray-700/30 flex items-center justify-center text-[8px] text-gray-400 dark:text-gray-500 font-bold">{p.displayName?.[0]}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {aiData[currentUser.id] && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <Brain className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-[12px] font-bold text-gray-700 dark:text-gray-300 tabular-nums">{aiData[currentUser.id].score}%</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">match</span>
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
              >
                <ProfileCard
                  user={currentUser}
                  aiData={aiData[currentUser.id] || null}
                  onPass={handlePass}
                  onMove={handleMove}
                  onSuperLike={handleSuperLike}
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
    </div>
    </ErrorBoundary>
  );
}
