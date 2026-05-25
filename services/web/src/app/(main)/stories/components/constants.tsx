'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/* ═══ Story Backgrounds ═══ */
export const STORY_BACKGROUNDS = [
 { id: 'sunset', gradient: 'from-rose-alt via-rose-main to-rose-main', label: 'Sunset' },
 { id: 'ocean', gradient: 'from-rose-alt via-rose-main to-rose-main', label: 'Ocean' },
 { id: 'forest', gradient: 'from-rose-alt via-rose-main to-rose-main', label: 'Forest' },
 { id: 'lavender', gradient: 'from-rose-alt via-rose-main to-rose-main', label: 'Lavender' },
 { id: 'midnight', gradient: 'from-miamo-surface via-slate-900 to-black', label: 'Midnight' },
 { id: 'peach', gradient: 'from-rose-light via-rose-main to-red-500', label: 'Peach' },
 { id: 'aurora', gradient: 'from-rose-alt via-rose-main to-rose-main', label: 'Aurora' },
 { id: 'golden', gradient: 'from-rose-light via-rose-alt to-rose-main', label: 'Golden' },
 { id: 'candy', gradient: 'from-rose-light via-rose-alt to-rose-main', label: 'Candy' },
 { id: 'storm', gradient: 'from-slate-400 via-gray-600 to-zinc-800', label: 'Storm' },
];

export const STORY_MOODS = ['😍', '🥰', '😊', '🔥', '✨', '💕', '🌙', '☀️', '🎉', '🤗', '💪', '🧠'];

/* ═══ Floating Sparkles ═══ */
export function FloatingSparkles({ count = 6 }: { count?: number }) {
 return (
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 {[...Array(count)].map((_, i) => (
 <motion.div key={i} className="absolute"
 style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
 animate={{ y: [0, -15, 0], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.5] }}
 transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 4 }}>
 <Sparkles className="w-3 h-3 text-rose-light" />
 </motion.div>
 ))}
 </div>
 );
}

/* ═══ Parse story content (handles background JSON) ═══ */
export function parseStoryContent(content: string): { text: string; background?: string } {
 try {
 const parsed = JSON.parse(content);
 return { text: parsed.text || '', background: parsed.background };
 } catch {
 return { text: content, background: undefined };
 }
}

export function getBackgroundGradient(bgId?: string): string {
 if (!bgId) return 'from-rose-alt via-rose-main to-rose-main';
 return STORY_BACKGROUNDS.find(b => b.id === bgId)?.gradient || 'from-rose-alt via-rose-main to-rose-main';
}
