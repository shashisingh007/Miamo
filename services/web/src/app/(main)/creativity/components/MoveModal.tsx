'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Check, Send } from 'lucide-react';
import { api } from '@/lib/api';

/* ═══════════════════════════════════════════════════════
 MIAMO MOVE MODAL — Send interest from content
 ═══════════════════════════════════════════════════════ */
export function MoveModal({
 isOpen, onClose, item,
}: {
 isOpen: boolean; onClose: () => void; item: any;
}) {
 const [message, setMessage] = useState('');
 const [sent, setSent] = useState(false);
 const [sending, setSending] = useState(false);

 const handleSend = async () => {
 if (sending) return;
 setSending(true);
 try {
 await api.sendCreativityMove(item.id, message || undefined);
 setSent(true);
 setTimeout(() => { setSent(false); onClose(); setMessage(''); }, 1500);
 } catch {} finally { setSending(false); }
 };

 return (
 <AnimatePresence>
 {isOpen && (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" onClick={onClose} />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="fixed inset-x-4 bottom-8 max-w-sm mx-auto bg-miamo-card border border-border rounded-[20px] shadow-2xl z-50 overflow-hidden"
 >
 {sent ? (
 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 text-center">
 <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
 <Check className="w-7 h-7 text-emerald-400" />
 </div>
 <p className="text-[14px] font-semibold text-text-primary">Miamo Move sent!</p>
 <p className="text-[12px] text-text-muted mt-1">They'll see your interest</p>
 </motion.div>
 ) : (
 <div className="p-5">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-full bg-miamo-card flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)]">
 <Heart className="w-5 h-5 text-[#151522]" fill="#151522" />
 </div>
 <div>
 <h4 className="text-[13px] font-bold text-text-primary">Miamo Move</h4>
 <p className="text-[11px] text-text-muted">
 Interested in {item?.author?.displayName || 'this person'}?
 </p>
 </div>
 <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>

 <div className="rounded-xl bg-miamo-surface border border-border p-3 mb-4">
 <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">Reacting to</p>
 <p className="text-[13px] text-text-secondary font-medium">{item?.title || 'Content'}</p>
 </div>

 <textarea
 value={message}
 onChange={e => setMessage(e.target.value)}
 placeholder="Write a message (optional)..."
 className="w-full h-20 rounded-xl bg-miamo-surface border border-border text-text-primary text-[13px] px-4 py-3 resize-none focus:border-border focus:outline-none placeholder:text-text-muted mb-4"
 />

 <button
 onClick={handleSend}
 disabled={sending}
 className="w-full h-11 rounded-xl bg-miamo-card text-text-primary text-[13px] font-bold hover:bg-miamo-card/90 transition-all flex items-center justify-center gap-2"
 >
 {sending ? <img src="/assets/logo.svg" alt="" className="w-4 h-4 rounded-lg animate-pulse" /> : <>
 <Send className="w-4 h-4" /> Send Move
 </>}
 </button>
 </div>
 )}
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
}
