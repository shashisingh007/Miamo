'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Heart, MessageCircle, Eye, Send,
  MoreHorizontal, Share2, Trash2,
  AlertCircle, Reply,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { parseStoryContent, getBackgroundGradient } from './constants';

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
export function StoryViewer({ storyGroup, initialIndex, onClose, onRefresh }: {
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
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      const res = await api.likeStory(story.id);
      setLiked(res.data.liked);
      setLikeCount(c => res.data.liked === wasLiked ? (wasLiked ? c + 1 : c - 1) : c);
    } catch { setLiked(wasLiked); setLikeCount(c => wasLiked ? c + 1 : c - 1); }
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
          <img loading="lazy" src={story.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
                <button onClick={() => { api.reportUser({ reportedId: author.id, reason: 'inappropriate', targetType: 'story', targetId: story.id }).catch(() => {}); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm">
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
