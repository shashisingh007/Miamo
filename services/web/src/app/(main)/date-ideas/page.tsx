'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, Heart, MapPin, Star, Sparkles, Sun, Moon,
  UtensilsCrossed, TreePine, Dumbbell, Palette, Music,
  Camera, Wine, Coffee, BookOpen, Gamepad2, GlassWater,
  Bookmark, BookmarkCheck, Share2, RefreshCcw, Filter,
  ChevronRight, Flame, Snowflake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Badge, Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTrackPageView, useTrackScrollDepth, trackClick } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';

/* ═══ Categories ═══ */
const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '✨', color: 'from-gray-400 to-gray-500' },
  { id: 'romantic', label: 'Romantic', emoji: '💕', color: 'from-rose-400 to-pink-500', icon: Heart },
  { id: 'adventure', label: 'Adventure', emoji: '🏔️', color: 'from-emerald-400 to-teal-500', icon: TreePine },
  { id: 'foodie', label: 'Foodie', emoji: '🍽️', color: 'from-amber-400 to-orange-500', icon: UtensilsCrossed },
  { id: 'creative', label: 'Creative', emoji: '🎨', color: 'from-violet-400 to-purple-500', icon: Palette },
  { id: 'cozy', label: 'Cozy', emoji: '☕', color: 'from-orange-300 to-amber-400', icon: Coffee },
  { id: 'active', label: 'Active', emoji: '💪', color: 'from-blue-400 to-cyan-500', icon: Dumbbell },
  { id: 'free', label: 'Free / Budget', emoji: '🆓', color: 'from-lime-400 to-green-500', icon: Star },
];

