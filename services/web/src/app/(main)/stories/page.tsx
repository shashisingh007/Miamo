'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Heart, MessageCircle, Eye, Trash2, Share2, Send,
  ChevronLeft, ChevronRight, MoreHorizontal, Upload,
  Sparkles, Type, Image, Clock, Lock, Users,
  Check, AlertCircle, Smile, Reply,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Card } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ═══ Story Backgrounds ═══ */
const STORY_BACKGROUNDS = [
  { id: 'sunset', gradient: 'from-orange-400 via-pink-500 to-purple-600', label: 'Sunset' },
  { id: 'ocean', gradient: 'from-cyan-400 via-blue-500 to-indigo-600', label: 'Ocean' },
  { id: 'forest', gradient: 'from-emerald-400 via-green-500 to-teal-600', label: 'Forest' },
  { id: 'lavender', gradient: 'from-violet-400 via-purple-500 to-fuchsia-600', label: 'Lavender' },
  { id: 'midnight', gradient: 'from-gray-800 via-slate-900 to-black', label: 'Midnight' },
  { id: 'peach', gradient: 'from-rose-300 via-pink-400 to-red-500', label: 'Peach' },
  { id: 'aurora', gradient: 'from-green-400 via-cyan-500 to-blue-600', label: 'Aurora' },
  { id: 'golden', gradient: 'from-amber-300 via-yellow-400 to-orange-500', label: 'Golden' },
  { id: 'candy', gradient: 'from-pink-300 via-rose-400 to-fuchsia-500', label: 'Candy' },
  { id: 'storm', gradient: 'from-slate-400 via-gray-600 to-zinc-800', label: 'Storm' },
];

const STORY_MOODS = ['😍', '🥰', '😊', '🔥', '✨', '💕', '🌙', '☀️', '🎉', '🤗', '💪', '🧠'];

/* ═══ Floating Sparkles ═══ */
function FloatingSparkles({ count = 6 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <motion.div key={i} className="absolute"
          style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
          animate={{ y: [0, -15, 0], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 4 }}>
          <Sparkles className="w-3 h-3 text-pink-300" />
        </motion.div>
      ))}
    </div>
  );
}

/* ═══ Parse story content (handles background JSON) ═══ */
function parseStoryContent(content: string): { text: string; background?: string } {
  try {
    const parsed = JSON.parse(content);
    return { text: parsed.text || '', background: parsed.background };
  } catch {
    return { text: content, background: undefined };
  }
}

function getBackgroundGradient(bgId?: string): string {
  if (!bgId) return 'from-violet-400 via-purple-500 to-fuchsia-600';
  return STORY_BACKGROUNDS.find(b => b.id === bgId)?.gradient || 'from-violet-400 via-purple-500 to-fuchsia-600';
}

/* ═══ Story Create Modal ═══ */
function StoryCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
                  <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
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

