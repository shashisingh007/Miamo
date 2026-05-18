'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarHeart, MapPin, Clock, Star, Sparkles, Heart, Coffee, Wine,
  UtensilsCrossed, Music, Palette, TreePine, Film, Gamepad2,
  ChevronRight, Check, Plus, Send, X, Flame, Gift, Camera,
  Sunrise, Sunset, Moon, Sun, CloudSun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Badge, Avatar, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useTrackPageView, useTrackScrollDepth, trackClick } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';

/* ═══ Types ═══ */
interface DatePlan {
  id: string;
  matchName: string;
  matchPhoto?: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  vibe: string;
  budget: string;
  notes: string;
  confirmed: boolean;
  activities: string[];
}

/* ═══ Constants ═══ */
const DATE_VIBES = [
  { id: 'romantic', label: 'Romantic', emoji: '🌹', color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50' },
  { id: 'adventurous', label: 'Adventurous', emoji: '🏔️', color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
  { id: 'chill', label: 'Chill & Cozy', emoji: '☕', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
  { id: 'luxe', label: 'Luxe Night', emoji: '✨', color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50' },
  { id: 'creative', label: 'Creative', emoji: '🎨', color: 'from-sky-400 to-blue-500', bg: 'bg-sky-50' },
  { id: 'playful', label: 'Playful', emoji: '🎮', color: 'from-pink-400 to-fuchsia-500', bg: 'bg-pink-50 dark:bg-pink-950/30' },
];

const VENUES = [
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: 'text-orange-500' },
  { id: 'cafe', label: 'Café', icon: Coffee, color: 'text-amber-600' },
  { id: 'bar', label: 'Bar & Drinks', icon: Wine, color: 'text-violet-500' },
  { id: 'park', label: 'Park / Nature', icon: TreePine, color: 'text-emerald-500' },
  { id: 'cinema', label: 'Cinema', icon: Film, color: 'text-sky-500' },
  { id: 'concert', label: 'Concert / Live', icon: Music, color: 'text-pink-500' },
  { id: 'gallery', label: 'Art Gallery', icon: Palette, color: 'text-indigo-500' },
  { id: 'arcade', label: 'Arcade / Games', icon: Gamepad2, color: 'text-fuchsia-500' },
];

const TIMES_OF_DAY = [
  { id: 'morning', label: 'Morning', icon: Sunrise, time: '9:00 AM', color: 'text-amber-500' },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, time: '2:00 PM', color: 'text-orange-500' },
  { id: 'golden', label: 'Golden Hour', icon: Sunset, time: '5:00 PM', color: 'text-rose-500' },
  { id: 'evening', label: 'Evening', icon: CloudSun, time: '7:00 PM', color: 'text-violet-500' },
  { id: 'night', label: 'Night Out', icon: Moon, time: '9:00 PM', color: 'text-indigo-500' },
];

const BUDGETS = ['💸 Budget-Friendly', '💰 Moderate', '💎 Splurge', '👑 No Limit'];

const FUN_ACTIVITIES = [
  'Take cute photos together 📸', 'Try a new cuisine 🍜', 'Watch the sunset 🌅',
  'Play 20 questions 🎯', 'Share dessert 🍰', 'Stargazing 🌟',
  'Cook together 👨‍🍳', 'Dance in the rain 🌧️', 'Write love notes 💌',
  'Build a playlist together 🎵', 'Do a photo challenge 📷', 'Try couple yoga 🧘',
];

/* ═══ Animated Background ═══ */
function FloatingHearts() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-pink-200/30"
          initial={{ x: `${10 + i * 12}%`, y: '110%', rotate: 0, scale: 0.5 + Math.random() * 0.5 }}
          animate={{ y: '-10%', rotate: 360, scale: [0.5, 1, 0.5] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i * 1.5, ease: 'linear' }}
        >
          <Heart className="w-6 h-6" fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
}

/* ═══ Step Indicator ═══ */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ scale: i === current ? 1.2 : 1, opacity: i <= current ? 1 : 0.3 }}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            i === current ? 'w-8 bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-200' :
            i < current ? 'w-2 bg-pink-400' : 'w-2 bg-gray-200 dark:bg-gray-700'
          )}
        />
      ))}
    </div>
  );
}

