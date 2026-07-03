'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Heart, Ban, Mic, Check, CheckCheck, Reply, Edit3, Copy, Smile,
 MoreVertical, Trash2, EyeOff, Eye, Download, Clock, X,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { QUICK_REACTIONS, ALL_EMOJIS } from './constants';

export function MessageBubble({
 msg, isOwn, onReply, onEdit, onReact, onDeleteForMe, onDeleteForAll, onCopy, onHide, onDownload, onView,
}: {
 msg: any; isOwn: boolean;
 onReply: () => void; onEdit: () => void; onReact: (emoji: string) => void;
 onDeleteForMe: () => void; onDeleteForAll: () => void; onCopy: () => void; onHide: () => void;
 onDownload?: () => void; onView?: () => void;
}) {
 const [showMenu, setShowMenu] = useState(false);
 const [showReactions, setShowReactions] = useState(false);
 const [liked, setLiked] = useState(false);
 const longPressTimer = useRef<NodeJS.Timeout | null>(null);
 const lastTap = useRef<number>(0);

 // Double-tap to send ❤️
 const handleTap = () => {
 const now = Date.now();
 if (now - lastTap.current < 300) {
 setLiked(true);
 onReact('❤️');
 setTimeout(() => setLiked(false), 1200);
 }
 lastTap.current = now;
 };

 // Long press → context menu
 const handlePointerDown = () => { longPressTimer.current = setTimeout(() => setShowMenu(true), 500); };
 const handlePointerUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

 // Parse reactions
 let reactions: { emoji: string; count: number }[] = [];
 try {
 if (msg.reactions) {
 const parsed = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions;
 if (Array.isArray(parsed)) {
 const counts: Record<string, number> = {};
 parsed.forEach((r: any) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
 reactions = Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
 }
 }
 } catch {}

 const canEdit = isOwn && msg.createdAt && (Date.now() - new Date(msg.createdAt).getTime() < 2 * 60 * 60 * 1000);
 const canDeleteForAll = isOwn && canEdit;
 const isMedia = msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'file' || msg.content?.startsWith('📷') || msg.content?.startsWith('🎥') || msg.content?.startsWith('🎵') || msg.content?.startsWith('📄');

 // Story reply payload: [[STORY_REPLY:{json}]]\n<user text>
 let storyReply: { meta: any; body: string } | null = null;
 if (typeof msg.content === 'string' && msg.content.startsWith('[[STORY_REPLY:')) {
 const end = msg.content.indexOf(']]');
 if (end > 0) {
 try {
 const meta = JSON.parse(msg.content.slice(14, end));
 const body = msg.content.slice(end + 2).replace(/^\n/, '');
 storyReply = { meta, body };
 } catch {}
 }
 }
 // Legacy text format: Replying to story: "<snippet>"\n\n<user text>
 if (!storyReply && typeof msg.content === 'string') {
 const m = msg.content.match(/^Replying to story:\s*"([^"]*)"\s*\n+([\s\S]*)$/);
 if (m) storyReply = { meta: { text: m[1], expiresAt: 0 }, body: m[2] };
 }
 const storyExpired = !!(storyReply && storyReply.meta?.expiresAt && Date.now() > Number(storyReply.meta.expiresAt));

 if (msg.deletedForAll) {
 return (
 <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
 <div className="max-w-[70%] px-4 py-2.5 rounded-2xl bg-miamo-elevated/30 border border-border/20">
 <p className="text-xs text-text-muted italic flex items-center gap-1.5"><Ban className="w-3 h-3" /> This message was deleted</p>
 </div>
 </div>
 );
 }

 return (
 <div className={cn('flex group relative', isOwn ? 'justify-end' : 'justify-start')}>
 {/* Heart animation on double-tap */}
 <AnimatePresence>
 {liked && (
 <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
 transition={{ type: 'spring', stiffness: 400 }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
 <Heart className="w-12 h-12 text-rose fill-rose-main" />
 </motion.div>
 )}
 </AnimatePresence>

 <div className="relative max-w-[70%]">
 {/* Reply reference */}
 {msg.replyTo && (
 <div className={cn('text-[10px] px-3 py-1 mb-0.5 rounded-t-xl border-l-2',
 isOwn ? 'border-rose-main/50 bg-rose-main/5 text-rose-light/70' : 'border-text-muted/30 bg-miamo-elevated/50 text-text-muted'
 )}>
 <span className="font-semibold">{msg.replyTo.senderName || 'User'}</span>
 <p className="truncate">{msg.replyTo.content}</p>
 </div>
 )}

 <div onClick={handleTap} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
 onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
 className={cn(
 'px-4 py-2.5 rounded-2xl text-sm cursor-pointer select-none transition-all',
 isOwn ? 'bg-gradient-to-r from-rose-main/20 to-rose-dark/20 text-text-primary rounded-br-md shadow-sm'
 : 'bg-miamo-elevated text-text-primary rounded-bl-md',
 msg.type === 'image' && 'p-1',
 )}>
 {msg.type === 'voice' ? (
 <div className="flex items-center gap-2 min-w-[160px]">
 <div className="w-8 h-8 rounded-full bg-rose-main/20 flex items-center justify-center shrink-0"><Mic className="w-4 h-4 text-rose-main" /></div>
 <div className="flex-1 h-1 bg-text-muted/20 rounded-full"><div className="h-full w-2/3 bg-rose-main rounded-full" /></div>
 <span className="text-[10px] text-text-muted">0:12</span>
 </div> ) : storyReply ? (
 <div className="space-y-1.5">
 <div className={cn(
 'flex items-stretch gap-2 rounded-xl overflow-hidden border-l-2 pl-2 pr-2 py-1.5',
 isOwn ? 'border-rose-main/60 bg-rose-main/10' : 'border-text-muted/40 bg-miamo-card/40'
 )}>
 {storyExpired ? (
 <div className="w-10 h-12 rounded-md bg-miamo-elevated/60 flex items-center justify-center shrink-0">
 <EyeOff className="w-4 h-4 text-text-muted/60" />
 </div>
 ) : storyReply.meta?.mediaUrl ? (
 /^data:video|\.(mp4|webm|mov)(\?|$)/i.test(storyReply.meta.mediaUrl) ? (
 <video src={storyReply.meta.mediaUrl} className="w-10 h-12 rounded-md object-cover shrink-0" muted playsInline />
 ) : (
 <img src={storyReply.meta.mediaUrl} alt="" loading="lazy" className="w-10 h-12 rounded-md object-cover shrink-0" />
 )
 ) : (
 <div className="w-10 h-12 rounded-md bg-gradient-to-br from-rose-main/40 to-rose-dark/40 flex items-center justify-center shrink-0">
 <span className="text-[8px] text-text-primary/80 px-1 text-center line-clamp-2">{storyReply.meta?.text || ''}</span>
 </div>
 )}
 <div className="flex flex-col justify-center min-w-0">
 <span className="text-[10px] uppercase tracking-wide font-semibold text-text-muted/80">
 {storyExpired ? 'Story unavailable' : 'Replied to story'}
 </span>
 {!storyExpired && storyReply.meta?.text && (
 <span className="text-[11px] text-text-muted truncate max-w-[180px]">{storyReply.meta.text}</span>
 )}
 </div>
 </div>
 <p className="whitespace-pre-wrap break-words">{storyReply.body}</p>
 </div> ) : (
 <p className="whitespace-pre-wrap break-words">{msg.content}</p>
 )}
 <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
 <span className={cn('text-[10px]', isOwn ? 'text-rose-light/50' : 'text-text-muted/50')}>
 {msg.createdAt ? formatRelativeTime(msg.createdAt) : ''}
 </span>
 {msg.editedAt && <span className="text-[9px] text-text-muted/40 italic">edited</span>}
 {isOwn && <span className="ml-0.5">{msg.read ? <CheckCheck className="w-3 h-3 text-rose-main" /> : <Check className="w-3 h-3 text-text-muted/40" />}</span>}
 </div>
 </div>

 {/* Reactions below bubble */}
 {reactions.length > 0 && (
 <div className={cn('flex gap-0.5 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
 {reactions.map((r, i) => (
 <span key={i} className="bg-miamo-elevated border border-border/30 rounded-full px-1.5 py-0.5 text-[11px] flex items-center gap-0.5">
 {r.emoji} {r.count > 1 && <span className="text-text-muted text-[9px]">{r.count}</span>}
 </span>
 ))}
 </div>
 )}

 {/* Hover action buttons */}
 <div className={cn(
 'absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-miamo-card border border-border/30 rounded-lg shadow-lg p-0.5',
 isOwn ? 'right-full mr-1' : 'left-full ml-1'
 )}>
 <button onClick={() => setShowReactions(true)} className="p-1 hover:bg-miamo-elevated rounded text-text-muted hover:text-text-primary" title="React"><Smile className="w-3.5 h-3.5" /></button>
 <button onClick={onReply} className="p-1 hover:bg-miamo-elevated rounded text-text-muted hover:text-text-primary" title="Reply"><Reply className="w-3.5 h-3.5" /></button>
 <button onClick={() => setShowMenu(true)} className="p-1 hover:bg-miamo-elevated rounded text-text-muted hover:text-text-primary" title="More"><MoreVertical className="w-3.5 h-3.5" /></button>
 </div>

 {/* Emoji reaction picker */}
 <AnimatePresence>
 {showReactions && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setShowReactions(false)} />
 <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
 className={cn('absolute z-50 bg-miamo-card border border-border rounded-2xl shadow-xl p-2 flex flex-wrap gap-1 max-w-[220px]',
 isOwn ? 'right-0' : 'left-0', 'bottom-full mb-2')}>
 {ALL_EMOJIS.map(emoji => (
 <button key={emoji} onClick={() => { onReact(emoji); setShowReactions(false); }}
 className="w-8 h-8 rounded-lg hover:bg-miamo-elevated flex items-center justify-center text-lg hover:scale-125 transition-transform">{emoji}</button>
 ))}
 </motion.div>
 </>
 )}
 </AnimatePresence>

 {/* Context menu */}
 <AnimatePresence>
 {showMenu && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
 className={cn('absolute z-50 bg-miamo-card border border-border rounded-xl shadow-xl py-1 w-48',
 isOwn ? 'right-0' : 'left-0', 'top-full mt-1')}>
 {/* Quick reactions row at top */}
 <div className="flex gap-1 px-2 py-1.5 border-b border-border/30">
 {QUICK_REACTIONS.map(emoji => (
 <button key={emoji} onClick={() => { onReact(emoji); setShowMenu(false); }}
 className="w-7 h-7 rounded-lg hover:bg-miamo-elevated flex items-center justify-center text-base hover:scale-110 transition-transform">{emoji}</button>
 ))}
 </div>
 <button onClick={() => { onReply(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Reply className="w-3 h-3" /> Reply</button>
 <button onClick={() => { onCopy(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Copy className="w-3 h-3" /> Copy text</button>
 {canEdit && <button onClick={() => { onEdit(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Edit3 className="w-3 h-3" /> Edit <span className="ml-auto text-[9px] text-text-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> 2h</span></button>}
 {isMedia && onView && <button onClick={() => { onView(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Eye className="w-3 h-3" /> View</button>}
 {isMedia && onDownload && <button onClick={() => { onDownload(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Download className="w-3 h-3" /> Download</button>}
 <button onClick={() => { onHide(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><EyeOff className="w-3 h-3" /> Hide message</button>
 <div className="h-px bg-border/30 my-0.5" />
 <button onClick={() => { onDeleteForMe(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-rose-alt hover:bg-rose-main/10 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Delete for me</button>
 {canDeleteForAll && (
 <button onClick={() => { onDeleteForAll(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
 <Trash2 className="w-3 h-3" /> Delete for everyone
 <span className="ml-auto text-[9px] text-text-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> 2h</span>
 </button>
 )}
 </motion.div>
 </>
 )}
 </AnimatePresence>
 </div>
 </div>
 );
}
