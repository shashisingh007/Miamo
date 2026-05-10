'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Gift, Clock, MessageSquare, Hand, Eye, Sparkles,
  ChevronRight, Check, RotateCcw, Star, Zap, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ═══ Love Languages ═══ */
const LANGUAGES = [
  { id: 'words', name: 'Words of Affirmation', emoji: '💬', icon: MessageSquare,
    color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', accent: 'text-pink-600',
    desc: 'You feel loved through compliments, encouragement, and "I love you"s',
    tips: ['Leave sweet notes', 'Compliment their outfit', 'Say "I\'m proud of you"', 'Text good morning/night'],
    example: '"The way you handled that was amazing. I\'m so lucky to have you."' },
  { id: 'acts', name: 'Acts of Service', emoji: '🎁', icon: Gift,
    color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', accent: 'text-emerald-600',
    desc: 'You feel loved when someone does things for you — actions speak louder than words',
    tips: ['Cook their favorite meal', 'Handle a chore they hate', 'Fill up their gas tank', 'Plan the whole date'],
    example: '"I noticed you were stressed, so I took care of everything tonight."' },
  { id: 'time', name: 'Quality Time', emoji: '⏰', icon: Clock,
    color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', accent: 'text-violet-600',
    desc: 'You feel loved through undivided attention and meaningful moments together',
    tips: ['Put phones away during dinner', 'Plan a no-agenda hangout', 'Take walks together', 'Learn something new together'],
    example: '"Let\'s just stay in tonight — just us, no distractions."' },
  { id: 'touch', name: 'Physical Touch', emoji: '🤝', icon: Hand,
    color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', accent: 'text-amber-600',
    desc: 'You feel loved through physical closeness — hugs, holding hands, cuddles',
    tips: ['Hold their hand in public', 'Give a back rub after a long day', 'Sit close on the couch', 'Greet them with a hug'],
    example: '"Come here — you look like you could use a 20-second hug."' },
  { id: 'gifts', name: 'Receiving Gifts', emoji: '🎀', icon: Star,
    color: 'from-sky-500 to-blue-500', bg: 'bg-sky-50', accent: 'text-sky-600',
    desc: 'You feel loved through thoughtful gifts that show someone was thinking of you',
    tips: ['Surprise with their favorite snack', 'Pick a flower on your walk', 'Remember what they mention wanting', 'Celebrate small milestones'],
    example: '"I saw this and immediately thought of you — I had to get it."' },
];

const QUESTIONS = [
  { q: 'After a tough day, what makes you feel better?', answers: [
    { text: 'Hearing "I\'m here for you" 💬', lang: 'words' },
    { text: 'Someone handles dinner 🍽️', lang: 'acts' },
    { text: 'Cuddling on the couch 🛋️', lang: 'touch' },
    { text: 'Undivided attention & talk ☕', lang: 'time' },
    { text: 'A small surprise gift 🎁', lang: 'gifts' },
  ]},
  { q: 'The most romantic gesture is...', answers: [
    { text: 'A love letter or sweet text 💌', lang: 'words' },
    { text: 'Planning the whole date 📋', lang: 'acts' },
    { text: 'A long, tight embrace 🤗', lang: 'touch' },
    { text: 'An entire day together 🌅', lang: 'time' },
    { text: 'A meaningful, unexpected gift 🎀', lang: 'gifts' },
  ]},
  { q: 'What hurts you most in a relationship?', answers: [
    { text: 'Harsh words or criticism 😢', lang: 'words' },
    { text: 'Laziness when I need help 😤', lang: 'acts' },
    { text: 'Lack of physical affection ❄️', lang: 'touch' },
    { text: 'Being ignored / phone time 📵', lang: 'time' },
    { text: 'Forgetting special occasions 💔', lang: 'gifts' },
  ]},
  { q: 'Perfect birthday surprise?', answers: [
    { text: 'A heartfelt speech or card ❤️', lang: 'words' },
    { text: 'They plan everything for you 🎉', lang: 'acts' },
    { text: 'Waking up to breakfast in bed 🥐', lang: 'touch' },
    { text: 'A whole day of adventures 🗺️', lang: 'time' },
    { text: 'A perfectly chosen gift 🎁', lang: 'gifts' },
  ]},
  { q: 'You feel most connected when...', answers: [
    { text: 'They express how they feel 💭', lang: 'words' },
    { text: 'They do something without asking ✨', lang: 'acts' },
    { text: 'Holding hands walking 👫', lang: 'touch' },
    { text: 'Deep conversation over coffee ☕', lang: 'time' },
    { text: 'They bring home your favorite treat 🍫', lang: 'gifts' },
  ]},
  { q: 'What makes a first date amazing?', answers: [
    { text: 'Great conversation & compliments 🗣️', lang: 'words' },
    { text: 'They open doors, pull out chairs 🚪', lang: 'acts' },
    { text: 'A goodnight kiss or hug 💋', lang: 'touch' },
    { text: 'Losing track of time together ⏳', lang: 'time' },
    { text: 'They bring a small thoughtful gift 🌹', lang: 'gifts' },
  ]},
  { q: 'In an argument, what helps you feel better?', answers: [
    { text: '"I\'m sorry, you\'re right" 🕊️', lang: 'words' },
    { text: 'They fix the problem 🔧', lang: 'acts' },
    { text: 'A big makeup hug 🤝', lang: 'touch' },
    { text: 'Sitting down to talk it out 💬', lang: 'time' },
    { text: 'An apology gift 💐', lang: 'gifts' },
  ]},
  { q: 'How do you show love?', answers: [
    { text: 'Constant encouragement & praise 🌟', lang: 'words' },
    { text: 'Doing favors without asking 💁', lang: 'acts' },
    { text: 'Lots of physical affection 🫂', lang: 'touch' },
    { text: 'Giving my undivided attention 👁️', lang: 'time' },
    { text: 'Finding the perfect present 🎯', lang: 'gifts' },
  ]},
];

