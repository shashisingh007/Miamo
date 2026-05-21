'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 AudioLines, Sparkles, Heart, Zap, Music, Smile, Frown, Meh,
 ThumbsUp, ThumbsDown, Star, Sun, Cloud, CloudRain, Rainbow,
 Flame, Snowflake, Wind, ChevronRight, RotateCcw, Send, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';

/* ═══ Mood Emojis ═══ */
const MOODS = [
 { id: 'ecstatic', emoji: '🤩', label: 'Ecstatic', color: 'from-amber-400 to-yellow-500', wave: '#fbbf24' },
 { id: 'happy', emoji: '😊', label: 'Happy', color: 'from-emerald-400 to-green-500', wave: '#34d399' },
 { id: 'flirty', emoji: '😏', label: 'Flirty', color: 'from-rose-main to-rose-500', wave: '#f472b6' },
 { id: 'chill', emoji: '😌', label: 'Chill', color: 'from-sky-400 to-blue-500', wave: '#38bdf8' },
 { id: 'curious', emoji: '🤔', label: 'Curious', color: 'from-violet-400 to-purple-500', wave: '#a78bfa' },
 { id: 'nervous', emoji: '😅', label: 'Nervous', color: 'from-orange-400 to-amber-500', wave: '#fb923c' },
 { id: 'meh', emoji: '😐', label: 'Meh', color: 'from-border-light to-miamo-elevated', wave: '#94a3b8' },
 { id: 'romantic', emoji: '🥰', label: 'Romantic', color: 'from-rose-400 to-rose-main', wave: '#fb7185' },
];

const VIBE_QUESTIONS = [
 { q: 'Right now I feel...', type: 'mood' },
 { q: 'My dating energy today is...', type: 'energy', options: [
 { emoji: '🔥', label: 'On fire', value: 5 },
 { emoji: '⚡', label: 'Energized', value: 4 },
 { emoji: '✨', label: 'Sparkling', value: 3 },
 { emoji: '🌊', label: 'Flowing', value: 2 },
 { emoji: '🌙', label: 'Low-key', value: 1 },
 ]},
 { q: 'I want to talk about...', type: 'topics', options: [
 '🌍 Travel plans', '🎬 Movies & shows', '🍕 Food adventures',
 '🎵 Music taste', '💭 Dreams & goals', '😂 Funny stories',
 '📚 Deep thoughts', '🎮 Gaming / hobbies', '💪 Fitness & wellness',
 ]},
 { q: 'Today I\'m looking for...', type: 'intent', options: [
 { emoji: '💕', label: 'Romance' },
 { emoji: '😂', label: 'Laughs' },
 { emoji: '🧠', label: 'Deep talk' },
 { emoji: '🎉', label: 'Adventure' },
 { emoji: '☕', label: 'Chill vibes' },
 { emoji: '🤗', label: 'Comfort' },
 ]},
];

/* ═══ Animated Wave ═══ */
function VibeWave({ color, intensity }: { color: string; intensity: number }) {
 return (
 <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden opacity-30">
 {[...Array(3)].map((_, i) => (
 <motion.div
 key={i}
 className="absolute bottom-0 left-0 right-0"
 style={{ height: 40 + i * 15 }}
 animate={{ x: [0, -50, 0, 50, 0] }}
 transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
 >
 <svg viewBox="0 0 1440 100" className="w-[200%] h-full" preserveAspectRatio="none">
 <path d={`M0,${40 + i * 10} C360,${10 + i * 5} 720,${70 - i * 10} 1440,${40 + i * 10} L1440,100 L0,100 Z`}
 fill={color} opacity={0.3 + i * 0.15} />
 </svg>
 </motion.div>
 ))}
 </div>
 );
}

/* ═══ Floating Particles ═══ */
function Particles({ count = 12 }: { count?: number }) {
 return (
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 {[...Array(count)].map((_, i) => (
 <motion.div
 key={i}
 className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-rose-light to-violet-300"
 style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
 animate={{
 y: [0, -30, 0], x: [0, Math.random() * 20 - 10, 0],
 opacity: [0, 0.8, 0], scale: [0, 1, 0],
 }}
 transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
 />
 ))}
 </div>
 );
}