/* ═══ Main Page ═══ */
export default function DatePlannerPage() {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [creating, setCreating] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  useTrackPageView('date-planner');
  useTrackScrollDepth('date-planner');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [selectedVibe, setSelectedVibe] = useState<string>('');
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    api.getMatches().then(r => setMatches(r.data || [])).catch(() => {});
  }, []);

  const resetForm = () => {
    setStep(0); setSelectedMatch(null); setSelectedVibe(''); setSelectedVenue('');
    setSelectedTime(''); setSelectedBudget(''); setSelectedActivities([]); setNotes('');
  };

  const handleCreate = () => {
    const plan: DatePlan = {
      id: `plan-${Date.now()}`,
      matchName: selectedMatch?.matchedUser?.displayName || selectedMatch?.displayName || 'Someone special',
      matchPhoto: selectedMatch?.matchedUser?.photos?.[0]?.url || selectedMatch?.photos?.[0]?.url,
      date: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 7) + 1)).toLocaleDateString(),
      time: TIMES_OF_DAY.find(t => t.id === selectedTime)?.time || '7:00 PM',
      venue: VENUES.find(v => v.id === selectedVenue)?.label || 'Surprise',
      category: selectedVenue,
      vibe: selectedVibe,
      budget: selectedBudget,
      notes,
      confirmed: false,
      activities: selectedActivities,
    };
    setPlans(prev => [plan, ...prev]);
    setShowCelebration(true);
    setTimeout(() => { setShowCelebration(false); setCreating(false); resetForm(); }, 2500);
  };

  const toggleActivity = (a: string) => {
    setSelectedActivities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const totalSteps = 5;

  return (
    <ErrorBoundary>
    <div className="max-w-4xl mx-auto p-6 pb-24 relative">
      <FloatingHearts />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-xl shadow-pink-200/50"
          >
            <CalendarHeart className="w-7 h-7 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Date Planner</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">Plan the perfect date experience ✨</p>
          </div>
          <div className="ml-auto">
            <Button onClick={() => { setCreating(true); resetForm(); }} className="gap-2 shadow-lg shadow-pink-200/40">
              <Plus className="w-4 h-4" /> Plan a Date
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Create Date Flow */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCreating(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 30 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black text-gray-800 dark:text-gray-200">Plan Your Date</h2>
                  <button onClick={() => setCreating(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:bg-gray-700 transition-all">
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <StepIndicator current={step} total={totalSteps} />
              </div>

              {/* Steps */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <AnimatePresence mode="wait">
                  {/* Step 0: Choose your match */}
                  {step === 0 && (
                    <motion.div key="s0" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Who&apos;s the lucky one? 💕</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Choose a match to plan a date with</p>
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {matches.map((m: any) => {
                          const user = m.matchedUser || m;
                          const photo = user.photos?.[0]?.url || user.photos?.[0]?.imageUrl;
                          const selected = selectedMatch?.id === m.id;
                          return (
                            <motion.button key={m.id} whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
                              onClick={() => setSelectedMatch(m)}
                              className={cn('flex items-center gap-3 w-full p-3 rounded-2xl transition-all text-left border-2',
                                selected ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30 shadow-lg shadow-pink-100' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700')}
                            >
                              <Avatar src={photo} name={user.displayName || 'Match'} size="md" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{user.displayName || 'Match'}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">@{user.username || 'user'}</p>
                              </div>
                              {selected && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-8 h-8 rounded-full bg-pink-50 dark:bg-pink-950/300 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                        {matches.length === 0 && (
                          <div className="text-center py-8">
                            <Heart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400 dark:text-gray-500">No matches yet. Get swiping!</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 1: Choose vibe */}
                  {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Set the vibe 🎭</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">What kind of energy are you going for?</p>
                      <div className="grid grid-cols-2 gap-3">
                        {DATE_VIBES.map(vibe => (
                          <motion.button key={vibe.id} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedVibe(vibe.id)}
                            className={cn('p-4 rounded-2xl border-2 text-center transition-all', vibe.bg,
                              selectedVibe === vibe.id ? 'border-pink-400 shadow-lg' : 'border-transparent')}
                          >
                            <motion.span className="text-3xl block mb-2" animate={selectedVibe === vibe.id ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
                              transition={{ duration: 0.5 }}>{vibe.emoji}</motion.span>
                            <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{vibe.label}</p>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Choose venue */}
                  {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Pick a spot 📍</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Where do you want to go?</p>
                      <div className="grid grid-cols-2 gap-3">
                        {VENUES.map(v => {
                          const Icon = v.icon;
                          const sel = selectedVenue === v.id;
                          return (
                            <motion.button key={v.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedVenue(v.id)}
                              className={cn('p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all',
                                sel ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30 shadow-lg' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700')}
                            >
                              <motion.div animate={sel ? { rotateY: 360 } : {}} transition={{ duration: 0.6 }}
                                className={cn('w-12 h-12 rounded-xl flex items-center justify-center', sel ? 'bg-pink-100' : 'bg-gray-50 dark:bg-gray-800')}>
                                <Icon className={cn('w-6 h-6', v.color)} />
                              </motion.div>
                              <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">{v.label}</p>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Time & Budget */}
                  {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">When & How? ⏰</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Pick the perfect time</p>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {TIMES_OF_DAY.map(t => {
                            const Icon = t.icon;
                            const sel = selectedTime === t.id;
                            return (
                              <motion.button key={t.id} whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedTime(t.id)}
                                className={cn('flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all',
                                  sel ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                                <Icon className={cn('w-4 h-4', t.color)} />
                                <span className="text-sm font-semibold">{t.label}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">Budget 💰</p>
                          <div className="flex flex-wrap gap-2">
                            {BUDGETS.map(b => (
                              <motion.button key={b} whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedBudget(b)}
                                className={cn('px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                                  selectedBudget === b ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30 text-pink-700' : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                                {b}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Activities & Notes */}
                  {step === 4 && (
                    <motion.div key="s4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
                      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Fun Extras 🎉</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Add activities to make it special</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {FUN_ACTIVITIES.map(a => (
                          <motion.button key={a} whileTap={{ scale: 0.9 }}
                            onClick={() => toggleActivity(a)}
                            className={cn('px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all',
                              selectedActivities.includes(a) ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30 text-pink-700' : 'border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                            {a}
                          </motion.button>
                        ))}
                      </div>
                      <textarea
                        value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Any special notes or surprises? 💝"
                        className="w-full p-3 rounded-xl border border-pink-100 bg-pink-50 dark:bg-pink-950/30/30 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-pink-200"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation buttons */}
              <div className="p-6 pt-0 flex gap-3">
                {step > 0 && (
                  <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">Back</Button>
                )}
                {step < totalSteps - 1 ? (
                  <Button onClick={() => setStep(s => s + 1)} className="flex-1 gap-2"
                    disabled={step === 0 && !selectedMatch}>
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={handleCreate} className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg">
                    <CalendarHeart className="w-4 h-4" /> Create Date Plan
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md flex items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} className="text-center">
              <motion.div animate={{ rotate: [0, 360], scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: 2 }}
                className="text-8xl mb-4">🎉</motion.div>
              <motion.h2 initial={{ y: 20 }} animate={{ y: 0 }} className="text-3xl font-black text-white mb-2">
                Date Planned!
              </motion.h2>
              <p className="text-white/70 text-lg">Get ready for something magical ✨</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Plans */}
      <div className="relative z-10 space-y-4">
        {plans.length > 0 && (
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" /> Your Date Plans
          </h2>
        )}
        {plans.map((plan, i) => {
          const vibe = DATE_VIBES.find(v => v.id === plan.vibe);
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card hover className="p-5 relative overflow-hidden">
                <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-20 bg-gradient-to-br', vibe?.color || 'from-pink-400 to-rose-500')} />
                <div className="flex items-start gap-4">
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}
                    className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg', vibe?.bg || 'bg-pink-50 dark:bg-pink-950/30')}>
                    {vibe?.emoji || '💕'}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-800 dark:text-gray-200">{vibe?.label || 'Date'} with {plan.matchName}</h3>
                      <Badge variant="default">{plan.venue}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-2">
                      <span className="flex items-center gap-1"><CalendarHeart className="w-3 h-3" /> {plan.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {plan.time}</span>
                      <span>{plan.budget}</span>
                    </div>
                    {plan.activities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {plan.activities.map(a => (
                          <span key={a} className="px-2 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/30 text-[10px] font-semibold text-pink-600">{a}</span>
                        ))}
                      </div>
                    )}
                    {plan.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">&ldquo;{plan.notes}&rdquo;</p>}
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, confirmed: !p.confirmed } : p))}
                    className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                      plan.confirmed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-300 hover:text-pink-500')}>
                    <Check className="w-5 h-5" />
                  </motion.button>
                </div>
              </Card>
            </motion.div>
          );
        })}

        {plans.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <EmptyState
              icon={<motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <CalendarHeart className="w-12 h-12 text-pink-300" />
              </motion.div>}
              title="Plan Your Perfect Date"
              description="Create a custom date plan with your match — choose the vibe, venue, time, and fun activities!"
              action={<Button onClick={() => { setCreating(true); resetForm(); }} className="gap-2 shadow-lg">
                <Plus className="w-4 h-4" /> Create First Date Plan
              </Button>}
            />
          </motion.div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
