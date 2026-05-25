'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserMinus, Ban, Flag, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REPORT_REASONS, BLOCK_REASONS, UNMATCH_REASONS } from './constants';

export function MessagesFeedbackModal({ type, userName, onClose, onSubmit }: {
 type: 'unmatch' | 'report' | 'block';
 userName: string;
 onClose: () => void;
 onSubmit: (reason: string, details: string) => Promise<void>;
}) {
 const [selectedReason, setSelectedReason] = useState('');
 const [details, setDetails] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [done, setDone] = useState(false);

 const reasons = type === 'report' ? REPORT_REASONS : type === 'block' ? BLOCK_REASONS : UNMATCH_REASONS;
 const title = type === 'report' ? 'Report' : type === 'block' ? 'Block' : 'Unmatch';
 const subtitle = type === 'report' ? 'Help keep Miamo safe' : type === 'block' ? 'They won\'t be able to contact you' : 'Help us improve your matches';
 const iconColor = type === 'report' ? 'text-red-400 bg-red-400/10' : type === 'block' ? 'text-red-400 bg-red-400/10' : 'text-rose-alt bg-rose-alt/10';
 const submitColor = type === 'unmatch' ? 'bg-miamo-card text-[#FAF8F5]' : 'bg-red-500 text-text-primary';

 const handleSubmit = async () => {
 if (!selectedReason) return;
 setSubmitting(true);
 try {
 await onSubmit(selectedReason, details);
 setDone(true);
 setTimeout(() => { setDone(false); onClose(); }, 1500);
 } catch {} finally { setSubmitting(false); }
 };

 return (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" onClick={onClose} />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="fixed inset-x-4 top-[5%] max-w-md mx-auto bg-miamo-card border border-border rounded-[20px] shadow-2xl z-[60] overflow-hidden max-h-[90vh] flex flex-col"
 >
 <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
 <div className="flex items-center gap-3">
 <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconColor)}>
 {type === 'unmatch' ? <UserMinus className="w-5 h-5" /> : type === 'block' ? <Ban className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
 </div>
 <div>
 <h3 className="text-[15px] font-bold text-text-primary">{title} {userName}</h3>
 <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
 </div>
 </div>
 <button onClick={onClose} className="w-8 h-8 rounded-lg bg-miamo-surface flex items-center justify-center hover:bg-miamo-surface transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>
 {done ? (
 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center py-16">
 <div className="text-center">
 <div className="w-14 h-14 rounded-full bg-rose-alt/10 flex items-center justify-center mx-auto mb-4">
 <Check className="w-7 h-7 text-rose-alt" />
 </div>
 <p className="text-[14px] font-semibold text-text-primary">Thank you for your feedback</p>
 <p className="text-[11px] text-text-muted mt-1">This helps our AI improve your experience</p>
 </div>
 </motion.div>
 ) : (
 <>
 <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5">
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-3 px-1">Select a reason</p>
 {reasons.map((reason) => {
 const isActive = selectedReason === reason;
 return (
 <button key={reason} onClick={() => setSelectedReason(reason)}
 className={cn(
 'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
 isActive ? 'bg-miamo-surface border-border' : 'bg-transparent border-border hover:bg-miamo-surface',
 )}>
 <span className={cn('text-[13px] font-medium', isActive ? 'text-text-primary' : 'text-text-muted')}>{reason}</span>
 {isActive && (
 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto w-5 h-5 rounded-full bg-miamo-card flex items-center justify-center">
 <Check className="w-3 h-3 text-[#151522]" />
 </motion.div>
 )}
 </button>
 );
 })}
 <div className="pt-3">
 <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Additional details (optional) — helps our AI learn your preferences"
 className="w-full h-20 rounded-xl bg-miamo-surface border border-border text-text-primary text-[12px] px-4 py-3 resize-none focus:border-border focus:outline-none placeholder:text-text-muted transition-colors" />
 </div>
 </div>
 <div className="flex-shrink-0 px-5 py-4 border-t border-border flex gap-3">
 <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-text-muted text-[13px] font-semibold hover:bg-miamo-surface transition-all">Cancel</button>
 <button onClick={handleSubmit} disabled={!selectedReason || submitting}
 className={cn(
 'flex-1 h-11 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2',
 selectedReason ? submitColor : 'bg-miamo-surface text-text-secondary cursor-not-allowed',
 )}>
 {submitting ? <img src="/assets/logo.svg" alt="" className="w-4 h-4 rounded-lg animate-pulse" /> : title}
 </button>
 </div>
 </>
 )}
 </motion.div>
 </>
 );
}
