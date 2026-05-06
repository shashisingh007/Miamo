'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, X, MapPin, Briefcase, Shield, Brain, Star, Filter,
  ChevronDown, SlidersHorizontal, Sparkles, ArrowRight, Send,
  Zap, Eye, MessageSquare, Coffee, Wine, Cigarette, Dumbbell,
  GraduationCap, Baby, Dog, Moon, Globe, ChevronLeft, Check,
  TrendingUp, Target, Lightbulb, Users, BarChart3, Flame, ThumbsUp,
  CircleDot, Bookmark, Crown, Verified, Activity, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────── */
interface DiscoverProfile {
  id: string;
  displayName: string;
  verified?: boolean;
  photos: any[];
  profile?: any;
  interests?: any[];
  prompts?: any[];
  commonInterests?: string[];
  compatibilityScore?: number;
}

interface AiData {
  score: number;
  whyThisMatch: string[];
  moveRecommendations: { text: string; type: string; confidence: number }[];
  commonInterests: string[];
  breakdown?: Record<string, number>;
}

interface Filters {
  minAge: number;
  maxAge: number;
  minHeight: number | null;
  maxHeight: number | null;
  distance: number;
  city: string;
  genders: string;
  sexualities: string;
  lookingFor: string;
  smoking: string;
  drinking: string;
  exercise: string;
  education: string;
  religion: string;
  zodiac: string;
  pets: string;
  children: string;
  activeToday: boolean;
  newHere: boolean;
  verified: boolean;
  hasPhotos: boolean;
}

const DEFAULT_FILTERS: Filters = {
  minAge: 18, maxAge: 99, minHeight: null, maxHeight: null, distance: 50,
  city: '', genders: '', sexualities: '', lookingFor: '', smoking: '',
  drinking: '', exercise: '', education: '', religion: '', zodiac: '',
  pets: '', children: '', activeToday: false, newHere: false,
  verified: false, hasPhotos: false,
};

/* ═══════════════════════════════════════════════════════
   FILTER PANEL (Slide-out)
   ═══════════════════════════════════════════════════════ */