/* ═══ Date Ideas ═══ */
const DATE_IDEAS: DateIdea[] = [
  // Romantic
  { id: 1, title: 'Sunset Picnic', desc: 'Pack wine, cheese, and a cozy blanket. Find a hilltop or lakeside spot and watch the sky turn gold together.', category: 'romantic', vibe: '🌅', difficulty: 'easy', time: '2-3 hrs', budget: '$', saved: false },
  { id: 2, title: 'Stargazing Night', desc: 'Drive to a dark sky spot, lay on the car hood, and map constellations. Bring hot chocolate and a star chart app.', category: 'romantic', vibe: '🌟', difficulty: 'easy', time: '2-4 hrs', budget: 'Free', saved: false },
  { id: 3, title: 'Cooking Class for Two', desc: 'Book a couples cooking class — Italian pasta, sushi rolling, or Thai curry. Learn, laugh, and eat together.', category: 'romantic', vibe: '👩‍🍳', difficulty: 'easy', time: '3 hrs', budget: '$$', saved: false },
  { id: 4, title: 'Love Letter Exchange', desc: 'Write surprise letters to each other. Meet at a cozy café, swap envelopes, and read them aloud over coffee.', category: 'romantic', vibe: '💌', difficulty: 'easy', time: '1-2 hrs', budget: 'Free', saved: false },
  // Adventure
  { id: 5, title: 'Sunrise Hike', desc: 'Wake up early and chase the sunrise on a scenic trail. Pack snacks and reward yourselves with breakfast after.', category: 'adventure', vibe: '🥾', difficulty: 'medium', time: '3-5 hrs', budget: 'Free', saved: false },
  { id: 6, title: 'Kayaking / Paddle Boarding', desc: 'Hit the water together! Race, splash, and float. Perfect for summer days and great memories.', category: 'adventure', vibe: '🛶', difficulty: 'medium', time: '2-3 hrs', budget: '$$', saved: false },
  { id: 7, title: 'Rock Climbing', desc: 'Try indoor bouldering — belay each other, cheer on the tricky moves. A trust-building adrenaline rush.', category: 'adventure', vibe: '🧗', difficulty: 'hard', time: '2 hrs', budget: '$$', saved: false },
  { id: 8, title: 'Road Trip Mystery', desc: 'Pick a random direction and drive for 1 hour. Explore wherever you end up — hidden gems guaranteed.', category: 'adventure', vibe: '🚗', difficulty: 'easy', time: 'Half day', budget: '$', saved: false },
  // Foodie
  { id: 9, title: 'Food Truck Crawl', desc: 'Map 4-5 food trucks across the city. Share one item at each stop. Rate everything on a napkin scorecard.', category: 'foodie', vibe: '🌮', difficulty: 'easy', time: '3-4 hrs', budget: '$$', saved: false },
  { id: 10, title: 'Blind Chef Challenge', desc: 'Pick 5 random ingredients at the store. Go home and compete to make the best dish. Judge each other fairly (or not 😄).', category: 'foodie', vibe: '🥘', difficulty: 'medium', time: '2-3 hrs', budget: '$', saved: false },
  { id: 11, title: 'Dessert Tour', desc: 'Hit the best dessert spots in town — gelato, crêpes, cookies, pastries. Share everything and rank your favorites.', category: 'foodie', vibe: '🍰', difficulty: 'easy', time: '2-3 hrs', budget: '$$', saved: false },
  { id: 12, title: 'Farmer\'s Market Date', desc: 'Stroll a local farmer\'s market, taste samples, pick fresh ingredients, then cook a meal together at home.', category: 'foodie', vibe: '🧺', difficulty: 'easy', time: '3-4 hrs', budget: '$', saved: false },
  // Creative
  { id: 13, title: 'Pottery / Art Class', desc: 'Channel your inner artist — throw clay on a wheel or paint on canvas side by side. Keep your creations as souvenirs!', category: 'creative', vibe: '🏺', difficulty: 'easy', time: '2-3 hrs', budget: '$$', saved: false },
  { id: 14, title: 'Photo Walk', desc: 'Grab your phones/cameras and explore a photogenic neighborhood. Theme: "beauty in unexpected places." Share your album at the end.', category: 'creative', vibe: '📸', difficulty: 'easy', time: '2 hrs', budget: 'Free', saved: false },
  { id: 15, title: 'DIY Craft Night', desc: 'Pick a craft — tie-dye, candle-making, jewelry. Put on music, open snacks, and create together. Exchange your favorites.', category: 'creative', vibe: '✂️', difficulty: 'easy', time: '2-3 hrs', budget: '$', saved: false },
  { id: 16, title: 'Playlist Exchange', desc: 'Each create a 10-song playlist that describes you. Listen together, explain why each song matters. Musical souls unite.', category: 'creative', vibe: '🎶', difficulty: 'easy', time: '1-2 hrs', budget: 'Free', saved: false },
  // Cozy
  { id: 17, title: 'Movie Marathon', desc: 'Pick a trilogy or series. Build a blanket fort, make popcorn, and binge in your coziest pajamas.', category: 'cozy', vibe: '🎬', difficulty: 'easy', time: '4-6 hrs', budget: 'Free', saved: false },
  { id: 18, title: 'Book & Café Date', desc: 'Visit a bookstore, pick a book for each other (under $15). Read together at a nearby café. Cozy, intimate, literary.', category: 'cozy', vibe: '📖', difficulty: 'easy', time: '2-3 hrs', budget: '$', saved: false },
  { id: 19, title: 'Board Game Night', desc: 'Break out the board games or card games. Competitive or cooperative — laughter guaranteed. Snacks mandatory.', category: 'cozy', vibe: '🎲', difficulty: 'easy', time: '2-4 hrs', budget: 'Free', saved: false },
  { id: 20, title: 'Spa Night at Home', desc: 'Face masks, candles, bath bombs, soothing music. Give each other massages. Ultimate relaxation date.', category: 'cozy', vibe: '🧖‍♀️', difficulty: 'easy', time: '2-3 hrs', budget: '$', saved: false },
  // Active
  { id: 21, title: 'Bike Ride Adventure', desc: 'Rent bikes and explore a scenic trail or waterfront. Stop at interesting spots along the way. Great cardio + great views.', category: 'active', vibe: '🚴', difficulty: 'medium', time: '2-4 hrs', budget: '$', saved: false },
  { id: 22, title: 'Dance Class', desc: 'Salsa, swing, or hip-hop — learn a new dance together. Minimal skill required, maximum fun guaranteed.', category: 'active', vibe: '💃', difficulty: 'medium', time: '1-2 hrs', budget: '$$', saved: false },
  { id: 23, title: 'Bowling + Arcade', desc: 'Classic date energy! Bowl a few rounds, then hit the arcade. Win each other silly prizes from the claw machine.', category: 'active', vibe: '🎳', difficulty: 'easy', time: '2-3 hrs', budget: '$$', saved: false },
  { id: 24, title: 'Mini Golf Challenge', desc: 'Compete for the lowest score with fun stakes — loser buys ice cream. Playful, lighthearted, and full of banter.', category: 'active', vibe: '⛳', difficulty: 'easy', time: '1-2 hrs', budget: '$', saved: false },
  // Free / Budget
  { id: 25, title: 'Volunteer Together', desc: 'Find a local cause — animal shelter, food bank, beach cleanup. Bond while making the world a little better.', category: 'free', vibe: '🤝', difficulty: 'easy', time: '2-4 hrs', budget: 'Free', saved: false },
  { id: 26, title: 'Explore a New Neighborhood', desc: 'Pick a part of town you\'ve never been to. Walk around, peek into shops, find hidden murals, try a random restaurant.', category: 'free', vibe: '🗺️', difficulty: 'easy', time: '2-3 hrs', budget: 'Free', saved: false },
  { id: 27, title: 'Free Museum / Gallery Day', desc: 'Many museums have free admission days. Wander the exhibits, discuss art, pretend to be critics. Cultured and free.', category: 'free', vibe: '🖼️', difficulty: 'easy', time: '2-3 hrs', budget: 'Free', saved: false },
  { id: 28, title: 'Cloud Watching', desc: 'Find a field or rooftop, lay down side by side, and find shapes in the clouds. Simple, sweet, and deeply personal.', category: 'free', vibe: '☁️', difficulty: 'easy', time: '1-2 hrs', budget: 'Free', saved: false },
];

