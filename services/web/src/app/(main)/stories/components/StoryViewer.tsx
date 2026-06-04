'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 X, Heart, MessageCircle, Eye, Send,
 MoreHorizontal, Share2, Trash2,
 AlertCircle, Link2, Download, BellOff, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { parseStoryContent, getBackgroundGradient, markViewedOnce } from './constants';

/* ═══ Viewers + Likers Drawer (own stories) ═══ */
function ViewersDrawer({ story, initialTab, onClose }: { story: any; initialTab: 'views' | 'likes'; onClose: () => void }) {
 const [tab, setTab] = useState<'views' | 'likes'>(initialTab);
 const [views, setViews] = useState<any[]>([]);
 const [likes, setLikes] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 setLoading(true);
 Promise.allSettled([api.getStoryViewers(story.id), api.getStoryLikes(story.id)])
 .then(([v, l]) => {
 if (v.status === 'fulfilled') setViews(v.value.data || []);
 if (l.status === 'fulfilled') setLikes(l.value.data || []);
 })
 .finally(() => setLoading(false));
 }, [story.id]);

 const likedSet = new Set(likes.map(l => l.user?.id || l.userId));
 const list = tab === 'likes' ? likes.map(l => ({ user: l.user, at: l.createdAt, liked: true })) : views.map(v => ({ user: v.viewer, at: v.createdAt || v.viewedAt, liked: likedSet.has(v.viewer?.id) }));

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
 <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
 className="bg-miamo-card rounded-t-3xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
 <div className="w-10 h-1 rounded-full bg-border mx-auto mt-2" />
 <div className="flex items-center justify-between p-4 border-b border-border">
 <div className="flex gap-1 bg-miamo-surface rounded-full p-1">
 <button onClick={() => setTab('views')} className={cn('px-4 py-1.5 rounded-full text-xs font-bold transition-colors', tab === 'views' ? 'bg-miamo-card text-text-primary shadow' : 'text-text-muted')}>
 <Eye className="w-3.5 h-3.5 inline mr-1.5" />Views <span className="opacity-60">{views.length}</span>
 </button>
 <button onClick={() => setTab('likes')} className={cn('px-4 py-1.5 rounded-full text-xs font-bold transition-colors', tab === 'likes' ? 'bg-miamo-card text-text-primary shadow' : 'text-text-muted')}>
 <Heart className="w-3.5 h-3.5 inline mr-1.5" />Likes <span className="opacity-60">{likes.length}</span>
 </button>
 </div>
 <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
 </div>
 <div className="flex-1 overflow-y-auto p-4 space-y-3">
 {loading && <p className="text-center text-sm text-text-muted py-8">Loading…</p>}
 {!loading && list.length === 0 && (
 <div className="text-center py-10">
 {tab === 'likes' ? <Heart className="w-10 h-10 text-text-muted mx-auto mb-2" /> : <Eye className="w-10 h-10 text-text-muted mx-auto mb-2" />}
 <p className="text-sm text-text-muted">{tab === 'likes' ? 'No likes yet.' : 'No viewers yet.'}</p>
 </div>
 )}
 {!loading && list.map((row: any, i: number) => {
 const u = row.user || {};
 const photo = u.photos?.[0]?.url || u.photos?.[0];
 return (
 <div key={(u.id || i) + '-' + tab} className="flex items-center gap-3">
 <Avatar src={photo} name={u.displayName || 'User'} size="sm" />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-text-primary truncate">{u.displayName || 'User'}</p>
 {row.at && <p className="text-[11px] text-text-muted">{new Date(row.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
 </div>
 {row.liked && <Heart className="w-4 h-4 text-rose-main fill-rose-main" />}
 </div>
 );
 })}
 </div>
 </motion.div>
 </motion.div>
 );
}

/* ═══ Quick Reply → Chat (others' stories) ═══ */
function ReplyToChatDrawer({ story, author, onClose }: { story: any; author: any; onClose: () => void }) {
 const [text, setText] = useState('');
 const [sending, setSending] = useState(false);
 const [sent, setSent] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => { inputRef.current?.focus(); }, []);

 const handleSend = async () => {
 if (!text.trim() || sending || !author?.id) return;
 setSending(true);
 try {
 const r = await api.openChatWith(author.id);
 const chatId = r?.data?.id;
 if (!chatId) throw new Error('no chat');
 const parsed = parseStoryContent(story.content || '');
 const createdMs = story.createdAt ? new Date(story.createdAt).getTime() : Date.now();
 const expiresAt = story.expiresAt ? new Date(story.expiresAt).getTime() : createdMs + 24 * 60 * 60 * 1000;
 const meta = {
 storyId: story.id,
 mediaUrl: story.mediaUrl || '',
 text: (parsed.text || '').slice(0, 120),
 background: parsed.background || null,
 expiresAt,
 };
 const payload = `[[STORY_REPLY:${JSON.stringify(meta)}]]\n${text.trim()}`;
 await api.sendMessage(chatId, payload, 'text');
 setSent(true);
 setText('');
 setTimeout(() => onClose(), 900);
 } catch {}
 setSending(false);
 };

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
 <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }}
 className="bg-miamo-card rounded-t-3xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
 <div className="w-10 h-1 rounded-full bg-border mx-auto mt-2" />
 <div className="flex items-center justify-between p-4 border-b border-border">
 <div className="flex items-center gap-2">
 <MessageCircle className="w-4 h-4 text-rose-main" />
 <h3 className="font-bold text-text-primary text-sm">Message {author?.displayName?.split(' ')[0] || 'them'}</h3>
 </div>
 <button onClick={onClose}><X className="w-5 h-5 text-text-muted" /></button>
 </div>
 <div className="p-4 space-y-3">
 <p className="text-xs text-text-muted">Sent privately to your chat — they'll see it next time they open Messages.</p>
 <div className="flex gap-2">
 <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleSend()}
 disabled={sending || sent}
 placeholder="Write a private message…"
 className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm focus:border-rose focus:ring-2 focus:ring-rose-main/15 outline-none disabled:opacity-60" />
 <Button size="sm" onClick={handleSend} disabled={!text.trim() || sending || sent}
 className="rounded-full w-10 h-10 p-0 bg-gradient-rose">
 {sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
 </Button>
 </div>
 {sent && <p className="text-xs text-rose-main font-semibold">Sent — opening Messages…</p>}
 </div>
 </motion.div>
 </motion.div>
 );
}

