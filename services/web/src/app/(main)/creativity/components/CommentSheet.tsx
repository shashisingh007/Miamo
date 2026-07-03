'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { logError } from '@/lib/logError';
import { useToast } from '@/components/ui/toast';
import { timeAgo } from './constants';

/* ═══════════════════════════════════════════════════════
 COMMENT SHEET (Bottom slide-up)
 ═══════════════════════════════════════════════════════ */
export function CommentSheet({
 isOpen, onClose, itemId, commentCount,
}: {
 isOpen: boolean; onClose: () => void; itemId: string; commentCount: number;
}) {
 const [comments, setComments] = useState<any[]>([]);
 const [text, setText] = useState('');
 const [loading, setLoading] = useState(false);
 const [sending, setSending] = useState(false);
 const [loadError, setLoadError] = useState<string | null>(null);
 const toast = useToast();

 // click-matrix.md §5 rank 12: load-error was swallowed — user saw "No comments
 // yet" identical to a real empty state. Track the failure separately.
 useEffect(() => {
  if (isOpen && itemId) {
   setLoading(true);
   setLoadError(null);
   api
    .getCreativityComments(itemId)
    .then((res) => setComments(res.data || []))
    .catch((e) => {
     logError('creativity.getComments', e);
     setLoadError('Could not load comments.');
    })
    .finally(() => setLoading(false));
  }
 }, [isOpen, itemId]);

 // click-matrix.md §5 rank 12: swallow was hiding write failures — comment
 // vanished from the input with no confirmation and no post.
 const handleSend = async () => {
  if (!text.trim() || sending) return;
  const draft = text.trim();
  setSending(true);
  try {
   const res = await api.commentOnCreativity(itemId, draft);
   if (res.data) setComments((prev) => [res.data, ...prev]);
   setText('');
  } catch (e: any) {
   logError('creativity.commentOnCreativity', e);
   toast.error('Comment failed', e?.message || 'Try again');
  } finally {
   setSending(false);
  }
 };

 return (
 <AnimatePresence>
 {isOpen && (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
 <motion.div
 initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
 className="fixed bottom-0 inset-x-0 max-h-[70vh] bg-miamo-card border-t border-border rounded-t-[20px] z-50 flex flex-col pb-[env(safe-area-inset-bottom)]"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b border-border">
 <h3 className="text-[14px] font-bold text-text-primary">{commentCount} Comments</h3>
 <button onClick={onClose} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center hover:bg-miamo-surface">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 {/* Comments list */}
 <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
 {loading ? (
 <div className="flex justify-center py-8">
 <img src="/assets/logo.svg" alt="" className="w-6 h-6 rounded-lg animate-pulse" />
 </div>
 ) : loadError ? (
 <p className="text-center text-[12px] text-red-400 py-8">{loadError}</p>
 ) : comments.length === 0 ? (
 <p className="text-center text-[12px] text-text-muted py-8">No comments yet — be the first!</p>
 ) : (
 comments.map((c: any) => (
 <div key={c.id} className="flex gap-3">
 <div className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-text-muted">
 {(c.author?.displayName || 'U')[0]}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-bold text-text-secondary">{c.author?.displayName || 'User'}</span>
 {c.author?.verified && <Shield className="w-3 h-3 text-text-muted" />}
 <span className="text-[10px] text-text-secondary">{timeAgo(c.createdAt)}</span>
 </div>
 <p className="text-[12px] text-text-secondary leading-relaxed mt-0.5">{c.content}</p>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Input */}
 <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
 <input
 value={text}
 onChange={e => setText(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleSend()}
 placeholder="Add a comment..."
 className="flex-1 h-10 rounded-xl bg-miamo-surface border border-border text-text-primary text-[13px] px-4 focus:border-border focus:outline-none placeholder:text-text-muted"
 />
 <motion.button
 whileTap={{ scale: 0.9 }}
 onClick={handleSend}
 disabled={!text.trim() || sending}
 className={cn(
 'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
 text.trim() ? 'bg-miamo-card text-text-primary' : 'bg-miamo-surface text-text-secondary',
 )}
 >
 <Send className="w-4 h-4" />
 </motion.button>
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
}