/* ═══ Comments Drawer ═══ */
function CommentsDrawer({ story, onClose }: { story: any; onClose: () => void }) {
  const [comments, setComments] = useState<any[]>(story.comments || []);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadComments = useCallback(() => {
    api.getStoryComments(story.id).then(r => setComments(r.data || [])).catch(() => {});
  }, [story.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSend = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      await api.commentOnStory(story.id, newComment.trim(), replyingTo?.id);
      setNewComment('');
      setReplyingTo(null);
      loadComments();
    } catch {}
    setSending(false);
  };

  const handleReply = (comment: any) => {
    setReplyingTo({ id: comment.id, name: comment.author?.displayName || 'User' });
    inputRef.current?.focus();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 border-b border-gray-100 relative">
          <h3 className="font-bold text-gray-800">Comments ({comments.length})</h3>
          <div className="w-10 h-1 rounded-full bg-gray-200 absolute left-1/2 -translate-x-1/2 top-2" />
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
            </div>
          )}
          {comments.map((c: any) => (
            <div key={c.id}>
              <div className="flex gap-3">
                <Avatar name={c.author?.displayName || 'User'} size="sm" />
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-2.5">
                    <p className="text-xs font-bold text-gray-700">{c.author?.displayName || 'User'}</p>
                    <p className="text-sm text-gray-600">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-2">
                    <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={() => handleReply(c)} className="text-[10px] font-bold text-gray-400 hover:text-pink-500">Reply</button>
                  </div>
                  {/* Replies */}
                  {c.replies?.map((r: any) => (
                    <div key={r.id} className="flex gap-2 mt-2 ml-4">
                      <Avatar name={r.author?.displayName || 'User'} size="xs" />
                      <div className="flex-1">
                        <div className="bg-pink-50 rounded-2xl rounded-tl-md px-3 py-2">
                          <p className="text-[10px] font-bold text-gray-700">{r.author?.displayName || 'User'}</p>
                          <p className="text-xs text-gray-600">{r.content}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 px-2">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100">
          {replyingTo && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-gray-50 rounded-lg">
              <Reply className="w-3 h-3 text-pink-400" />
              <span className="text-xs text-gray-500">Replying to <b>{replyingTo.name}</b></span>
              <button onClick={() => setReplyingTo(null)} className="ml-auto"><X className="w-3 h-3 text-gray-400" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <input ref={inputRef} value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Add a comment..." className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none" />
            <Button size="sm" onClick={handleSend} disabled={!newComment.trim() || sending}
              className="rounded-full w-10 h-10 p-0 bg-gradient-to-r from-pink-500 to-rose-500">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══ Story Viewer (Full-screen Instagram-like) ═══ */
function StoryViewer({ storyGroup, initialIndex, onClose, onRefresh }: {
  storyGroup: any; initialIndex: number; onClose: () => void; onRefresh: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const STORY_DURATION = 8000;

  const stories = storyGroup.stories || [];
  const story = stories[currentIdx];
  const author = storyGroup.user || {};
  const photo = author.photos?.[0]?.url || author.photos?.[0];
  const isOwn = storyGroup.isOwn;
  const { text, background } = parseStoryContent(story?.content || '');
  const bgGradient = getBackgroundGradient(background);

  useEffect(() => {
    if (!story) return;
    setLiked(story.liked || false);
    setLikeCount(story.likeCount || 0);
    api.viewStory(story.id).catch(() => {});
  }, [story]);

  // Auto-advance timer
  useEffect(() => {
    if (showComments || showMenu) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          if (currentIdx < stories.length - 1) setCurrentIdx(i => i + 1);
          else onClose();
          return 100;
        }
        return p + (100 / (STORY_DURATION / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentIdx, stories.length, showComments, showMenu, onClose]);

  const goNext = () => { if (currentIdx < stories.length - 1) setCurrentIdx(i => i + 1); else onClose(); };
  const goPrev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1); };

  const handleLike = async () => {
    try {
      const res = await api.likeStory(story.id);
      setLiked(res.data.liked);
      setLikeCount(c => res.data.liked ? c + 1 : c - 1);
    } catch {}
  };

  const handleDelete = async () => {
    try { await api.deleteStory(story.id); onRefresh(); onClose(); } catch {}
  };

  const handlePostToFeed = async () => {
    try { await api.postStoryToFeed(story.id); setShowMenu(false); } catch {}
  };

  if (!story) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center">

      <div className="relative w-full max-w-md h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden mx-auto">

        {/* Background */}
        {story.mediaUrl ? (
          <img src={story.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br', bgGradient)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Progress bars */}
        <div className="absolute top-3 inset-x-3 z-20 flex gap-1">
          {stories.map((_: any, i: number) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-100"
                style={{ width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Author bar */}
        <div className="absolute top-8 inset-x-4 z-20 flex items-center gap-3">
          <Avatar src={photo} name={author.displayName || 'User'} size="sm" />
          <div className="flex-1">
            <p className="text-sm font-bold text-white drop-shadow">{author.displayName || 'User'}</p>
            <p className="text-[10px] text-white/70">{new Date(story.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20">
            <MoreHorizontal className="w-5 h-5 text-white" />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 right-4 z-30 bg-white rounded-2xl shadow-2xl py-2 w-48 overflow-hidden">
              {isOwn && (
                <>
                  <button onClick={handlePostToFeed} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm">
                    <Share2 className="w-4 h-4 text-indigo-500" /> Post to Feed
                  </button>
                  <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-left text-sm text-red-500">
                    <Trash2 className="w-4 h-4" /> Delete Story
                  </button>
                </>
              )}
              {!isOwn && (
                <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Report
                </button>
              )}
              <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm text-gray-400">
                <X className="w-4 h-4" /> Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story content (text overlay) */}
        {!story.mediaUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
            <p className="text-white text-xl sm:text-2xl font-bold text-center drop-shadow-lg leading-relaxed">{text}</p>
          </div>
        )}

        {/* Left/Right tap zones */}
        <div className="absolute inset-0 z-10 flex">
          <button onClick={goPrev} className="w-1/3 h-full" aria-label="Previous" />
          <div className="w-1/3 h-full" />
          <button onClick={goNext} className="w-1/3 h-full" aria-label="Next" />
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 space-y-3">
          {/* Stats bar for own stories */}
          {isOwn && (
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-white/80">
                <Eye className="w-4 h-4" /> <span className="text-sm font-medium">{story.viewCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <Heart className={cn('w-4 h-4', likeCount > 0 && 'text-pink-400 fill-pink-400')} />
                <span className="text-sm font-medium">{likeCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <MessageCircle className="w-4 h-4" /> <span className="text-sm font-medium">{story.commentCount || 0}</span>
              </div>
            </div>
          )}

          {/* Action buttons for others' stories */}
          {!isOwn && (
            <div className="flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike}
                className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
                <Heart className={cn('w-6 h-6 transition-all', liked ? 'text-pink-500 fill-pink-500 scale-110' : 'text-white')} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowComments(true)}
                className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
                <MessageCircle className="w-6 h-6 text-white" />
              </motion.button>
              {likeCount > 0 && (
                <span className="text-xs text-white/70 font-medium">{likeCount} like{likeCount !== 1 && 's'}</span>
              )}

              {/* Quick reactions */}
              <div className="ml-auto flex gap-1">
                {['❤️', '🔥', '😍'].map(emoji => (
                  <motion.button key={emoji} whileTap={{ scale: 0.7 }}
                    onClick={() => { api.reactToStory(story.id, emoji).catch(() => {}); }}
                    className="text-lg hover:scale-125 transition-transform">{emoji}</motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments drawer */}
      <AnimatePresence>
        {showComments && <CommentsDrawer story={story} onClose={() => setShowComments(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══ My Story Insights Card ═══ */
function MyStoryInsights({ stories, onView, onDelete, onPostToFeed }: {
  stories: any[]; onView: (idx: number) => void; onDelete: (id: string) => void;
  onPostToFeed: (id: string) => void;
}) {
  if (stories.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100/50">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-400" /> Your Active Stories
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">{stories.length} stor{stories.length !== 1 ? 'ies' : 'y'} live</p>
      </div>
      <div className="divide-y divide-gray-50">
        {stories.map((s: any, i: number) => {
          const { text, background } = parseStoryContent(s.content || '');
          const bgGradient = getBackgroundGradient(background);
          const isPopular = (s._count?.likes || 0) >= 3;
          return (
            <div key={s.id} className="p-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
              {/* Mini preview */}
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => onView(i)}
                className={cn('w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 relative',
                  s.mediaUrl ? '' : `bg-gradient-to-br ${bgGradient}`)}>
                {s.mediaUrl ? <img src={s.mediaUrl} alt="" className="w-full h-full object-cover" /> :
                  <p className="absolute inset-0 flex items-center justify-center p-1 text-white text-[8px] font-bold text-center leading-tight">{text?.substring(0, 40)}</p>}
                {isPopular && (
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </motion.button>

              {/* Stats */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{text?.substring(0, 50) || 'Photo story'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><Eye className="w-3 h-3" /> {s._count?.views || 0}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><Heart className="w-3 h-3" /> {s._count?.likes || 0}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><MessageCircle className="w-3 h-3" /> {s._count?.comments || 0}</span>
                </div>
                <p className="text-[10px] text-gray-300 mt-0.5">
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                  {new Date(s.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                {isPopular && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => onPostToFeed(s.id)} title="Post to Feed"
                    className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                    <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                  </motion.button>
                )}
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => onDelete(s.id)} title="Delete"
                  className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ═══ Main Stories Page ═══ */
export default function StoriesPage() {
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [myStories, setMyStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<any>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  const loadStories = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getStories().then(r => r.data || []).catch(() => []),
      api.getMyStories().then(r => r.data || []).catch(() => []),
    ]).then(([groups, mine]) => {
      setStoryGroups(groups);
      setMyStories(mine);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  const ownGroup = storyGroups.find((g: any) => g.isOwn);
  const matchGroups = storyGroups.filter((g: any) => !g.isOwn);

  const handleViewGroup = (group: any, idx = 0) => {
    setViewingGroup(group);
    setViewingIndex(idx);
  };

  const handleDeleteStory = async (id: string) => {
    try { await api.deleteStory(id); loadStories(); } catch {}
  };

  const handlePostToFeed = async (id: string) => {
    try { await api.postStoryToFeed(id); } catch {}
  };

  if (loading) return <MiamoLoader text="Loading stories..." />;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-6 relative">
      <FloatingSparkles />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-xl shadow-pink-200/50">
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Stories</h1>
              <p className="text-xs text-gray-400">Share moments with your matches</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-100">
            <Plus className="w-4 h-4" /> Create
          </Button>
        </div>
      </motion.div>

      {/* Story Rings — horizontal scroll */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="relative z-10">
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
          {/* Your story */}
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => ownGroup ? handleViewGroup(ownGroup) : setShowCreate(true)}
            className="flex flex-col items-center gap-2 shrink-0 group">
            <div className="relative">
              <div className={cn('rounded-full p-[3px] transition-all',
                ownGroup && ownGroup.stories.length > 0 ? 'bg-gradient-to-br from-pink-400 via-rose-500 to-purple-500 shadow-lg shadow-pink-200/40' : 'bg-gray-200')}>
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-white border-[3px] border-white flex items-center justify-center overflow-hidden">
                  <Avatar name="You" size="xl" />
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.2 }}
                className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center border-[3px] border-white shadow">
                <Plus className="w-3.5 h-3.5 text-white" />
              </motion.div>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 w-16 text-center truncate">Your story</span>
          </motion.button>

          {/* Match stories */}
          {matchGroups.map((group: any) => {
            const author = group.user || {};
            const gPhoto = author.photos?.[0]?.url || author.photos?.[0];
            const unviewedCount = group.stories?.filter((s: any) => !s.viewed).length || 0;
            return (
              <motion.button key={author.id} whileHover={{ scale: 1.05 }} onClick={() => handleViewGroup(group)}
                className="flex flex-col items-center gap-2 shrink-0 group">
                <div className="relative">
                  <div className={cn('rounded-full p-[3px] transition-all',
                    !group.viewed ? 'bg-gradient-to-br from-pink-400 via-rose-500 to-purple-500 shadow-lg shadow-pink-200/40 animate-pulse' : 'bg-gray-200')}>
                    <Avatar src={gPhoto} name={author.displayName || 'User'} size="xl" className="border-[3px] border-white" />
                  </div>
                  {unviewedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-white">
                      {unviewedCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-gray-500 w-16 text-center truncate group-hover:text-pink-500 transition-colors">
                  {(author.displayName || 'User').split(' ')[0]}
                </span>
              </motion.button>
            );
          })}

          {matchGroups.length === 0 && !ownGroup && (
            <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-2xl ml-2">
              <Eye className="w-5 h-5 text-gray-300" />
              <p className="text-sm text-gray-400">No stories from your matches yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* My Stories Insights */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <MyStoryInsights
          stories={myStories}
          onView={(idx) => { if (ownGroup) handleViewGroup(ownGroup, idx); }}
          onDelete={handleDeleteStory}
          onPostToFeed={handlePostToFeed}
        />
      </motion.div>

      {/* Story Grid — Match Stories */}
      {matchGroups.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative z-10">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" /> From Your Matches
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {matchGroups.map((group: any) => {
              const author = group.user || {};
              const gPhoto = author.photos?.[0]?.url || author.photos?.[0];
              const firstStory = group.stories?.[0];
              if (!firstStory) return null;
              const { text, background } = parseStoryContent(firstStory.content || '');
              const bgGrad = getBackgroundGradient(background);
              const totalLikes = group.stories.reduce((s: number, st: any) => s + (st.likeCount || 0), 0);
              const totalComments = group.stories.reduce((s: number, st: any) => s + (st.commentCount || 0), 0);

              return (
                <motion.button key={author.id} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleViewGroup(group)}
                  className="relative aspect-[9/16] max-h-[260px] rounded-2xl overflow-hidden group shadow-lg hover:shadow-xl transition-all">
                  {firstStory.mediaUrl ? (
                    <img src={firstStory.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className={cn('w-full h-full bg-gradient-to-br', bgGrad)}>
                      <div className="absolute inset-0 flex items-center justify-center p-3">
                        <p className="text-white text-xs font-bold text-center line-clamp-4 drop-shadow">{text}</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                  {/* Unviewed indicator */}
                  {!group.viewed && (
                    <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 shadow-lg animate-pulse" />
                  )}

                  {/* Author + story count */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Avatar src={gPhoto} name={author.displayName} size="xs" className="border-2 border-white/50" />
                    {group.stories.length > 1 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur text-[9px] font-bold text-white">
                        {group.stories.length}
                      </span>
                    )}
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-3 inset-x-3">
                    <p className="text-xs font-bold text-white drop-shadow truncate">{author.displayName || 'User'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {totalLikes > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-white/70 font-medium">
                          <Heart className="w-2.5 h-2.5" /> {totalLikes}
                        </span>
                      )}
                      {totalComments > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-white/70 font-medium">
                          <MessageCircle className="w-2.5 h-2.5" /> {totalComments}
                        </span>
                      )}
                      <span className="text-[9px] text-white/50 ml-auto">
                        {new Date(firstStory.createdAt).toLocaleString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {matchGroups.length === 0 && myStories.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 px-6">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-100/50">
            <Sparkles className="w-10 h-10 text-pink-400" />
          </motion.div>
          <h3 className="text-lg font-black text-gray-800 mb-1">No Stories Yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">Share a moment with your matches! Stories are visible only to people you&apos;ve matched with.</p>
          <Button onClick={() => setShowCreate(true)} className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500">
            <Plus className="w-4 h-4" /> Create Your First Story
          </Button>
        </motion.div>
      )}

      {/* Tips Card */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Card className="p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100/30">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-800">Story Tips</h4>
              <ul className="text-xs text-gray-500 mt-1 space-y-1">
                <li className="flex items-start gap-1.5"><span className="text-pink-400 mt-0.5">&#9829;</span> Stories stay until your match sees them (up to 7 days)</li>
                <li className="flex items-start gap-1.5"><span className="text-pink-400 mt-0.5">&#9829;</span> Popular stories can be posted to your feed</li>
                <li className="flex items-start gap-1.5"><span className="text-pink-400 mt-0.5">&#9829;</span> Only matched users can comment on your stories</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && <StoryCreateModal onClose={() => setShowCreate(false)} onCreated={loadStories} />}
      </AnimatePresence>

      {/* Viewer */}
      <AnimatePresence>
        {viewingGroup && (
          <StoryViewer
            storyGroup={viewingGroup}
            initialIndex={viewingIndex}
            onClose={() => { setViewingGroup(null); loadStories(); }}
            onRefresh={loadStories}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
