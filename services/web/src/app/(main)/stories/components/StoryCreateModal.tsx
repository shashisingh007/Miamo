'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, ChevronLeft, Type, Image, Smile, Upload,
  Check, Users, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { STORY_BACKGROUNDS, STORY_MOODS, getBackgroundGradient } from './constants';

/* ═══ Story Create Modal ═══ */
export function StoryCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<'type' | 'compose'>('type');
  const [storyType, setStoryType] = useState<'text' | 'photo' | 'mood'>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedBg, setSelectedBg] = useState(STORY_BACKGROUNDS[0].id);
  const [selectedMood, setSelectedMood] = useState('');
  const [visibility, setVisibility] = useState('everyone');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (storyType === 'text' && !content.trim()) return;
    if (storyType === 'photo' && !mediaUrl.trim()) return;
    if (storyType === 'mood' && !selectedMood) return;
    setCreating(true);
    try {
      const finalContent = storyType === 'mood' ? `${selectedMood} ${content}` : content;
      await api.createStory({
        type: storyType === 'photo' ? 'photo' : 'text',
        content: finalContent,
        mediaUrl: storyType === 'photo' ? mediaUrl : undefined,
        background: storyType !== 'photo' ? selectedBg : undefined,
        visibility,
      });
      onCreated();
      onClose();
    } catch {}
    setCreating(false);
  };

  const bgGradient = getBackgroundGradient(selectedBg);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800">Create Story</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'type' ? (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">What kind of story?</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'text' as const, icon: Type, label: 'Text', desc: 'Share a thought', color: 'from-violet-400 to-purple-500' },
                  { id: 'photo' as const, icon: Image, label: 'Photo', desc: 'Share an image', color: 'from-pink-400 to-rose-500' },
                  { id: 'mood' as const, icon: Smile, label: 'Mood', desc: 'Share your vibe', color: 'from-amber-400 to-orange-500' },
                ].map(t => (
                  <motion.button key={t.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { setStoryType(t.id); setStep('compose'); }}
                    className="p-5 rounded-2xl border-2 border-gray-100 hover:border-pink-200 text-center group transition-all">
                    <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform', t.color)}>
                      <t.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-bold text-sm text-gray-800">{t.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <button onClick={() => setStep('type')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Change type
              </button>

              {/* Preview */}
              <div className={cn('relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[300px]',
                storyType === 'photo' && mediaUrl ? '' : `bg-gradient-to-br ${bgGradient}`)}>
                {storyType === 'photo' && mediaUrl ? (
                  <img loading="lazy" src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <p className="text-white text-lg font-bold text-center drop-shadow-lg">
                    {storyType === 'mood' && selectedMood && <span className="text-4xl block mb-2">{selectedMood}</span>}
                    {content || 'Your story here...'}
                  </p>
                </div>
              </div>

              {/* Mood picker */}
              {storyType === 'mood' && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Pick your mood</p>
                  <div className="flex flex-wrap gap-2">
                    {STORY_MOODS.map(m => (
                      <motion.button key={m} whileTap={{ scale: 0.8 }}
                        onClick={() => setSelectedMood(m)}
                        className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all',
                          selectedMood === m ? 'border-pink-400 bg-pink-50 scale-110' : 'border-gray-100 hover:bg-gray-50')}>
                        {m}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo URL */}
              {storyType === 'photo' && (
                <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
                  placeholder="Paste image URL..." className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none" />
              )}

              {/* Text input */}
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder={storyType === 'mood' ? 'Add a caption (optional)...' : "What's on your mind?"}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none" rows={3} />

              {/* Background picker (text & mood) */}
              {storyType !== 'photo' && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Background</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {STORY_BACKGROUNDS.map(bg => (
                      <motion.button key={bg.id} whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedBg(bg.id)}
                        className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex-shrink-0 border-2 transition-all', bg.gradient,
                          selectedBg === bg.id ? 'border-white ring-2 ring-pink-400 scale-110' : 'border-transparent')}>
                        {selectedBg === bg.id && <Check className="w-4 h-4 text-white mx-auto" />}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visibility */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">Who can see?</p>
                <div className="flex gap-2">
                  {[
                    { id: 'everyone', label: 'All Matches', icon: Users },
                    { id: 'close', label: 'Close Circle', icon: Lock },
                  ].map(v => (
                    <button key={v.id} onClick={() => setVisibility(v.id)}
                      className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold flex-1 transition-all',
                        visibility === v.id ? 'border-pink-400 bg-pink-50 text-pink-600' : 'border-gray-100 text-gray-500 hover:bg-gray-50')}>
                      <v.icon className="w-4 h-4" /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'compose' && (
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || (storyType === 'text' && !content.trim()) || (storyType === 'photo' && !mediaUrl.trim()) || (storyType === 'mood' && !selectedMood)}
              className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-rose-500">
              {creating ? 'Posting...' : <><Upload className="w-4 h-4" /> Share Story</>}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