function FilterPanel({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void; filters: Filters;
  onApply: (f: Filters) => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);
  useEffect(() => { if (isOpen) setLocal(filters); }, [isOpen, filters]);
  const set = (key: keyof Filters, val: any) => setLocal(p => ({ ...p, [key]: val }));
  const toggleChip = (key: keyof Filters, val: string) => {
    const current = (local[key] as string || '').split(',').filter(Boolean);
    const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
    set(key, next.join(','));
  };
  const isChipActive = (key: keyof Filters, val: string) =>
    (local[key] as string || '').split(',').includes(val);

  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={cn(
      'px-3.5 py-2 rounded-full text-[11px] font-semibold tracking-wide transition-all border',
      active
        ? 'bg-white text-[#0d0d12] border-white shadow-[0_0_12px_rgba(236,64,122,0.15)]'
        : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70',
    )}>
      {label}
    </button>
  );

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] flex items-center gap-2">{icon}{title}</h4>
      {children}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] max-w-[92vw] bg-[#111118] border-l border-white/[0.06] z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#111118]/95 backdrop-blur-xl border-b border-white/[0.05] px-6 py-4 flex items-center justify-between z-10">
              <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <h3 className="text-sm font-bold text-white tracking-wide">Filters</h3>
              <button onClick={() => setLocal(DEFAULT_FILTERS)} className="text-[11px] text-lavender-400 hover:text-white transition-colors font-semibold">Reset</button>
            </div>
            <div className="px-6 py-6 space-y-7">
              <Section title="Quick Filters" icon={<Zap className="w-3 h-3 text-amber-400" />}>
                <div className="flex flex-wrap gap-2">
                  <Chip label="Active Today" active={local.activeToday} onClick={() => set('activeToday', !local.activeToday)} />
                  <Chip label="New Here" active={local.newHere} onClick={() => set('newHere', !local.newHere)} />
                  <Chip label="Verified" active={local.verified} onClick={() => set('verified', !local.verified)} />
                  <Chip label="Has Photos" active={local.hasPhotos} onClick={() => set('hasPhotos', !local.hasPhotos)} />
                </div>
              </Section>
              <Section title="Age Range" icon={<span className="text-[10px]">🎂</span>}>
                <div className="flex items-center gap-3">
                  <input type="number" value={local.minAge} onChange={e => set('minAge', parseInt(e.target.value) || 18)}
                    className="w-20 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-center text-sm focus:border-white/20 focus:outline-none" min={18} max={99} />
                  <span className="text-white/30 text-sm font-medium">to</span>
                  <input type="number" value={local.maxAge} onChange={e => set('maxAge', parseInt(e.target.value) || 99)}
                    className="w-20 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-center text-sm focus:border-white/20 focus:outline-none" min={18} max={99} />
                </div>
              </Section>
              <Section title="Height (cm)" icon={<span className="text-[10px]">📏</span>}>
                <div className="flex items-center gap-3">
                  <input type="number" value={local.minHeight || ''} onChange={e => set('minHeight', parseInt(e.target.value) || null)}
                    className="w-20 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-center text-sm focus:border-white/20 focus:outline-none" placeholder="Min" />
                  <span className="text-white/30 text-sm font-medium">to</span>
                  <input type="number" value={local.maxHeight || ''} onChange={e => set('maxHeight', parseInt(e.target.value) || null)}
                    className="w-20 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-center text-sm focus:border-white/20 focus:outline-none" placeholder="Max" />
                </div>
              </Section>
              <Section title="City" icon={<MapPin className="w-3 h-3 text-blue-400" />}>
                <input value={local.city} onChange={e => set('city', e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white px-4 text-sm focus:border-white/20 focus:outline-none placeholder:text-white/20" placeholder="Any city..." />
              </Section>
              <Section title="Show Me" icon={<span className="text-[10px]">👤</span>}>
                <div className="flex flex-wrap gap-2">
                  {['male', 'female', 'nonbinary'].map(g => (
                    <Chip key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} active={isChipActive('genders', g)} onClick={() => toggleChip('genders', g)} />
                  ))}
                </div>
              </Section>
              <Section title="Sexuality" icon={<span className="text-[10px]">🌈</span>}>
                <div className="flex flex-wrap gap-2">
                  {['straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'queer'].map(s => (
                    <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={isChipActive('sexualities', s)} onClick={() => toggleChip('sexualities', s)} />
                  ))}
                </div>
              </Section>
              <Section title="Looking For" icon={<Heart className="w-3 h-3 text-rose-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['long-term', 'short-term', 'casual', 'marriage', 'friendship', 'open'].map(l => (
                    <Chip key={l} label={l.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} active={isChipActive('lookingFor', l)} onClick={() => toggleChip('lookingFor', l)} />
                  ))}
                </div>
              </Section>
              <Section title="Smoking" icon={<Cigarette className="w-3 h-3 text-orange-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['never', 'sometimes', 'regularly'].map(s => (
                    <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={isChipActive('smoking', s)} onClick={() => toggleChip('smoking', s)} />
                  ))}
                </div>
              </Section>
              <Section title="Drinking" icon={<Wine className="w-3 h-3 text-purple-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['never', 'socially', 'regularly'].map(d => (
                    <Chip key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} active={isChipActive('drinking', d)} onClick={() => toggleChip('drinking', d)} />
                  ))}
                </div>
              </Section>
              <Section title="Exercise" icon={<Dumbbell className="w-3 h-3 text-green-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['never', 'sometimes', 'active', 'very-active'].map(e => (
                    <Chip key={e} label={e.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} active={isChipActive('exercise', e)} onClick={() => toggleChip('exercise', e)} />
                  ))}
                </div>
              </Section>
              <Section title="Education" icon={<GraduationCap className="w-3 h-3 text-blue-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['high-school', 'bachelors', 'masters', 'phd'].map(e => (
                    <Chip key={e} label={e.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} active={isChipActive('education', e)} onClick={() => toggleChip('education', e)} />
                  ))}
                </div>
              </Section>
              <Section title="Pets" icon={<Dog className="w-3 h-3 text-amber-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['none', 'dog', 'cat', 'both', 'other'].map(p => (
                    <Chip key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} active={isChipActive('pets', p)} onClick={() => toggleChip('pets', p)} />
                  ))}
                </div>
              </Section>
              <Section title="Children" icon={<Baby className="w-3 h-3 text-pink-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['none', 'have', 'want', 'maybe'].map(c => (
                    <Chip key={c} label={c.charAt(0).toUpperCase() + c.slice(1)} active={isChipActive('children', c)} onClick={() => toggleChip('children', c)} />
                  ))}
                </div>
              </Section>
              <Section title="Zodiac" icon={<Moon className="w-3 h-3 text-indigo-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].map(z => (
                    <Chip key={z} label={z} active={isChipActive('zodiac', z)} onClick={() => toggleChip('zodiac', z)} />
                  ))}
                </div>
              </Section>
              <Section title="Religion" icon={<span className="text-[10px]">🙏</span>}>
                <input value={local.religion} onChange={e => set('religion', e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white px-4 text-sm focus:border-white/20 focus:outline-none placeholder:text-white/20" placeholder="Any religion..." />
              </Section>
            </div>
            <div className="sticky bottom-0 bg-[#111118]/95 backdrop-blur-xl border-t border-white/[0.05] p-5 flex gap-3">
              <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-white/[0.1] text-white/60 text-sm font-semibold hover:bg-white/[0.04] transition-all">Cancel</button>
              <button onClick={() => { onApply(local); onClose(); }} className="flex-1 h-11 rounded-xl bg-white text-[#0d0d12] text-sm font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   PROFILE CARD — Premium Hinge-style
   ═══════════════════════════════════════════════════════ */
function ProfileCard({
  user, aiData, onPass, onMove, isActive,
}: {
  user: DiscoverProfile;
  aiData: AiData | null;
  onPass: () => void;
  onMove: (message: string, targetType: string, targetId?: string) => void;
  isActive: boolean;
}) {
  const [moveTarget, setMoveTarget] = useState<{ type: string; id?: string } | null>(null);
  const [moveText, setMoveText] = useState('');
  const [showMoveRecs, setShowMoveRecs] = useState(false);

  const photos = user.photos || [];
  const profile = user.profile || {};
  const prompts = user.prompts || [];
  const interests = user.interests || [];
  const commonInterests = user.commonInterests || [];

  const handleLikeContent = (type: string, id?: string) => {
    setMoveTarget({ type, id });
    setMoveText('');
    setShowMoveRecs(false);
  };

  const handleSendMove = () => {
    if (moveTarget) {
      onMove(moveText, moveTarget.type, moveTarget.id);
      setMoveTarget(null);
      setMoveText('');
    }
  };

  if (!isActive) return null;

  // Lifestyle items
  const lifestyleItems = [
    profile.smoking && { icon: Cigarette, label: profile.smoking, color: 'text-orange-400' },
    profile.drinking && { icon: Wine, label: profile.drinking, color: 'text-purple-400' },
    profile.exercise && { icon: Dumbbell, label: profile.exercise, color: 'text-emerald-400' },
    profile.education && { icon: GraduationCap, label: profile.education, color: 'text-blue-400' },
    profile.zodiac && { icon: Moon, label: profile.zodiac, color: 'text-indigo-400' },
    profile.languages && { icon: Globe, label: profile.languages, color: 'text-cyan-400' },
    profile.pets && profile.pets !== 'none' && { icon: Dog, label: profile.pets, color: 'text-amber-400' },
    profile.children && { icon: Baby, label: profile.children, color: 'text-pink-400' },
  ].filter(Boolean) as { icon: any; label: string; color: string }[];

  return (
    <div className="w-full">
      {/* Card container */}
      <div className="rounded-[20px] overflow-hidden bg-[#131320] border border-white/[0.06] shadow-[0_4px_40px_rgba(0,0,0,0.4)]">

        {/* ─── Main Photo ─── */}
        <div className="relative">
          {photos[0] ? (
            <div className="aspect-[3/4] max-h-[520px] overflow-hidden relative group">
              <img src={photos[0].url || photos[0]} alt={user.displayName}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131320] via-[#131320]/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 px-6 pb-6">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <h2 className="text-[28px] font-extrabold text-white tracking-tight leading-none">
                        {user.displayName}{profile.age ? `, ${profile.age}` : ''}
                      </h2>
                      {user.verified && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
                          className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#131320]" />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-white/70">
                      {profile.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{profile.city}
                        </span>
                      )}
                      {profile.profession && (
                        <span className="flex items-center gap-1 max-w-[200px] truncate">
                          <Briefcase className="w-3 h-3" />{profile.profession}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Like button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleLikeContent('photo', photos[0]?.id)}
                className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-white/[0.12] backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/25 transition-all shadow-lg"
              >
                <Heart className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          ) : (
            <div className="aspect-[3/4] max-h-[520px] bg-gradient-to-br from-lavender-400/10 to-violet-deep/10 flex items-center justify-center relative">
              <span className="text-8xl text-white/20 font-black">{user.displayName?.[0]}</span>
              <div className="absolute bottom-0 inset-x-0 px-6 pb-6">
                <h2 className="text-[28px] font-extrabold text-white">{user.displayName}{profile.age ? `, ${profile.age}` : ''}</h2>
              </div>
            </div>
          )}
        </div>

        {/* ─── Tags Row ─── */}
        <div className="px-6 pt-5 pb-1">
          <div className="flex flex-wrap gap-2">
            {profile.lookingFor && profile.lookingFor !== 'open' && (
              <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-white text-[#131320] shadow-[0_0_8px_rgba(255,255,255,0.1)]">
                {profile.lookingFor.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
            )}
            {profile.datingIntent && (
              <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-lavender-400/15 text-lavender-300 border border-lavender-400/20">
                {profile.datingIntent}
              </span>
            )}
            {profile.online && (
              <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-400/15 text-emerald-300 border border-emerald-400/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
              </span>
            )}
            {profile.height && (
              <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/[0.06] text-white/60 border border-white/[0.08]">
                {profile.height} cm
              </span>
            )}
          </div>
        </div>

        {/* ─── Bio ─── */}
        {profile.bio && (
          <div className="px-6 py-4">
            <p className="text-[14px] text-white/80 leading-[1.7] font-light">{profile.bio}</p>
          </div>
        )}

        {/* ─── Second Photo ─── */}
        {photos[1] && (
          <div className="mx-6 my-2 rounded-2xl overflow-hidden relative group">
            <img src={photos[1].url || photos[1]} alt="" className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => handleLikeContent('photo', photos[1]?.id)}
              className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/[0.12] backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/25 transition-all"
            >
              <Heart className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        )}

        {/* ─── Prompts ─── */}
        {prompts.map((prompt: any, i: number) => (
          <div key={i} className="mx-6 my-3">
            <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 group hover:border-white/[0.12] transition-all">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">
                {prompt.question}
              </p>
              <p className="text-[15px] text-white leading-[1.65] font-medium">
                {prompt.answer}
              </p>
              <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                onClick={() => handleLikeContent('prompt', prompt.id || `prompt-${i}`)}
                className="absolute -bottom-3 right-5 w-9 h-9 rounded-full bg-[#131320] border-2 border-white/[0.12] flex items-center justify-center hover:border-white/30 shadow-lg transition-all"
              >
                <Heart className="w-4 h-4 text-white/60 hover:text-white" />
              </motion.button>
            </div>
          </div>
        ))}

        {/* ─── Third Photo ─── */}
        {photos[2] && (
          <div className="mx-6 my-2 rounded-2xl overflow-hidden relative group">
            <img src={photos[2].url || photos[2]} alt="" className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => handleLikeContent('photo', photos[2]?.id)}
              className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/[0.12] backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/25 transition-all"
            >
              <Heart className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        )}

        {/* ─── Interests ─── */}
        {interests.length > 0 && (
          <div className="px-6 py-5">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {interests.map((int: any) => {
                const name = int.name || int;
                const isCommon = commonInterests.includes(name);
                return (
                  <span key={name} className={cn(
                    'px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all',
                    isCommon
                      ? 'bg-white text-[#131320] shadow-[0_0_10px_rgba(255,255,255,0.12)]'
                      : 'bg-white/[0.04] text-white/50 border border-white/[0.06]',
                  )}>
                    {isCommon && <Star className="w-3 h-3 inline mr-1 -mt-0.5" />}{name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Lifestyle Grid ─── */}
        {lifestyleItems.length > 0 && (
          <div className="px-6 pb-5">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3">Lifestyle</h4>
            <div className="grid grid-cols-2 gap-2">
              {lifestyleItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <Icon className={cn('w-3.5 h-3.5', item.color)} />
                    <span className="text-[12px] text-white/60 font-medium capitalize">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Pass Button ─── */}
        <div className="px-6 py-5 border-t border-white/[0.04]">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={onPass}
              className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
            >
              <X className="w-6 h-6 text-white/40 group-hover:text-red-400 transition-colors" />
            </motion.button>
            <p className="text-[12px] text-white/25 leading-relaxed">Like any photo or prompt to send a Miamo Move</p>
          </div>
        </div>
      </div>

      {/* ─── Miamo Move Overlay ─── */}
      <AnimatePresence>
        {moveTarget && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 p-5"
          >
            <div className="max-w-[480px] mx-auto bg-[#1a1a2e] border border-white/[0.1] rounded-[20px] shadow-[0_8px_60px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                      <Heart className="w-5 h-5 text-[#1a1a2e]" fill="#1a1a2e" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-white">Miamo Move</h4>
                      <p className="text-[11px] text-white/40">
                        {moveTarget.type === 'prompt' ? 'Liked their answer' : moveTarget.type === 'photo' ? 'Liked their photo' : 'Liked their profile'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setMoveTarget(null)} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    value={moveText}
                    onChange={e => setMoveText(e.target.value)}
                    placeholder="Write your move... or send blank"
                    className="w-full h-20 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] px-4 py-3 pr-14 resize-none focus:border-white/20 focus:outline-none placeholder:text-white/20"
                    autoFocus
                  />
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={handleSendMove}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.15)] hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] transition-all"
                  >
                    <Send className="w-4 h-4 text-[#1a1a2e]" />
                  </motion.button>
                </div>
                {/* AI suggestions toggle */}
                {aiData?.moveRecommendations && aiData.moveRecommendations.length > 0 && (
                  <div className="mt-3">
                    <button onClick={() => setShowMoveRecs(!showMoveRecs)}
                      className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/60 font-semibold transition-colors">
                      <Sparkles className="w-3 h-3" /> {showMoveRecs ? 'Hide' : 'Show'} AI suggestions
                      <ChevronDown className={cn('w-3 h-3 transition-transform', showMoveRecs && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {showMoveRecs && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2 space-y-1.5">
                          {aiData.moveRecommendations.slice(0, 5).map((rec, i) => (
                            <button key={i} onClick={() => { setMoveText(rec.text); setShowMoveRecs(false); }}
                              className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                              <p className="text-[12px] text-white/70 leading-relaxed">{rec.text}</p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AI SIDE PANEL — Clean, white-accented
   ═══════════════════════════════════════════════════════ */
function AiSidePanel({
  user, aiData, onSendMove, loading,
}: {
  user: DiscoverProfile;
  aiData: AiData | null;
  onSendMove: (message: string, targetType: string, targetId?: string) => void;
  loading: boolean;
}) {
  const [sentIndex, setSentIndex] = useState<number | null>(null);
  const [customText, setCustomText] = useState('');
  const [customSent, setCustomSent] = useState(false);

  const handleClickRec = (rec: { text: string; type: string }, idx: number) => {
    onSendMove(rec.text, 'profile');
    setSentIndex(idx);
    setTimeout(() => setSentIndex(null), 3000);
  };

  const handleCustomSend = () => {
    onSendMove(customText, 'profile');
    setCustomSent(true);
    setCustomText('');
    setTimeout(() => setCustomSent(false), 2000);
  };

  const profile = user.profile || {};

  const breakdownLabels: Record<string, string> = {
    interests: 'Interests', datingIntent: 'Intent', location: 'Location', age: 'Age',
    lifestyle: 'Lifestyle', values: 'Values', profileQuality: 'Profile', verification: 'Verified',
    activity: 'Activity', zodiac: 'Zodiac',
  };
  const breakdownMaxes: Record<string, number> = {
    interests: 25, datingIntent: 20, location: 10, age: 10,
    lifestyle: 15, values: 10, profileQuality: 10, verification: 5, activity: 10, zodiac: 5,
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
            <div className="h-3 bg-white/[0.06] rounded-full animate-pulse w-1/2 mb-4" />
            <div className="space-y-2.5">
              <div className="h-2.5 bg-white/[0.04] rounded-full animate-pulse" />
              <div className="h-2.5 bg-white/[0.03] rounded-full animate-pulse w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!aiData) return null;

  const scoreColor = aiData.score >= 70 ? 'text-emerald-400' : aiData.score >= 40 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = aiData.score >= 70 ? 'from-emerald-400/10' : aiData.score >= 40 ? 'from-amber-400/10' : 'from-rose-400/10';

  const breakdownEntries = aiData.breakdown
    ? Object.entries(aiData.breakdown).filter(([_, v]) => (v as number) >= 0).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5)
    : [];

  const topMoves = aiData.moveRecommendations?.slice(0, 2) || [];
  const restMoves = aiData.moveRecommendations?.slice(2) || [];

  return (
    <div className="space-y-3">
      {/* ── AI Compatibility ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl bg-gradient-to-b ${scoreBg} to-transparent border border-white/[0.06] overflow-hidden`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center">
                <Brain className="w-4 h-4 text-white/80" />
              </div>
              <span className="text-[13px] font-bold text-white tracking-wide">AI Compatibility</span>
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              className={`text-2xl font-black ${scoreColor}`}
            >
              {aiData.score}%
            </motion.span>
          </div>
          {breakdownEntries.length > 0 && (
            <div className="space-y-3">
              {breakdownEntries.map(([key, val], bIdx) => {
                const max = breakdownMaxes[key] || 25;
                const pct = Math.round(((val as number) / max) * 100);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/40 font-semibold">{breakdownLabels[key] || key}</span>
                      <span className="text-[11px] text-white/60 font-bold tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.15 + bIdx * 0.08, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full bg-white"
                        style={{ opacity: Math.max(0.3, pct / 100) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Why This Match ── */}
      {aiData.whyThisMatch?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-lavender-400/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-lavender-400" />
            </div>
            <span className="text-[13px] font-bold text-white tracking-wide">Why this match?</span>
          </div>
          <div className="space-y-3">
            {aiData.whyThisMatch.map((reason, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-white/60">{i + 1}</span>
                </div>
                <p className="text-[12px] text-white/60 leading-[1.7] font-medium">{reason}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Top Move Cards ── */}
      {topMoves.map((rec, i) => {
        const isSent = sentIndex === i;
        const labels = ['Best conversation starter...', "Show genuine interest..."];
        return (
          <motion.button
            key={`move-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.1 }}
            onClick={() => !isSent && handleClickRec(rec, i)}
            disabled={isSent}
            className={cn(
              'w-full text-left rounded-2xl p-5 border transition-all group',
              isSent
                ? 'bg-emerald-400/[0.06] border-emerald-400/20'
                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]',
            )}
          >
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.12em] mb-2">
              {isSent ? '✓ Move sent!' : labels[i] || `Suggested move`}
            </p>
            <p className={cn(
              'text-[14px] leading-[1.65] font-medium',
              isSent ? 'text-emerald-300' : 'text-white/80',
            )}>
              {rec.text}
            </p>
            {!isSent && (
              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center">
                  <Send className="w-3 h-3 text-white/50" />
                </div>
                <span className="text-[10px] text-white/30 font-semibold">Click to send</span>
              </div>
            )}
          </motion.button>
        );
      })}

      {/* ── More Suggestions (collapsed) ── */}
      {restMoves.length > 0 && (
        <MoreMovesSection moves={restMoves} startIndex={2} sentIndex={sentIndex} onSend={handleClickRec} />
      )}

      {/* ── Trust & Safety ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Shield className="w-4 h-4 text-white/80" />
          </div>
          <span className="text-[13px] font-bold text-white tracking-wide">Trust & Safety</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-2 h-2 rounded-full', user.verified ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'bg-amber-400')} />
            <span className="text-[12px] text-white/50 font-medium">
              {user.verified ? (
                <>Identity <span className="px-2 py-0.5 bg-white/[0.08] text-white/80 rounded-md text-[10px] font-bold ml-1">VERIFIED</span></>
              ) : 'Not yet verified'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            <span className="text-[12px] text-white/50 font-medium">No reports</span>
          </div>
          {profile.profileScore && (
            <div className="flex items-center gap-2.5">
              <div className={cn('w-2 h-2 rounded-full', profile.profileScore >= 80 ? 'bg-emerald-400' : profile.profileScore >= 60 ? 'bg-amber-400' : 'bg-rose-400')} />
              <span className="text-[12px] text-white/50 font-medium">Profile {profile.profileScore}% complete</span>
            </div>
          )}
          {profile.online && (
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[12px] text-white/50 font-medium">Currently online</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Custom Move ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white/80" />
          </div>
          <span className="text-[13px] font-bold text-white tracking-wide">Write Your Move</span>
        </div>
        <div className="relative">
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder={`Say something to ${user.displayName}...`}
            className="w-full h-[60px] rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-[12px] px-4 py-3 pr-12 resize-none focus:border-white/[0.15] focus:outline-none placeholder:text-white/15 transition-colors"
          />
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={handleCustomSend}
            disabled={customSent}
            className={cn(
              'absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all',
              customSent ? 'bg-emerald-400/20' : 'bg-white hover:shadow-[0_0_12px_rgba(255,255,255,0.2)]',
            )}>
            {customSent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5 text-[#131320]" />}
          </motion.button>
        </div>
        <p className="text-[10px] text-white/20 mt-2 font-medium">Or send blank — just press send</p>
      </motion.div>
    </div>
  );
}

/* ─── More Moves Section (collapsible) ──────────────── */
function MoreMovesSection({
  moves, startIndex, sentIndex, onSend,
}: {
  moves: { text: string; type: string; confidence: number }[];
  startIndex: number;
  sentIndex: number | null;
  onSend: (rec: { text: string; type: string }, idx: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors">
        <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.12em] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-lavender-400/60" /> {moves.length} more suggestions
        </span>
        <ChevronDown className={cn('w-4 h-4 text-white/20 transition-transform', expanded && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4 space-y-2">
              {moves.map((rec, i) => {
                const idx = startIndex + i;
                const isSent = sentIndex === idx;
                return (
                  <button key={i} onClick={() => !isSent && onSend(rec, idx)} disabled={isSent}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border transition-all',
                      isSent ? 'bg-emerald-400/[0.06] border-emerald-400/20' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.1]',
                    )}>
                    <p className={cn('text-[12px] leading-relaxed', isSent ? 'text-emerald-300' : 'text-white/60')}>{rec.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-white/25 capitalize font-medium">{rec.type.replace(/-/g, ' ')}</span>
                      <div className="flex gap-[3px]">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div key={j} className={cn('w-[5px] h-[5px] rounded-full', j < Math.round(rec.confidence * 5) ? 'bg-white/40' : 'bg-white/[0.06]')} />
                        ))}
                      </div>
                      {isSent && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
    return p;
  }, []);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildParams(filters, activeQuickFilter);
      const res = await api.getDiscover(params);
      setProfiles(res.data || []);
      setCurrentIndex(0);
    } catch { setProfiles([]); }
    finally { setLoading(false); }
  }, [filters, activeQuickFilter, buildParams]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const currentUser = profiles[currentIndex];
  useEffect(() => {
    if (!currentUser || aiData[currentUser.id]) return;
    api.getAiScore(currentUser.id).then(res => {
      setAiData(prev => ({ ...prev, [currentUser.id]: res.data }));
    }).catch(() => {});
  }, [currentUser?.id]);

  const handlePass = () => {
    api.passUser().catch(() => {});
    if (currentIndex < profiles.length - 1) setCurrentIndex(i => i + 1);
    else setProfiles([]);
  };

  const handleMove = async (message: string, targetType: string, targetId?: string) => {
    if (!currentUser) return;
    try {
      await api.sendMiamoMove(currentUser.id, message, targetType, targetId);
    } catch {
      try { await api.sendLike(currentUser.id, targetType, targetId); } catch {}
    }
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

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'minAge' && v === 18) return false;
    if (k === 'maxAge' && v === 99) return false;
    if (k === 'distance' && v === 50) return false;
    return v !== '' && v !== null && v !== false;
  }).length;

  /* ─── Loading State ─── */
  if (loading) {
    return <MiamoLoader text="Finding amazing people..." />;
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
          <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8 text-white/15" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No more profiles</h3>
          <p className="text-[13px] text-white/30 mb-6 leading-relaxed">Check back later or adjust your filters</p>
          <button onClick={() => setShowFilters(true)}
            className="h-11 px-6 rounded-xl bg-white text-[#0d0d12] text-sm font-bold hover:bg-white/90 transition-all inline-flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Adjust Filters
          </button>
        </motion.div>
      </div>
    );
  }

  return (
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
                ? 'bg-white text-[#0d0d12] border-white shadow-[0_0_16px_rgba(236,64,122,0.1)]'
                : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]',
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
                      ? 'bg-white/[0.1] border-white/[0.15] text-white'
                      : 'bg-transparent border-white/[0.05] text-white/30 hover:text-white/50 hover:border-white/[0.1]',
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
            <span className="text-[12px] text-white/25 font-semibold tabular-nums">
              {currentIndex + 1} <span className="text-white/15">of</span> {profiles.length}
            </span>
            <div className="flex -space-x-1">
              {profiles.slice(currentIndex, currentIndex + 4).map((p, i) => (
                <div key={p.id} className={cn(
                  'w-6 h-6 rounded-full border-2 border-miamo-bg overflow-hidden',
                  i === 0 ? 'ring-2 ring-white/20' : '',
                )} style={{ zIndex: 4 - i }}>
                  {p.photos?.[0] ? (
                    <img src={p.photos[0].url || p.photos[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-[8px] text-white/40 font-bold">{p.displayName?.[0]}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {aiData[currentUser.id] && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
            >
              <Brain className="w-3.5 h-3.5 text-white/50" />
              <span className="text-[12px] font-bold text-white/70 tabular-nums">{aiData[currentUser.id].score}%</span>
              <span className="text-[11px] text-white/25 font-medium">match</span>
            </motion.div>
          )}
        </div>

        {/* ─── Two Column Layout ─── */}
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 max-w-[480px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentUser.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              >
                <ProfileCard
                  user={currentUser}
                  aiData={aiData[currentUser.id] || null}
                  onPass={handlePass}
                  onMove={handleMove}
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
  );
}