/* ═══ Results Card ═══ */
function ResultCard({ primary, secondary, scores }: { primary: typeof LANGUAGES[0]; secondary: typeof LANGUAGES[0]; scores: Record<string, number> }) {
  const Icon = primary.icon;
  const SecIcon = secondary.icon;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }}>
      <Card className="p-0 overflow-hidden">
        {/* Hero */}
        <div className={cn('p-8 text-center text-white bg-gradient-to-br', primary.color)}>
          <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }} className="text-6xl mb-3">{primary.emoji}</motion.div>
          <h2 className="text-2xl font-black mb-1">{primary.name}</h2>
          <p className="text-white/80 text-sm">{primary.desc}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Score bars */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 text-sm">Your Love Language Profile</h3>
            {LANGUAGES.map(l => {
              const pct = total > 0 ? Math.round((scores[l.id] || 0) / total * 100) : 0;
              const isPrimary = l.id === primary.id;
              return (
                <div key={l.id} className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">{l.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-xs font-semibold', isPrimary ? l.accent : 'text-gray-500')}>{l.name}</span>
                      <span className="text-xs font-bold text-gray-400">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={cn('h-full rounded-full', isPrimary ? `bg-gradient-to-r ${l.color}` : 'bg-gray-300')} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" /> How to Show Love
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {primary.tips.map((tip, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.15 }}
                  className={cn('p-3 rounded-xl text-xs font-semibold', primary.bg, primary.accent)}>
                  {tip}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Example */}
          <div className={cn('p-4 rounded-xl border-2 italic text-sm', primary.bg)}>
            <p className={cn('font-semibold', primary.accent)}>{primary.example}</p>
          </div>

          {/* Secondary */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <SecIcon className={cn('w-5 h-5', secondary.accent)} />
            <div>
              <p className="text-xs text-gray-400">Secondary Language</p>
              <p className="text-sm font-bold text-gray-700">{secondary.name} {secondary.emoji}</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ═══ Main Page ═══ */
export default function LoveLanguagePage() {
  const [started, setStarted] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({ words: 0, acts: 0, time: 0, touch: 0, gifts: 0 });
  const [done, setDone] = useState(false);

  const handleAnswer = (lang: string) => {
    const newScores = { ...scores, [lang]: (scores[lang] || 0) + 1 };
    setScores(newScores);
    if (qIdx < QUESTIONS.length - 1) {
      setQIdx(q => q + 1);
    } else {
      setDone(true);
    }
  };

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const primary = LANGUAGES.find(l => l.id === sorted[0]?.[0]) || LANGUAGES[0];
  const secondary = LANGUAGES.find(l => l.id === sorted[1]?.[0]) || LANGUAGES[1];

  const reset = () => { setStarted(false); setQIdx(0); setScores({ words: 0, acts: 0, time: 0, touch: 0, gifts: 0 }); setDone(false); };

  return (
    <div className="max-w-3xl mx-auto p-6 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-xl shadow-rose-200/50">
            <Heart className="w-7 h-7 text-white" fill="white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Love Language</h1>
            <p className="text-sm text-gray-400">Discover how you give and receive love 💝</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Intro */}
        {!started && !done && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50/60 to-pink-50/40" />
              <div className="relative z-10">
                <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }} className="text-7xl mb-4">💝</motion.div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">What&apos;s Your Love Language?</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Answer 8 quick questions to find out how you express and experience love.
                  Share with your match for deeper understanding!
                </p>
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {LANGUAGES.map(l => (
                    <motion.div key={l.id} whileHover={{ y: -5, scale: 1.1 }} className={cn('p-3 rounded-xl', l.bg)}>
                      <span className="text-2xl">{l.emoji}</span>
                      <p className="text-[9px] font-bold text-gray-500 mt-1">{l.name.split(' ')[0]}</p>
                    </motion.div>
                  ))}
                </div>
                <Button onClick={() => setStarted(true)} size="lg" className="gap-2 bg-gradient-to-r from-rose-500 to-pink-500 shadow-xl">
                  <Heart className="w-5 h-5" /> Discover My Language
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quiz */}
        {started && !done && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-500">Question {qIdx + 1} of {QUESTIONS.length}</span>
                <span className="text-xs text-gray-400">{Math.round((qIdx / QUESTIONS.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${(qIdx / QUESTIONS.length) * 100}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={qIdx} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}>
                <Card className="p-6">
                  <motion.h2 animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className="text-xl font-black text-gray-800 mb-6 text-center">{QUESTIONS[qIdx].q}</motion.h2>
                  <div className="space-y-2">
                    {QUESTIONS[qIdx].answers.map((a, i) => (
                      <motion.button key={i} whileHover={{ x: 6, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                        onClick={() => handleAnswer(a.lang)}
                        className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-rose-300 hover:bg-rose-50/50 transition-all font-semibold text-gray-700">
                        {a.text}
                      </motion.button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* Results */}
        {done && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultCard primary={primary} secondary={secondary} scores={scores} />
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={reset} className="flex-1 gap-2"><RotateCcw className="w-4 h-4" /> Retake</Button>
              <Button onClick={() => { /* share */ }} className="flex-1 gap-2"><Zap className="w-4 h-4" /> Share with Match</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
