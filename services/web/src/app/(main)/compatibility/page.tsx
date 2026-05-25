'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Puzzle, Heart, Star, Sparkles, ChevronRight, Check, RefreshCw,
 Music, Coffee, Sun, Moon, Mountain, Book, Plane, Home,
 Utensils, Dog, Cat, TreePine, Dumbbell, Palette, Camera,
 Gamepad2, Film, Wine, Flower2, Brain, Zap, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';

/* ═══ Quiz Questions ═══ */
const QUIZ_SECTIONS = [
 {
 title: 'Lifestyle 🏡', icon: Home, questions: [
 { q: 'Weekend morning?', options: ['Sleep in till noon 😴', 'Early sunrise hike 🌅', 'Brunch with friends 🥐', 'Cozy reading time 📖'] },
 { q: 'Ideal vacation?', options: ['Beach resort 🏖️', 'Mountain adventure 🏔️', 'City exploration 🌆', 'Countryside escape 🌿'] },
 { q: 'After work?', options: ['Gym / workout 💪', 'Cook dinner at home 🍳', 'Netflix & chill 📺', 'Go out with friends 🎉'] },
 { q: 'Pet preference?', options: ['Dog person 🐕', 'Cat person 🐈', 'Both! 🐾', 'No pets 🚫'] },
 ]
 },
 {
 title: 'Values 💎', icon: Star, questions: [
 { q: 'Most important in a partner?', options: ['Humor & fun 😂', 'Ambition & drive 🚀', 'Kindness & empathy 💝', 'Intelligence 🧠'] },
 { q: 'Communication style?', options: ['Deep talks for hours 🗣️', 'Quality time, less talk ☕', 'Texts throughout the day 📱', 'Acts of service 🎁'] },
 { q: 'Future plans?', options: ['Marriage & family 💍', 'Travel the world ✈️', 'Build a career empire 💼', 'Live freely, no plans 🦋'] },
 { q: 'Deal breaker?', options: ['Dishonesty 🚩', 'No ambition 🐌', 'Different life goals 🔄', 'Poor communication 🤐'] },
 ]
 },
 {
 title: 'Fun & Interests 🎮', icon: Sparkles, questions: [
 { q: 'Music vibe?', options: ['Pop & mainstream 🎵', 'Indie & alternative 🎸', 'Hip-hop & R&B 🎤', 'Classical & jazz 🎹'] },
 { q: 'Movie night pick?', options: ['Action & thriller 💥', 'Romantic comedy 💕', 'Horror & mystery 👻', 'Documentary & sci-fi 🔬'] },
 { q: 'Food adventure?', options: ['Italian & pasta 🍝', 'Asian cuisine 🍜', 'Mexican fiesta 🌮', 'Healthy & plant-based 🥗'] },
 { q: 'Social energy?', options: ['Huge party person 🎊', 'Small gatherings 🏠', 'One-on-one dates 💑', 'Comfortable alone time 🧘'] },
 ]
 },
];

/* ═══ Score Ring Component ═══ */
function CompatibilityRing({ score, size = 120 }: { score: number; size?: number }) {
 const radius = (size - 12) / 2;
 const circumference = 2 * Math.PI * radius;
 const offset = circumference - (score / 100) * circumference;
 const color = score >= 80 ? '#ec4899' : score >= 60 ? '#f59e0b' : score >= 40 ? '#3b82f6' : '#9ca3af';

 return (
 <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}
 className="relative" style={{ width: size, height: size }}>
 <svg width={size} height={size} className="-rotate-90">
 <circle cx={size/2} cy={size/2} r={radius} stroke="#f3f4f6" strokeWidth="10" fill="none" />
 <motion.circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth="10" fill="none"
 strokeLinecap="round" strokeDasharray={circumference}
 initial={{ strokeDashoffset: circumference }}
 animate={{ strokeDashoffset: offset }}
 transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
 />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
 className="text-3xl font-black" style={{ color }}>{score}%</motion.span>
 <span className="text-[10px] text-text-muted font-bold">MATCH</span>
 </div>
 </motion.div>
 );
}