type DateIdea = { id: number; title: string; desc: string; category: string; vibe: string; difficulty: string; time: string; budget: string; saved: boolean };

/* ═══ Floating Sparkle ═══ */
function FloatingSparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div key={i} className="absolute"
          style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
          animate={{ y: [0, -20, 0], opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 4 }}>
          <Sparkles className="w-4 h-4 text-amber-300" />
        </motion.div>
      ))}
    </div>
  );
}

export default function DateIdeasPage() {
  const [cat, setCat] = useState('all');
  const [ideas, setIdeas] = useState(DATE_IDEAS);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState<DateIdea | null>(null);

  useTrackPageView('date-ideas');
  useTrackScrollDepth('date-ideas');

  const filtered = cat === 'all' ? ideas : ideas.filter(i => i.category === cat);

  const toggleSave = (id: number) => setIdeas(prev => prev.map(i => i.id === id ? { ...i, saved: !i.saved } : i));
  const savedIdeas = ideas.filter(i => i.saved);

  const randomIdea = () => {
    const pool = cat === 'all' ? ideas : ideas.filter(i => i.category === cat);
    const rnd = pool[Math.floor(Math.random() * pool.length)];
    setSpotlight(rnd);
  };

  const catInfo = CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];

  return (
    <ErrorBoundary>
    <div className="max-w-3xl mx-auto p-6 pb-24 relative">
      <FloatingSparkles />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-6">
        <div className="flex items-center gap-4">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-200/50">
            <Lightbulb className="w-7 h-7 text-white" />
          </motion.div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">Date Ideas</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">{filtered.length} ideas to spark your next date ✨</p>
          </div>
          <Button onClick={randomIdea} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-orange-100">
            <RefreshCcw className="w-4 h-4" /> Surprise Me
          </Button>
        </div>
      </motion.div>

      {/* Spotlight Card */}
      <AnimatePresence>
        {spotlight && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-20 mb-6">
            <Card className="p-0 overflow-hidden border-2 border-amber-200">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white relative">
                <FloatingSparkles />
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">🎲 Random Pick</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{spotlight.vibe}</span>
                    <div>
                      <h3 className="text-xl font-black">{spotlight.title}</h3>
                      <p className="text-white/80 text-sm">{spotlight.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-bold">{spotlight.time}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-bold">{spotlight.budget}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-bold">{spotlight.difficulty}</span>
                  </div>
                </div>
                <button onClick={() => setSpotlight(null)} className="absolute top-3 right-3 bg-white/20 rounded-lg p-1 hover:bg-white/30">
                  <span className="text-white text-xl leading-none">&times;</span>
                </button>
              </div>
              <div className="p-4 flex gap-2">
                <Button variant="secondary" className="flex-1 gap-2" onClick={() => toggleSave(spotlight.id)}>
                  {ideas.find(i => i.id === spotlight.id)?.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {ideas.find(i => i.id === spotlight.id)?.saved ? 'Saved' : 'Save idea'}
                </Button>
                <Button className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500" onClick={randomIdea}>
                  <RefreshCcw className="w-4 h-4" /> Another
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide relative z-10">
        {CATEGORIES.map(c => (
          <motion.button key={c.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
            onClick={() => setCat(c.id)}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold whitespace-nowrap transition-all',
              cat === c.id ? `border-transparent bg-gradient-to-r ${c.color} text-white shadow-lg` : 'border-gray-100 text-gray-600 hover:bg-gray-50')}>
            <span>{c.emoji}</span> {c.label}
          </motion.button>
        ))}
      </div>

      {/* Saved Bar */}
      {savedIdeas.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-2 relative z-10">
          <BookmarkCheck className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-sm text-amber-700">{savedIdeas.length} saved idea{savedIdeas.length !== 1 && 's'}</span>
          <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide">
            {savedIdeas.slice(0, 6).map(s => (
              <span key={s.id} className="text-lg">{s.vibe}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Ideas Grid */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
        <AnimatePresence>
          {filtered.map((idea, i) => {
            const catItem = CATEGORIES.find(c => c.id === idea.category);
            const isExpanded = expanded === idea.id;
            return (
              <motion.div key={idea.id} layout
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className={cn(isExpanded && 'sm:col-span-2')}>
                <Card hover className="p-0 overflow-hidden cursor-pointer group" onClick={() => setExpanded(isExpanded ? null : idea.id)}>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <motion.div whileHover={{ rotate: 15, scale: 1.2 }} className="text-3xl flex-shrink-0 mt-1">{idea.vibe}</motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-gray-800 group-hover:text-indigo-600 transition-colors">{idea.title}</h3>
                          <motion.button whileTap={{ scale: 0.8 }}
                            onClick={e => { e.stopPropagation(); toggleSave(idea.id); }}
                            className="flex-shrink-0 mt-0.5">
                            {idea.saved ?
                              <BookmarkCheck className="w-5 h-5 text-amber-500" /> :
                              <Bookmark className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />}
                          </motion.button>
                        </div>
                        <p className={cn('text-sm text-gray-500 mt-1', !isExpanded && 'line-clamp-2')}>{idea.desc}</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r text-white', catItem?.color)}>
                            {catItem?.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">⏱️ {idea.time}</span>
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">💰 {idea.budget}</span>
                          <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold',
                            idea.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
                            idea.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}>
                            {idea.difficulty === 'easy' ? '😊' : idea.difficulty === 'medium' ? '💪' : '🔥'} {idea.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                          <Button variant="secondary" size="sm" className="flex-1 gap-1 text-xs" onClick={e => e.stopPropagation()}>
                            <Share2 className="w-3 h-3" /> Share with match
                          </Button>
                          <Button variant="secondary" size="sm" className="flex-1 gap-1 text-xs" onClick={e => { e.stopPropagation(); toggleSave(idea.id); }}>
                            {idea.saved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                            {idea.saved ? 'Unsave' : 'Save'}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-gray-500 font-semibold">No ideas in this category yet!</p>
        </motion.div>
      )}
    </div>
    </ErrorBoundary>
  );
}
