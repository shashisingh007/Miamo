'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Heart, X, MapPin, Briefcase, Shield, Star, ChevronDown, Sparkles,
 Send, Cigarette, Wine, Dumbbell, GraduationCap, Baby, Dog, Moon,
 Globe, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type DiscoverProfile, type AiData } from './constants';

export function ProfileCard({
 user, aiData, onPass, onMove, onSuperLike, isActive,
}: {
 user: DiscoverProfile;
 aiData: AiData | null;
 onPass: () => void;
 onMove: (message: string, targetType: string, targetId?: string) => void;
 onSuperLike?: () => void;
 isActive: boolean;
}) {
 const [moveTarget, setMoveTarget] = useState<{ type: string; id?: string } | null>(null);
 const [moveText, setMoveText] = useState('');
 const [showMoveRecs, setShowMoveRecs] = useState(false);

 const photos = user.photos || [];
 const profile = user.profile || {};
 const prompts = user.prompts || [];
 const interests = user.interests || [];
 const commonInterests = user.commonInterests || [];

 const handleLikeContent = (type: string, id?: string) => {
 setMoveTarget({ type, id });
 setMoveText('');
 setShowMoveRecs(false);
 };

 const handleSendMove = () => {
 if (moveTarget) {
 onMove(moveText, moveTarget.type, moveTarget.id);
 setMoveTarget(null);
 setMoveText('');
 }
 };

 if (!isActive) return null;

 // Lifestyle items
 const lifestyleItems = useMemo(() => [
 profile.smoking && { icon: Cigarette, label: profile.smoking, color: 'text-rose-alt' },
 profile.drinking && { icon: Wine, label: profile.drinking, color: 'text-rose-alt' },
 profile.exercise && { icon: Dumbbell, label: profile.exercise, color: 'text-rose-alt' },
 profile.education && { icon: GraduationCap, label: profile.education, color: 'text-rose-alt' },
 profile.zodiac && { icon: Moon, label: profile.zodiac, color: 'text-rose-alt' },
 profile.languages && { icon: Globe, label: profile.languages, color: 'text-rose-alt' },
 profile.pets && profile.pets !== 'none' && { icon: Dog, label: profile.pets, color: 'text-rose-alt' },
 profile.children && { icon: Baby, label: profile.children, color: 'text-rose-light' },
 ].filter(Boolean) as { icon: any; label: string; color: string }[], [profile]);

 return (
 <div className="w-full">
 {/* Card container */}
 <div className="rounded-[20px] overflow-hidden bg-miamo-card border border-border shadow-[0_8px_40px_rgba(201,120,86,0.08)](232,93,117,0.04)]">

 {/* ─── Main Photo ─── */}
 <div className="relative">
 {photos[0] ? (
 <div className="aspect-[3/4] max-h-[520px] overflow-hidden relative group">
 <img src={photos[0].url || photos[0]} alt={user.displayName}
 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
 <div className="absolute bottom-0 inset-x-0 px-6 pb-6">
 <div className="flex items-end justify-between">
 <div>
 <div className="flex items-center gap-2.5 mb-1">
 <h2 className="text-[28px] font-extrabold text-text-primary tracking-tight leading-none">
 {user.displayName}{profile.age ? `, ${profile.age}` : ''}
 </h2>
 {user.verified && (
 <motion.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
 className="w-6 h-6 bg-miamo-card rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.3)]"
 >
 <Shield className="w-3.5 h-3.5 text-text-primary" />
 </motion.div>
 )}
 </div>
 <div className="flex items-center gap-3 text-[13px] text-text-primary/80">
 {profile.city && (
 <span className="flex items-center gap-1">
 <MapPin className="w-3 h-3" />{profile.city}
 </span>
 )}
 {profile.profession && (
 <span className="flex items-center gap-1 max-w-[200px] truncate">
 <Briefcase className="w-3 h-3" />{profile.profession}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 {/* Like button */}
 <motion.button
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.9 }}
 onClick={() => handleLikeContent('photo', photos[0]?.id)}
 className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-miamo-surface backdrop-blur-xl border border-border flex items-center justify-center hover:bg-miamo-surface transition-all shadow-lg"
 >
 <Heart className="w-5 h-5 text-rose" />
 </motion.button>
 </div>
 ) : (
 <div className="aspect-[3/4] max-h-[520px] bg-gradient-to-br from-rose-main/10 to-rose- /10 flex items-center justify-center relative">
 <span className="text-8xl text-text-secondary font-black">{user.displayName?.[0]}</span>
 <div className="absolute bottom-0 inset-x-0 px-6 pb-6">
 <h2 className="text-[28px] font-extrabold text-text-primary">{user.displayName}{profile.age ? `, ${profile.age}` : ''}</h2>
 </div>
 </div>
 )}
 </div>

 {/* ─── Tags Row ─── */}
 <div className="px-6 pt-5 pb-1">
 <div className="flex flex-wrap gap-2">
 {profile.lookingFor && profile.lookingFor !== 'open' && (
 <span className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-miamo-card text-text-primary shadow-md">
 {profile.lookingFor.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
 </span>
 )}
 {profile.datingIntent && (
 <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-rose-main/15 text-rose-light border border-rose-main/20">
 {profile.datingIntent}
 </span>
 )}
 {profile.online && (
 <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-rose-alt/15 text-rose-light border border-rose-alt/20 flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-rose-alt animate-pulse" /> Online
 </span>
 )}
 {profile.height && (
 <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-miamo-surface text-text-secondary border border-border">
 {profile.height} cm
 </span>
 )}
 </div>
 </div>

 {/* ─── Bio ─── */}
 {profile.bio && (
 <div className="px-6 py-4">
 <p className="text-[14px] text-text-primary leading-[1.7] font-light">{profile.bio}</p>
 </div>
 )}

 {/* ─── Second Photo ─── */}
 {photos[1] && (
 <div className="mx-6 my-2 rounded-2xl overflow-hidden relative group">
 <img loading="lazy" src={photos[1].url || photos[1]} alt="" className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
 onClick={() => handleLikeContent('photo', photos[1]?.id)}
 className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-miamo-surface backdrop-blur-xl border border-border flex items-center justify-center hover:bg-miamo-surface transition-all"
 >
 <Heart className="w-4 h-4 text-rose" />
 </motion.button>
 </div>
 )}

 {/* ─── Prompts ─── */}
 {prompts.map((prompt: any, i: number) => (
 <div key={i} className="mx-6 my-3">
 <div className="relative rounded-2xl card-premium p-5 group hover:border-border transition-all">
 <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2">
 {prompt.question}
 </p>
 <p className="text-[15px] text-text-primary leading-[1.65] font-medium">
 {prompt.answer}
 </p>
 <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
 onClick={() => handleLikeContent('prompt', prompt.id || `prompt-${i}`)}
 className="absolute -bottom-3 right-5 w-9 h-9 rounded-full bg-miamo-card border-2 border-border flex items-center justify-center hover:border-border shadow-lg transition-all"
 >
 <Heart className="w-4 h-4 text-text-secondary hover:text-rose" />
 </motion.button>
 </div>
 </div>
 ))}

 {/* ─── Third Photo ─── */}
 {photos[2] && (
 <div className="mx-6 my-2 rounded-2xl overflow-hidden relative group">
 <img loading="lazy" src={photos[2].url || photos[2]} alt="" className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
 onClick={() => handleLikeContent('photo', photos[2]?.id)}
 className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-miamo-surface backdrop-blur-xl border border-border flex items-center justify-center hover:bg-miamo-surface transition-all"
 >
 <Heart className="w-4 h-4 text-rose" />
 </motion.button>
 </div>
 )}

 {/* ─── Interests ─── */}
 {interests.length > 0 && (
 <div className="px-6 py-5">
 <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-3">Interests</h4>
 <div className="flex flex-wrap gap-2">
 {interests.map((int: any) => {
 const name = int.name || int;
 const isCommon = commonInterests.includes(name);
 return (
 <span key={name} className={cn(
 'px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all',
 isCommon
 ? 'bg-miamo-card text-text-primary shadow-lg'
 : 'bg-miamo-surface text-text-muted border border-border',
 )}>
 {isCommon && <Star className="w-3 h-3 inline mr-1 -mt-0.5" />}{name}
 </span>
 );
 })}
 </div>
 </div>
 )}

 {/* ─── Lifestyle Grid ─── */}
 {lifestyleItems.length > 0 && (
 <div className="px-6 pb-5">
 <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-3">Lifestyle</h4>
 <div className="grid grid-cols-2 gap-2">
 {lifestyleItems.map((item, idx) => {
 const Icon = item.icon;
 return (
 <div key={idx} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-miamo-surface border border-border">
 <Icon className={cn('w-3.5 h-3.5', item.color)} />
 <span className="text-[12px] text-text-secondary font-medium capitalize">{item.label}</span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* ─── Pass & Super Like Buttons ─── */}
 <div className="px-6 py-5 border-t border-border">
 <div className="flex items-center gap-4">
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.9 }}
 onClick={onPass}
 className="haptic-pass w-14 h-14 rounded-full bg-miamo-surface border border-border flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
 >
 <X className="w-6 h-6 text-text-muted group-hover:text-red-400 transition-colors" />
 </motion.button>
 {onSuperLike && (
 <motion.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.9 }}
 onClick={onSuperLike}
 className="haptic-super w-14 h-14 rounded-full bg-rose-soft border border-rose-light flex items-center justify-center hover:bg-rose-soft hover:border-rose-light transition-all group"
 >
 <Star className="w-6 h-6 text-rose-alt group-hover:text-rose-main transition-colors" />
 </motion.button>
 )}
 <p className="text-[12px] text-text-muted leading-relaxed">Like any photo or prompt to send a Miamo Move</p>
 </div>
 </div>
 </div>

 {/* ─── Miamo Move Overlay ─── */}
 <AnimatePresence>
 {moveTarget && (
 <motion.div
 initial={{ opacity: 0, y: 30, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 30, scale: 0.95 }}
 transition={{ type: 'spring', damping: 25, stiffness: 300 }}
 className="fixed inset-x-0 bottom-0 z-50 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
 >
 <div className="max-w-[480px] mx-auto bg-miamo-card border border-border rounded-[20px] shadow-[0_8px_60px_rgba(0,0,0,0.5)] overflow-hidden">
 <div className="p-5">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-miamo-surface flex items-center justify-center shadow-[0_0_20px_rgba(201,120,86,0.15)]">
 <Heart className="w-5 h-5 text-rose" fill="currentColor" />
 </div>
 <div>
 <h4 className="text-[13px] font-bold text-text-primary">Miamo Move</h4>
 <p className="text-[11px] text-text-muted">
 {moveTarget.type === 'prompt' ? 'Liked their answer' : moveTarget.type === 'photo' ? 'Liked their photo' : 'Liked their profile'}
 </p>
 </div>
 </div>
 <button onClick={() => setMoveTarget(null)} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center hover:bg-miamo-surface transition-colors">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>
 <div className="relative">
 <textarea
 value={moveText}
 onChange={e => setMoveText(e.target.value)}
 placeholder="Write your move... or send blank"
 className="w-full h-20 rounded-xl bg-miamo-surface border border-border text-text-primary text-[13px] px-4 py-3 pr-14 resize-none focus:border-border focus:outline-none placeholder:text-text-muted"
 autoFocus
 />
 <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
 onClick={handleSendMove}
 className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-gradient-rose flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
 >
 <Send className="w-4 h-4 text-text-primary" />
 </motion.button>
 </div>
 {/* AI suggestions toggle */}
 {aiData?.moveRecommendations && aiData.moveRecommendations.length > 0 && (
 <div className="mt-3">
 <button onClick={() => setShowMoveRecs(!showMoveRecs)}
 className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary font-semibold transition-colors">
 <Sparkles className="w-3 h-3" /> {showMoveRecs ? 'Hide' : 'Show'} AI suggestions
 <ChevronDown className={cn('w-3 h-3 transition-transform', showMoveRecs && 'rotate-180')} />
 </button>
 <AnimatePresence>
 {showMoveRecs && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden mt-2 space-y-1.5">
 {aiData.moveRecommendations.slice(0, 5).map((rec, i) => (
 <button key={i} onClick={() => { setMoveText(rec.text); setShowMoveRecs(false); }}
 className="w-full text-left px-3 py-2.5 rounded-xl bg-miamo-surface hover:bg-miamo-surface border border-border hover:border-border transition-all">
 <p className="text-[12px] text-text-secondary leading-relaxed">{rec.text}</p>
 </button>
 ))}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