/* ═══ Story Viewer (Full-screen Instagram-like) ═══ */
export function StoryViewer({ storyGroup, initialIndex = 0, onClose, onRefresh }: {
 storyGroup: any; initialIndex?: number; onClose: () => void; onRefresh: () => void;
}) {
 const [currentIdx, setCurrentIdx] = useState(initialIndex);
 const [showReply, setShowReply] = useState(false);
 const [showMenu, setShowMenu] = useState(false);
 const [viewersTab, setViewersTab] = useState<'views' | 'likes' | null>(null);
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
 const meta = parseStoryContent(story.content || '').meta;
 if (meta?.viewOnce && !isOwn) markViewedOnce(story.id);
 }, [story, isOwn]);

 // Auto-advance timer
 useEffect(() => {
 if (showReply || showMenu || viewersTab) return;
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
 }, [currentIdx, stories.length, showReply, showMenu, viewersTab, onClose]);

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

 const handleCopyLink = async () => {
 try {
 const url = `${window.location.origin}/stories?s=${story.id}`;
 await navigator.clipboard.writeText(url);
 } catch {}
 setShowMenu(false);
 };

 const handleSaveMedia = async () => {
 if (!story.mediaUrl) { setShowMenu(false); return; }
 try {
 const a = document.createElement('a');
 a.href = story.mediaUrl;
 const isVid = /^data:video|\.(mp4|webm|mov)(\?|$)/i.test(story.mediaUrl);
 a.download = `miamo-story-${story.id}.${isVid ? 'webm' : 'jpg'}`;
 document.body.appendChild(a); a.click(); a.remove();
 } catch {}
 setShowMenu(false);
 };

 const handleMuteAuthor = async () => {
 try { await (api as any).muteUser?.(author.id); } catch {}
 setShowMenu(false);
 };

 if (!story) return null;

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-black flex items-center justify-center">

 <div className="relative w-full max-w-md h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden mx-auto">

 {/* Background */}
 {story.mediaUrl ? (
 /^data:video|\.(mp4|webm|mov)(\?|$)/i.test(story.mediaUrl) ? (
 <video src={story.mediaUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
 ) : (
 <img loading="lazy" src={story.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
 )
 ) : (
 <div className={cn('absolute inset-0 bg-gradient-to-br', bgGradient)} />
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

 {/* Progress bars */}
 <div className="absolute top-3 inset-x-3 z-20 flex gap-1">
 {stories.map((_: any, i: number) => (
 <div key={i} className="flex-1 h-[3px] rounded-full bg-miamo-card/30 overflow-hidden">
 <div className="h-full bg-miamo-card rounded-full transition-all duration-100"
 style={{ width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%' }} />
 </div>
 ))}
 </div>

 {/* Author bar */}
 <div className="absolute top-8 inset-x-4 z-20 flex items-center gap-3">
 <Avatar src={photo} name={author.displayName || 'User'} size="sm" />
 <div className="flex-1">
 <p className="text-sm font-bold text-text-primary drop-shadow">{author.displayName || 'User'}</p>
 <p className="text-[10px] text-text-primary/70">{new Date(story.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
 </div>
 <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full bg-miamo-card/10 backdrop-blur flex items-center justify-center hover:bg-miamo-card/20">
 <MoreHorizontal className="w-5 h-5 text-text-primary" />
 </button>
 <button onClick={onClose} className="w-8 h-8 rounded-full bg-miamo-card/10 backdrop-blur flex items-center justify-center hover:bg-miamo-card/20">
 <X className="w-5 h-5 text-text-primary" />
 </button>
 </div>

 {/* Context menu */}
 <AnimatePresence>
 {showMenu && (
 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
 className="absolute top-20 right-4 z-30 bg-miamo-card rounded-2xl shadow-2xl py-2 w-48 overflow-hidden">
 {isOwn && (
 <>
 <button onClick={handlePostToFeed} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm">
 <Share2 className="w-4 h-4 text-rose-main" /> Post to Feed
 </button>
 {story.mediaUrl && (
 <button onClick={handleSaveMedia} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm">
 <Download className="w-4 h-4 text-rose-main" /> Save media
 </button>
 )}
 <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm">
 <Link2 className="w-4 h-4 text-rose-main" /> Copy link
 </button>
 <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-left text-sm text-red-500">
 <Trash2 className="w-4 h-4" /> Delete Story
 </button>
 </>
 )}
 {!isOwn && (
 <>
 {story.mediaUrl && (
 <button onClick={handleSaveMedia} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm">
 <Download className="w-4 h-4 text-rose-main" /> Save media
 </button>
 )}
 <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm">
 <Link2 className="w-4 h-4 text-rose-main" /> Copy link
 </button>
 <button onClick={handleMuteAuthor} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm">
 <BellOff className="w-4 h-4 text-rose-main" /> Mute {author.displayName?.split(' ')[0] || 'author'}
 </button>
 <button onClick={() => { api.reportUser({ reportedId: author.id, reason: 'inappropriate', targetType: 'story', targetId: story.id }).catch(() => {}); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm">
 <AlertCircle className="w-4 h-4 text-rose-main" /> Report
 </button>
 </>
 )}
 <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-miamo-surface text-left text-sm text-text-muted">
 <X className="w-4 h-4" /> Close
 </button>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Story content (text overlay) */}
 {!story.mediaUrl && (
 <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
 <p className="text-text-primary text-xl sm:text-2xl font-bold text-center drop-shadow-lg leading-relaxed">{text}</p>
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
 <div className="flex items-center gap-1 bg-black/40 backdrop-blur rounded-xl px-2 py-1.5">
 <button onClick={() => setViewersTab('views')} className="flex items-center gap-1.5 text-text-primary/80 hover:text-text-primary px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
 <Eye className="w-4 h-4" /> <span className="text-sm font-medium">{story.viewCount || 0}</span>
 </button>
 <button onClick={() => setViewersTab('likes')} className="flex items-center gap-1.5 text-text-primary/80 hover:text-text-primary px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
 <Heart className={cn('w-4 h-4', likeCount > 0 && 'text-rose-light fill-rose-main')} />
 <span className="text-sm font-medium">{likeCount}</span>
 </button>
 </div>
 )}

 {/* Action buttons for others' stories */}
 {!isOwn && (
 <div className="flex items-center gap-3">
 <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike}
 className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
 <Heart className={cn('w-6 h-6 transition-all', liked ? 'text-rose fill-rose-main scale-110' : 'text-text-primary')} />
 </motion.button>
 <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowReply(true)}
 className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors" title="Send message">
 <MessageCircle className="w-6 h-6 text-text-primary" />
 </motion.button>
 {likeCount > 0 && (
 <span className="text-xs text-text-primary/70 font-medium">{likeCount} like{likeCount !== 1 && 's'}</span>
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

 {/* Reply / Viewers drawers */}
 <AnimatePresence>
 {showReply && <ReplyToChatDrawer story={story} author={author} onClose={() => setShowReply(false)} />}
 {viewersTab && <ViewersDrawer story={story} initialTab={viewersTab} onClose={() => setViewersTab(null)} />}
 </AnimatePresence>
 </motion.div>
 );
}
