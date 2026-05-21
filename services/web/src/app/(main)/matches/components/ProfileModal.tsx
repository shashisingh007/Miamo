'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 ArrowLeft, MoreHorizontal, Shield, MapPin, Briefcase,
 Flag, Ban, EyeOff, Pause, Heart, Sparkles, Wand2, Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function ProfileModal({
 isOpen, onClose, incoming, onMatchBack, onMatchMove, onHold, onHide, onReport, onBlock,
}: {
 isOpen: boolean; onClose: () => void;
 incoming: any;
 onMatchBack: () => void;
 onMatchMove: (msg: string) => void;
 onHold: () => void;
 onHide: () => void;
 onReport: () => void;
 onBlock: () => void;
}) {
 const [showMoveInput, setShowMoveInput] = useState(false);
 const [moveMessage, setMoveMessage] = useState('');
 const [suggestions, setSuggestions] = useState<string[]>([]);
 const [loadingSuggestions, setLoadingSuggestions] = useState(false);
 const [showActions, setShowActions] = useState(false);

 const user = incoming?.user;

 useEffect(() => {
 if (isOpen && user?.id) {
 setShowMoveInput(false);
 setMoveMessage('');
 setSuggestions([]);
 setShowActions(false);
 setLoadingSuggestions(true);
 api.getMatchSuggestions(user.id).then(r => setSuggestions(r.data || [])).catch(() => {}).finally(() => setLoadingSuggestions(false));
 }
 }, [isOpen, user?.id]);

 if (!isOpen || !user) return null;

 const photos = user.photos || [];
 const profile = user.profile || {};
 const interests = user.interests || [];
 const prompts = user.prompts || [];
 const name = user.displayName || 'User';
 const age = profile.age;
 const city = profile.city;
 const profession = profile.profession;
 const bio = profile.bio;
 const verified = user.verified;

 return (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50" onClick={onClose} />
 <motion.div
 initial={{ opacity: 0, y: 40, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 40, scale: 0.95 }}
 transition={{ type: 'spring', damping: 28, stiffness: 300 }}
 className="fixed inset-x-3 top-[2%] bottom-[2%] max-w-lg mx-auto bg-miamo-card border border-border rounded-[24px] shadow-2xl z-50 overflow-hidden flex flex-col"
 >
 {/* Header bar */}
 <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
 <button onClick={onClose} className="w-9 h-9 rounded-xl bg-miamo-surface flex items-center justify-center hover:bg-miamo-surface transition">
 <ArrowLeft className="w-4 h-4 text-text-secondary" />
 </button>
 <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
 {incoming.type === 'move' ? '💫 Miamo Move' : incoming.type === 'like' ? '❤️ Liked You' : '💬 Sent a thought'}
 </span>
 <button onClick={() => setShowActions(!showActions)} className="w-9 h-9 rounded-xl bg-miamo-surface flex items-center justify-center hover:bg-miamo-surface transition">
 <MoreHorizontal className="w-4 h-4 text-text-secondary" />
 </button>
 </div>

 {/* More actions dropdown */}
 <AnimatePresence>
 {showActions && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="border-b border-border overflow-hidden"
 >
 <div className="px-4 py-3 flex gap-2 flex-wrap">
 <button onClick={() => { onReport(); onClose(); }}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-semibold hover:bg-orange-500/20 transition">
 <Flag className="w-3 h-3" /> Report
 </button>
 <button onClick={() => { onBlock(); onClose(); }}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition">
 <Ban className="w-3 h-3" /> Block
 </button>
 <button onClick={() => { onHide(); onClose(); }}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-miamo-surface border border-border text-text-muted text-[11px] font-semibold hover:bg-miamo-surface transition">
 <EyeOff className="w-3 h-3" /> Hide
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Scrollable profile content */}
 <div className="flex-1 overflow-y-auto">
 {/* Photos */}
 <div className="relative">
 {photos.length > 0 ? (
 <div className="aspect-[3/4] max-h-[320px] overflow-hidden">
 <img loading="lazy" src={photos[0]?.url || photos[0]} alt={name} className="w-full h-full object-cover" />
 </div>
 ) : (
 <div className="aspect-[3/4] max-h-[260px] bg-gradient-to-b from-white/[0.04] to-transparent flex items-center justify-center">
 <div className="w-20 h-20 rounded-full bg-miamo-surface flex items-center justify-center text-3xl font-black text-text-secondary">
 {name[0]}
 </div>
 </div>
 )}
 <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#13131f] to-transparent" />
 </div>

 <div className="px-5 -mt-6 relative z-10">
 {/* Name & basics */}
 <div className="flex items-center gap-2 mb-1">
 <h2 className="text-xl font-extrabold text-text-primary">{name}</h2>
 {age && <span className="text-[14px] text-text-muted font-medium">{age}</span>}
 {verified && (
 <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
 <Shield className="w-3 h-3 text-blue-400" />
 </div>
 )}
 </div>
 <div className="flex items-center gap-3 text-[12px] text-text-muted mb-4">
 {city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{city}</span>}
 {profession && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{profession}</span>}
 </div>

 {/* Their message/move */}
 {incoming.message && (
 <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-rose-main/10 to-rose- /10 border border-rose-main/15">
 <p className="text-[10px] font-bold text-purple-300/60 uppercase tracking-wider mb-1.5">
 {incoming.type === 'move' ? '💫 Their Miamo Move' : '💬 Their Message'}
 </p>
 <p className="text-[13px] text-text-primary leading-relaxed">&ldquo;{incoming.message}&rdquo;</p>
 </div>
 )}

 {/* Bio */}
 {bio && <div className="mb-4"><p className="text-[13px] text-text-muted leading-relaxed">{bio}</p></div>}

 {/* Interests */}
 {interests.length > 0 && (
 <div className="mb-4">
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Interests</p>
 <div className="flex flex-wrap gap-1.5">
 {interests.map((i: any) => (
 <span key={i.id || i.name} className="px-2.5 py-1 rounded-lg bg-miamo-surface border border-border text-[11px] text-text-muted font-medium">
 {i.name}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Prompts */}
 {prompts.length > 0 && (
 <div className="mb-4 space-y-3">
 {prompts.slice(0, 2).map((p: any) => (
 <div key={p.id} className="p-3 rounded-xl card-premium">
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{p.question}</p>
 <p className="text-[12px] text-text-secondary">{p.answer}</p>
 </div>
 ))}
 </div>
 )}

 {/* Additional photos */}
 {photos.length > 1 && (
 <div className="mb-4 grid grid-cols-3 gap-2">
 {photos.slice(1, 4).map((p: any, idx: number) => (
 <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-miamo-surface">
 <img loading="lazy" src={p.url || p} alt="" className="w-full h-full object-cover" />
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Action bar */}
 <div className="flex-shrink-0 border-t border-border p-4">
 {!showMoveInput ? (
 <div className="space-y-3">
 {/* Primary actions */}
 <div className="flex gap-2">
 <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onMatchBack}
 className="flex-1 h-12 rounded-xl bg-gradient-rose text-text-primary text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_30px_rgba(236,72,153,0.4)] transition-all">
 <Heart className="w-4 h-4 fill-white" /> Match Back
 </motion.button>
 <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowMoveInput(true)}
 className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#C97856] to-[#B8694A] text-text-primary text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(201,120,86,0.3)] hover:shadow-[0_4px_30px_rgba(201,120,86,0.4)] transition-all">
 <Sparkles className="w-4 h-4" /> Miamo Move
 </motion.button>
 </div>
 {/* Secondary actions */}
 <div className="flex gap-2">
 <button onClick={onHold}
 className="flex-1 h-10 rounded-xl bg-miamo-surface border border-border text-text-muted text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-miamo-surface hover:text-text-secondary transition-all">
 <Pause className="w-3.5 h-3.5" /> Hold for Now
 </button>
 <button onClick={() => { onHide(); onClose(); }}
 className="flex-1 h-10 rounded-xl bg-miamo-surface border border-border text-text-muted text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-miamo-surface hover:text-text-secondary transition-all">
 <EyeOff className="w-3.5 h-3.5" /> Not Interested
 </button>
 </div>
 </div>
 ) : (
 <div className="space-y-3">
 {/* AI Suggestion chips */}
 {loadingSuggestions ? (
 <div className="flex items-center gap-2 text-text-secondary text-[11px]">
 <Wand2 className="w-3.5 h-3.5 animate-pulse" /> Loading AI suggestions...
 </div>
 ) : suggestions.length > 0 && (
 <div>
 <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
 <Wand2 className="w-3 h-3 text-purple-400" /> AI Suggestions
 </p>
 <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
 {suggestions.map((s, i) => (
 <button key={i} onClick={() => setMoveMessage(s)}
 className="shrink-0 max-w-[200px] px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/15 text-[11px] text-purple-200 text-left hover:bg-purple-500/20 transition truncate">
 {s}
 </button>
 ))}
 </div>
 </div>
 )}
 {/* Input */}
 <div className="flex gap-2">
 <button onClick={() => setShowMoveInput(false)}
 className="w-10 h-10 rounded-xl bg-miamo-surface flex items-center justify-center hover:bg-miamo-surface transition flex-shrink-0">
 <ArrowLeft className="w-4 h-4 text-text-muted" />
 </button>
 <input
 value={moveMessage}
 onChange={e => setMoveMessage(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter' && moveMessage.trim()) onMatchMove(moveMessage.trim()); }}
 placeholder="Write your Miamo Move..."
 autoFocus
 className="flex-1 h-10 rounded-xl bg-miamo-surface border border-border text-text-primary text-[12px] px-4 focus:border-purple-500/30 focus:outline-none placeholder:text-text-muted transition"
 />
 <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
 onClick={() => { if (moveMessage.trim()) onMatchMove(moveMessage.trim()); }}
 disabled={!moveMessage.trim()}
 className={cn(
 'w-10 h-10 rounded-xl flex items-center justify-center transition flex-shrink-0',
 moveMessage.trim() ? 'bg-purple-500 text-text-primary' : 'bg-miamo-surface text-text-secondary',
 )}>
 <Send className="w-4 h-4" />
 </motion.button>
 </div>
 {!moveMessage.trim() && (
 <p className="text-[10px] text-text-secondary text-center">Pick a suggestion or write your own opener</p>
 )}
 </div>
 )}
 </div>
 </motion.div>
 </>
 );
}