/* ═══ Main Page ═══ */
export default function CompatibilityPage() {
 const [matches, setMatches] = useState<any[]>([]);
 const [selectedMatch, setSelectedMatch] = useState<any>(null);
 const [quizActive, setQuizActive] = useState(false);

 useTrackPageView('compatibility');
 useTrackScrollDepth('compatibility');
 const [sectionIdx, setSectionIdx] = useState(0);
 const [questionIdx, setQuestionIdx] = useState(0);
 const [myAnswers, setMyAnswers] = useState<number[]>([]);
 const [partnerAnswers, setPartnerAnswers] = useState<number[]>([]);
 const [showResult, setShowResult] = useState(false);
 const [score, setScore] = useState(0);
 const [results, setResults] = useState<{ matchId: string; matchName: string; photo?: string; score: number; date: string }[]>([]);

 useEffect(() => { api.getMatches().then(r => setMatches(r.data || [])).catch(() => {}); }, []);

 const allQuestions = QUIZ_SECTIONS.flatMap(s => s.questions);
 const totalQ = allQuestions.length;
 const currentQ = sectionIdx < QUIZ_SECTIONS.length
 ? QUIZ_SECTIONS[sectionIdx].questions[questionIdx]
 : null;

 const handleAnswer = (optionIdx: number) => {
 setMyAnswers(prev => [...prev, optionIdx]);
 // Simulate partner's random answer
 setPartnerAnswers(prev => [...prev, Math.floor(Math.random() * 4)]);

 if (questionIdx < QUIZ_SECTIONS[sectionIdx].questions.length - 1) {
 setQuestionIdx(q => q + 1);
 } else if (sectionIdx < QUIZ_SECTIONS.length - 1) {
 setSectionIdx(s => s + 1);
 setQuestionIdx(0);
 } else {
 // Calculate score
 const total = myAnswers.length + 1;
 const matching = [...myAnswers, optionIdx].filter((a, i) => a === [...partnerAnswers, Math.floor(Math.random() * 4)][i]).length;
 const rawScore = Math.round(55 + (matching / total) * 40 + Math.random() * 10);
 const finalScore = Math.min(98, Math.max(42, rawScore));
 setScore(finalScore);
 setResults(prev => [{
 matchId: selectedMatch?.id,
 matchName: (selectedMatch?.matchedUser || selectedMatch)?.displayName || 'Match',
 photo: (selectedMatch?.matchedUser || selectedMatch)?.photos?.[0]?.url,
 score: finalScore,
 date: new Date().toLocaleDateString(),
 }, ...prev]);
 setShowResult(true);
 }
 };

 const resetQuiz = () => {
 setSectionIdx(0); setQuestionIdx(0); setMyAnswers([]); setPartnerAnswers([]);
 setShowResult(false); setQuizActive(false); setSelectedMatch(null);
 };

 const progress = ((sectionIdx * 4 + questionIdx) / totalQ) * 100;

 return (
 <ErrorBoundary>
 <div className="max-w-4xl mx-auto p-6 pb-24">
 {/* Header */}
 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
 <div className="flex items-center gap-4">
 <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
 className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-main to-rose-main flex items-center justify-center shadow-xl shadow-rose-light/50">
 <Puzzle className="w-7 h-7 text-text-primary" />
 </motion.div>
 <div>
 <h1 className="text-2xl font-black text-text-primary">Compatibility</h1>
 <p className="text-sm text-text-muted">Discover how well you match with someone 💜</p>
 </div>
 </div>
 </motion.div>

 {/* Quiz Active */}
 <AnimatePresence mode="wait">
 {quizActive && !showResult && currentQ && (
 <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 {/* Progress */}
 <div className="mb-6">
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-bold text-rose-main">{QUIZ_SECTIONS[sectionIdx].title}</span>
 <span className="text-xs text-text-muted">{Math.round(progress)}%</span>
 </div>
 <div className="h-2 bg-miamo-surface rounded-full overflow-hidden">
 <motion.div animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-rose-main to-rose-main rounded-full" />
 </div>
 </div>

 <motion.div key={`${sectionIdx}-${questionIdx}`} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}>
 <Card className="p-8 text-center relative overflow-hidden">
 <div className="absolute inset-0 bg-gradient-to-br from-rose-soft/50 to-rose-soft/30" />
 <div className="relative z-10">
 <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
 className="text-2xl font-black text-text-primary mb-8">{currentQ.q}</motion.p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {currentQ.options.map((opt, i) => (
 <motion.button key={i} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.95 }}
 onClick={() => handleAnswer(i)}
 className="p-4 rounded-2xl bg-miamo-card border-2 border-rose-soft hover:border-rose-alt text-left font-semibold text-text-secondary transition-all hover:shadow-lg hover:shadow-rose-soft/50">
 {opt}
 </motion.button>
 ))}
 </div>
 </div>
 </Card>
 </motion.div>
 </motion.div>
 )}

 {/* Result */}
 {showResult && (
 <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
 <Card className="p-8 text-center relative overflow-hidden">
 <div className="absolute inset-0 bg-gradient-to-br from-rose-main/10 to-rose-soft" />
 <div className="relative z-10">
 <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
 <CompatibilityRing score={score} />
 </motion.div>
 <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
 className="text-2xl font-black text-text-primary mt-4 mb-2">
 {score >= 80 ? '🔥 Soulmate Level!' : score >= 60 ? '✨ Great Chemistry!' : score >= 40 ? '💫 Potential There!' : '🌱 Growing Match'}
 </motion.h2>
 <p className="text-sm text-text-muted mb-6">
 You and {(selectedMatch?.matchedUser || selectedMatch)?.displayName || 'your match'} are {score}% compatible
 </p>
 <div className="grid grid-cols-3 gap-3 mb-6">
 {QUIZ_SECTIONS.map((s, i) => {
 const sectionScore = Math.round(50 + Math.random() * 45);
 return (
 <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 + i * 0.2 }}
 className="p-3 rounded-xl bg-miamo-card/80 border border-rose-soft">
 <p className="text-lg font-black text-rose-main">{sectionScore}%</p>
 <p className="text-[10px] text-text-muted font-bold">{s.title}</p>
 </motion.div>
 );
 })}
 </div>
 <div className="flex gap-3">
 <Button variant="secondary" onClick={resetQuiz} className="flex-1 gap-2"><RefreshCw className="w-4 h-4" /> Try Again</Button>
 <Button onClick={resetQuiz} className="flex-1 gap-2"><Heart className="w-4 h-4" /> Share Results</Button>
 </div>
 </div>
 </Card>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Match Selection / Start */}
 {!quizActive && (
 <div className="space-y-6">
 {/* Past Results */}
 {results.length > 0 && (
 <div className="space-y-3">
 <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
 <Star className="w-5 h-5 text-rose-alt" /> Past Results
 </h2>
 {results.map((r, i) => (
 <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
 <Card hover className="p-4 flex items-center gap-4">
 <Avatar src={r.photo} name={r.matchName} size="md" />
 <div className="flex-1">
 <p className="font-bold text-text-primary">{r.matchName}</p>
 <p className="text-xs text-text-muted">{r.date}</p>
 </div>
 <div className={cn('text-2xl font-black', r.score >= 80 ? 'text-rose' : r.score >= 60 ? 'text-rose-main' : 'text-rose-main')}>
 {r.score}%
 </div>
 </Card>
 </motion.div>
 ))}
 </div>
 )}

 {/* Start New */}
 <Card className="p-6">
 <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
 <Zap className="w-5 h-5 text-rose-main" /> Take the Quiz
 </h2>
 <p className="text-sm text-text-muted mb-4">Answer 12 questions to discover your compatibility score</p>
 <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-4">
 {matches.map((m: any) => {
 const user = m.matchedUser || m;
 const photo = user.photos?.[0]?.url;
 const sel = selectedMatch?.id === m.id;
 return (
 <motion.button key={m.id} whileHover={{ x: 4 }} onClick={() => setSelectedMatch(m)}
 className={cn('flex items-center gap-3 w-full p-3 rounded-xl transition-all border-2',
 sel ? 'border-rose-alt bg-rose-soft' : 'border-transparent hover:bg-miamo-surface')}>
 <Avatar src={photo} name={user.displayName || 'Match'} size="sm" />
 <span className="font-semibold text-sm text-text-secondary">{user.displayName || 'Match'}</span>
 {sel && <Check className="w-4 h-4 text-rose-main ml-auto" />}
 </motion.button>
 );
 })}
 </div>
 <Button onClick={() => setQuizActive(true)} disabled={!selectedMatch}
 className="w-full gap-2 bg-gradient-to-r from-rose-main to-rose-main shadow-lg">
 <Puzzle className="w-4 h-4" /> Start Compatibility Quiz
 </Button>
 </Card>
 </div>
 )}
 </div>
 </ErrorBoundary>
 );
}
