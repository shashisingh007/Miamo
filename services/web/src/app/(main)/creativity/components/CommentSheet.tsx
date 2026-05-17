'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
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

  useEffect(() => {
    if (isOpen && itemId) {
      setLoading(true);
      api.getCreativityComments(itemId).then(res => setComments(res.data || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [isOpen, itemId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.commentOnCreativity(itemId, text.trim());
      if (res.data) setComments(prev => [res.data, ...prev]);
      setText('');
    } catch {} finally { setSending(false); }
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
            className="fixed bottom-0 inset-x-0 max-h-[70vh] bg-white border-t border-gray-200 rounded-t-[20px] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-[14px] font-bold text-gray-900">{commentCount} Comments</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-pink-50">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <img src="/logo.png" alt="" className="w-6 h-6 rounded animate-pulse" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-[12px] text-gray-400 py-8">No comments yet — be the first!</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-gray-400">
                      {(c.author?.displayName || 'U')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-700">{c.author?.displayName || 'User'}</span>
                        {c.author?.verified && <Shield className="w-3 h-3 text-gray-400" />}
                        <span className="text-[10px] text-gray-300">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 leading-relaxed mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-200">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Add a comment..."
                className="flex-1 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[13px] px-4 focus:border-pink-200 focus:outline-none placeholder:text-gray-400"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                  text.trim() ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-300',
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