/* ═══ Main Page ═══ */
export default function VibeCheckPage() {
 const [step, setStep] = useState(0);
 const [mood, setMood] = useState<string>('');
 const [energy, setEnergy] = useState(0);
 const [topics, setTopics] = useState<string[]>([]);
 const [intent, setIntent] = useState('');
 const [done, setDone] = useState(false);
 const [saving, setSaving] = useState(false);
 const [vibeMatches, setVibeMatches] = useState<any[]>([]);
 const [vibeHistory, setVibeHistory] = useState<{ mood: string; energy: number; date: string; topics: string[] }[]>([]);

 useTrackPageView('vibe-check');
 useTrackScrollDepth('vibe-check');

 // Load vibe history and latest vibe on mount
 useEffect(() => {
 api.getVibeHistory().then(r => {
 const data = r.data || [];
 setVibeHistory(data.map((v: any) => ({ mood: v.mood, energy: v.energy, topics: v.topics || [], date: new Date(v.createdAt).toLocaleString() })));
 }).catch(() => {});
 }, []);

 const selectedMood = MOODS.find(m => m.id === mood);

 const nextStep = () => {
 if (step < VIBE_QUESTIONS.length - 1) setStep(s => s + 1);
 else {
 setDone(true);
 }
 };

 // Save vibe to backend + load vibe matches
 const shareVibe = async () => {
 setSaving(true);
 try {
 await api.saveVibeCheck({ mood, energy, topics, intent });
 setVibeHistory(prev => [{ mood, energy, date: new Date().toLocaleString(), topics }, ...prev]);
 // Load vibe-compatible users
 const matchRes = await api.getVibeMatches();
 setVibeMatches(matchRes.data || []);
 } catch (e) {
 if (process.env.NODE_ENV === 'development') console.warn('Failed to save vibe:', e);
 }
 setSaving(false);
 };

 const reset = () => {
 setStep(0); setMood(''); setEnergy(0); setTopics([]); setIntent(''); setDone(false); setVibeMatches([]);
 };

 const toggleTopic = (t: string) => setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

 return (
 <ErrorBoundary>
 <div className="max-w-3xl mx-auto p-6 pb-24 relative">
 <Particles />

 {/* Header */}
 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-8">
 <div className="flex items-center gap-4">
 <motion.div
 animate={{ rotate: [0, 5, -5, 0] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-200/50"
 >
 <AudioLines className="w-7 h-7 text-text-primary" />
 </motion.div>
 <div>
 <h1 className="text-2xl font-black text-text-primary">Vibe Check</h1>
 <p className="text-sm text-text-muted">Share your vibe with your matches 🎯</p>
 </div>
 </div>
 </motion.div>

 <AnimatePresence mode="wait">
 {/* Step 0: Mood Selection */}
 {!done && step === 0 && (
 <motion.div key="mood" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
 <Card className="p-8 text-center relative overflow-hidden">
 {selectedMood && <VibeWave color={selectedMood.wave} intensity={3} />}
 <div className="relative z-10">
 <h2 className="text-xl font-black text-text-primary mb-2">{VIBE_QUESTIONS[0].q}</h2>
 <p className="text-sm text-text-muted mb-6">Pick your current mood</p>
 <div className="grid grid-cols-4 gap-3 mb-6">
 {MOODS.map(m => (
 <motion.button key={m.id}
 whileHover={{ y: -8, scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 animate={mood === m.id ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
 transition={mood === m.id ? { duration: 1, repeat: Infinity } : {}}
 onClick={() => setMood(m.id)}
 className={cn('p-4 rounded-2xl border-2 transition-all',
 mood === m.id ? 'border-rose-main bg-miamo-surface shadow-lg shadow-soft' : 'border-border hover:bg-miamo-surface hover:border-border')}
 >
 <span className="text-3xl block mb-1">{m.emoji}</span>
 <span className="text-[10px] font-bold text-text-muted">{m.label}</span>
 </motion.button>
 ))}
 </div>
 <Button onClick={nextStep} disabled={!mood} className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500">
 Next <ChevronRight className="w-4 h-4" />
 </Button>
 </div>
 </Card>
 </motion.div>
 )}

 {/* Step 1: Energy Level */}
 {!done && step === 1 && (
 <motion.div key="energy" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}>
 <Card className="p-8 text-center relative overflow-hidden">
 <div className="relative z-10">
 <h2 className="text-xl font-black text-text-primary mb-2">{VIBE_QUESTIONS[1].q}</h2>
 <p className="text-sm text-text-muted mb-6">How charged are you?</p>
 <div className="flex flex-wrap justify-center gap-3 mb-6">
 {VIBE_QUESTIONS[1].options!.map((o: any) => (
 <motion.button key={o.value}
 whileHover={{ y: -5, scale: 1.05 }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setEnergy(o.value)}
 className={cn('px-6 py-4 rounded-2xl border-2 transition-all min-w-[100px]',
 energy === o.value ? 'border-indigo-400 bg-indigo-50 shadow-lg' : 'border-border hover:bg-miamo-surface')}
 >
 <motion.span className="text-3xl block mb-1"
 animate={energy === o.value ? { scale: [1, 1.3, 1] } : {}}
 transition={{ duration: 0.5, repeat: energy === o.value ? Infinity : 0 }}>{o.emoji}</motion.span>
 <span className="text-xs font-bold text-text-secondary">{o.label}</span>
 </motion.button>
 ))}
 </div>
 <div className="flex gap-3 justify-center">
 <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
 <Button onClick={nextStep} disabled={!energy} className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500">
 Next <ChevronRight className="w-4 h-4" />
 </Button>
 </div>
 </div>
 </Card>
 </motion.div>
 )}

 {/* Step 2: Topics */}
 {!done && step === 2 && (
 <motion.div key="topics" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}>
 <Card className="p-8 text-center">
 <h2 className="text-xl font-black text-text-primary mb-2">{VIBE_QUESTIONS[2].q}</h2>
 <p className="text-sm text-text-muted mb-6">Pick as many as you like</p>
 <div className="flex flex-wrap justify-center gap-2 mb-6">
 {(VIBE_QUESTIONS[2].options as string[]).map(t => (
 <motion.button key={t}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.9 }}
 onClick={() => toggleTopic(t)}
 className={cn('px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all',
 topics.includes(t) ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-border text-text-secondary hover:bg-miamo-surface')}
 >
 {t}
 </motion.button>
 ))}
 </div>
 <div className="flex gap-3 justify-center">
 <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
 <Button onClick={nextStep} disabled={topics.length === 0} className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500">
 Next <ChevronRight className="w-4 h-4" />
 </Button>
 </div>
 </Card>
 </motion.div>
 )}

 {/* Step 3: Intent */}
 {!done && step === 3 && (
 <motion.div key="intent" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}>
 <Card className="p-8 text-center">
 <h2 className="text-xl font-black text-text-primary mb-2">{VIBE_QUESTIONS[3].q}</h2>
 <p className="text-sm text-text-muted mb-6">What&apos;s your vibe today?</p>
 <div className="grid grid-cols-3 gap-3 mb-6">
 {(VIBE_QUESTIONS[3].options as any[]).map(o => (
 <motion.button key={o.label}
 whileHover={{ y: -5, scale: 1.05 }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setIntent(o.label)}
 className={cn('p-5 rounded-2xl border-2 transition-all',
 intent === o.label ? 'border-indigo-400 bg-indigo-50 shadow-lg' : 'border-border hover:bg-miamo-surface')}
 >
 <span className="text-3xl block mb-2">{o.emoji}</span>
 <span className="text-sm font-bold text-text-secondary">{o.label}</span>
 </motion.button>
 ))}
 </div>
 <div className="flex gap-3 justify-center">
 <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
 <Button onClick={nextStep} disabled={!intent} className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500">
 <Sparkles className="w-4 h-4" /> Set My Vibe
 </Button>
 </div>
 </Card>
 </motion.div>
 )}

 {/* Result */}
 {done && selectedMood && (
 <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
 <Card className="p-0 overflow-hidden relative">
 <div className={cn('p-10 text-center text-text-primary bg-gradient-to-br relative', selectedMood.color)}>
 <Particles count={20} />
 <VibeWave color="rgba(255,255,255,0.3)" intensity={energy} />
 <div className="relative z-10">
 <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
 transition={{ duration: 2, repeat: Infinity }} className="text-7xl mb-4">{selectedMood.emoji}</motion.div>
 <h2 className="text-3xl font-black mb-1">Vibe: {selectedMood.label}</h2>
 <p className="text-text-primary/70 text-lg">Looking for {intent}</p>
 <div className="flex items-center justify-center gap-1 mt-3">
 {[...Array(5)].map((_, i) => (
 <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
 className={cn('w-6 h-6 rounded-full', i < energy ? 'bg-miamo-card/80' : 'bg-miamo-card/20')} />
 ))}
 <span className="ml-2 text-sm font-bold text-text-primary/80">Energy</span>
 </div>
 </div>
 </div>

 <div className="p-6 space-y-4">
 <div>
 <h3 className="font-bold text-sm text-text-secondary mb-2">Topics I&apos;m into today</h3>
 <div className="flex flex-wrap gap-2">
 {topics.map(t => (
 <motion.span key={t} initial={{ scale: 0 }} animate={{ scale: 1 }}
 className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold">{t}</motion.span>
 ))}
 </div>
 </div>

 <div className="flex gap-3">
 <Button variant="secondary" onClick={reset} className="flex-1 gap-2"><RotateCcw className="w-4 h-4" /> New Check</Button>
 <Button onClick={shareVibe} disabled={saving} className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-violet-500">
 {saving ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send className="w-4 h-4" />}
 {saving ? 'Sharing...' : 'Share Vibe'}
 </Button>
 </div>
 </div>
 </Card>

 {/* Vibe Matches */}
 {vibeMatches.length > 0 && (
 <div className="mt-6 space-y-2">
 <h3 className="font-bold text-text-primary flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-400" /> Vibe Matches</h3>
 <p className="text-xs text-text-muted mb-2">People on your wavelength right now</p>
 {vibeMatches.slice(0, 5).map((vm: any, i: number) => {
 const photo = vm.user?.photos?.[0]?.url || vm.user?.photos?.[0];
 const vmMood = MOODS.find(x => x.id === vm.mood);
 return (
 <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
 <Card hover className="p-3 flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-lg overflow-hidden">
 {photo ? <img loading="lazy" src={photo} alt="" className="w-full h-full object-cover" /> : vmMood?.emoji || '✨'}
 </div>
 <div className="flex-1">
 <p className="font-semibold text-sm text-text-primary">{vm.user?.displayName || 'User'}</p>
 <p className="text-[10px] text-text-muted">{vmMood?.label || vm.mood} · Looking for {vm.intent}</p>
 </div>
 <div className="text-right">
 <span className="text-xs font-bold text-indigo-500">{vm.vibeScore}%</span>
 <p className="text-[9px] text-text-muted">vibe match</p>
 </div>
 </Card>
 </motion.div>
 );
 })}
 </div>
 )}

 {/* History */}
 {vibeHistory.length > 0 && (
 <div className="mt-6 space-y-2">
 <h3 className="font-bold text-text-primary flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Vibe History</h3>
 {vibeHistory.slice(0, 10).map((v, i) => {
 const m = MOODS.find(x => x.id === v.mood);
 return (
 <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
 <Card hover className="p-3 flex items-center gap-3">
 <span className="text-2xl">{m?.emoji || '😊'}</span>
 <div className="flex-1">
 <p className="font-semibold text-sm text-text-primary">{m?.label || 'Unknown'}</p>
 <p className="text-[10px] text-text-muted">{v.date}</p>
 </div>
 <div className="flex gap-1">{[...Array(5)].map((_, j) => (
 <div key={j} className={cn('w-3 h-3 rounded-full', j < v.energy ? 'bg-indigo-400' : 'bg-miamo-surface')} />
 ))}</div>
 </Card>
 </motion.div>
 );
 })}
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </ErrorBoundary>
 );
}