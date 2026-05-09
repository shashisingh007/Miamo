'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, Clock, MessageCircle, MoreHorizontal,
  Pin, X, UserMinus, Shield, Heart, Sparkles, Eye,
  MapPin, Briefcase, AlertTriangle, Flag,
  Ban, Send, Check, Zap, PinOff, StarOff,
  MessageSquare, Frown, ThumbsDown, Ghost,
  Camera, Volume2, HandMetal, Users, AlertCircle,
  ArrowLeft, Pause, EyeOff, Wand2, Play, MoreVertical,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { useRouter } from 'next/navigation';

/* ─── Constants ──────────────────────────────────────── */
const UNMATCH_REASONS = [
  { code: 'not-interested', label: 'No longer interested', icon: ThumbsDown },
  { code: 'found-someone', label: 'Found someone else', icon: Heart },
  { code: 'no-response', label: 'They never responded', icon: Ghost },
  { code: 'inappropriate-msgs', label: 'Inappropriate messages', icon: AlertCircle },
  { code: 'fake-profile', label: 'Fake or misleading profile', icon: Camera },
  { code: 'uncomfortable', label: 'Made me uncomfortable', icon: Frown },
  { code: 'different-goals', label: 'Different relationship goals', icon: Users },
  { code: 'bad-conversation', label: 'Poor conversation quality', icon: MessageSquare },
  { code: 'too-far', label: 'Too far away', icon: MapPin },
  { code: 'taking-break', label: "Taking a break from dating", icon: HandMetal },
];

const REPORT_REASONS = [
  { code: 'harassment', label: 'Harassment or bullying', icon: AlertCircle },
  { code: 'inappropriate', label: 'Inappropriate content', icon: AlertTriangle },
  { code: 'fake-profile', label: 'Fake or scam profile', icon: Camera },
  { code: 'underage', label: 'Underage user', icon: Shield },
  { code: 'hate-speech', label: 'Hate speech or discrimination', icon: Ban },
  { code: 'threats', label: 'Threats or violence', icon: AlertCircle },
  { code: 'spam', label: 'Spam or commercial activity', icon: Volume2 },
  { code: 'impersonation', label: 'Impersonating someone', icon: Ghost },
  { code: 'explicit-unsolicited', label: 'Unsolicited explicit content', icon: Frown },
  { code: 'other', label: 'Something else', icon: Flag },
];

const BLOCK_REASONS = [
  { code: 'harassment', label: 'Harassment or offensive behavior', icon: AlertCircle },
  { code: 'unsafe', label: 'Made me feel unsafe', icon: Shield },
  { code: 'spam', label: 'Spam or scam', icon: Volume2 },
  { code: 'threats', label: 'Threatening behavior', icon: AlertTriangle },
  { code: 'fake', label: 'Fake profile', icon: Camera },
  { code: 'stalking', label: 'Stalking or obsessive contact', icon: Eye },
  { code: 'other', label: 'Other reason', icon: Flag },
];

const mainTabs = [
  { id: 'incoming', label: 'Incoming', icon: Heart },
  { id: 'matches', label: 'My Matches', icon: Sparkles },
  { id: 'held', label: 'On Hold', icon: Pause },
];

const matchFilters = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'active', label: 'Active' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'serious', label: 'Serious' },
];

/* ═══════════════════════════════════════════════════════
   TOOLTIP BUTTON
   ═══════════════════════════════════════════════════════ */
function TooltipButton({
  icon: Icon, label, onClick, active, className, size = 16,
}: {
  icon: any; label: string; onClick?: (e?: any) => void; active?: boolean;
  className?: string; size?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button onClick={onClick} className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
        active ? 'bg-pink-50 text-gray-900' : 'bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50',
        className,
      )}>
        <Icon style={{ width: size, height: size }} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-white text-gray-900 text-[10px] font-bold shadow-lg z-50 pointer-events-none"
          >
            {label}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PROFILE DETAIL MODAL (for incoming likes)
   ═══════════════════════════════════════════════════════ */
function ProfileModal({
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
        className="fixed inset-x-3 top-[2%] bottom-[2%] max-w-lg mx-auto bg-white border border-gray-200 rounded-[24px] shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-pink-50 transition">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {incoming.type === 'move' ? '💫 Miamo Move' : incoming.type === 'like' ? '❤️ Liked You' : '💬 Sent a thought'}
          </span>
          <button onClick={() => setShowActions(!showActions)} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-pink-50 transition">
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* More actions dropdown */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-100 overflow-hidden"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 text-[11px] font-semibold hover:bg-gray-100 transition">
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
                <img src={photos[0]?.url || photos[0]} alt={name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-[3/4] max-h-[260px] bg-gradient-to-b from-white/[0.04] to-transparent flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-3xl font-black text-gray-300">
                  {name[0]}
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#13131f] to-transparent" />
          </div>

          <div className="px-5 -mt-6 relative z-10">
            {/* Name & basics */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-extrabold text-gray-900">{name}</h2>
              {age && <span className="text-[14px] text-gray-500 font-medium">{age}</span>}
              {verified && (
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Shield className="w-3 h-3 text-blue-400" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-[12px] text-gray-400 mb-4">
              {city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{city}</span>}
              {profession && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{profession}</span>}
            </div>

            {/* Their message/move */}
            {incoming.message && (
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-lavender-400/10 to-lavender-600/10 border border-lavender-400/15">
                <p className="text-[10px] font-bold text-purple-300/60 uppercase tracking-wider mb-1.5">
                  {incoming.type === 'move' ? '💫 Their Miamo Move' : '💬 Their Message'}
                </p>
                <p className="text-[13px] text-gray-800 leading-relaxed">&ldquo;{incoming.message}&rdquo;</p>
              </div>
            )}

            {/* Bio */}
            {bio && <div className="mb-4"><p className="text-[13px] text-gray-500 leading-relaxed">{bio}</p></div>}

            {/* Interests */}
            {interests.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((i: any) => (
                    <span key={i.id || i.name} className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-500 font-medium">
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{p.question}</p>
                    <p className="text-[12px] text-gray-600">{p.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Additional photos */}
            {photos.length > 1 && (
              <div className="mb-4 grid grid-cols-3 gap-2">
                {photos.slice(1, 4).map((p: any, idx: number) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-gray-50">
                    <img src={p.url || p} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          {!showMoveInput ? (
            <div className="space-y-3">
              {/* Primary actions */}
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onMatchBack}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-gray-900 text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_30px_rgba(236,72,153,0.4)] transition-all">
                  <Heart className="w-4 h-4 fill-white" /> Match Back
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowMoveInput(true)}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#EC407A] to-[#D81B60] text-gray-900 text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(236,64,122,0.3)] hover:shadow-[0_4px_30px_rgba(236,64,122,0.4)] transition-all">
                  <Sparkles className="w-4 h-4" /> Miamo Move
                </motion.button>
              </div>
              {/* Secondary actions */}
              <div className="flex gap-2">
                <button onClick={onHold}
                  className="flex-1 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-100 hover:text-gray-600 transition-all">
                  <Pause className="w-3.5 h-3.5" /> Hold for Now
                </button>
                <button onClick={() => { onHide(); onClose(); }}
                  className="flex-1 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-100 hover:text-gray-600 transition-all">
                  <EyeOff className="w-3.5 h-3.5" /> Not Interested
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* AI Suggestion chips */}
              {loadingSuggestions ? (
                <div className="flex items-center gap-2 text-gray-300 text-[11px]">
                  <Wand2 className="w-3.5 h-3.5 animate-pulse" /> Loading AI suggestions...
                </div>
              ) : suggestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1">
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
                  className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-pink-50 transition flex-shrink-0">
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                </button>
                <input
                  value={moveMessage}
                  onChange={e => setMoveMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && moveMessage.trim()) onMatchMove(moveMessage.trim()); }}
                  placeholder="Write your Miamo Move..."
                  autoFocus
                  className="flex-1 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[12px] px-4 focus:border-purple-500/30 focus:outline-none placeholder:text-gray-400 transition"
                />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { if (moveMessage.trim()) onMatchMove(moveMessage.trim()); }}
                  disabled={!moveMessage.trim()}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition flex-shrink-0',
                    moveMessage.trim() ? 'bg-purple-500 text-gray-900' : 'bg-gray-50 text-gray-300',
                  )}>
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
              {!moveMessage.trim() && (
                <p className="text-[10px] text-gray-300 text-center">Pick a suggestion or write your own opener</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   FEEDBACK MODAL (Unmatch / Report)
   ═══════════════════════════════════════════════════════ */
function FeedbackModal({
  isOpen, onClose, type, matchName, onSubmit,
}: {
  isOpen: boolean; onClose: () => void;
  type: 'unmatch' | 'report' | 'block';
  matchName: string;
  onSubmit: (reason: string, details: string) => Promise<void>;
}) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const reasons = type === 'unmatch' ? UNMATCH_REASONS : type === 'block' ? BLOCK_REASONS : REPORT_REASONS;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedReason, details);
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); setSelectedReason(''); setDetails(''); }, 1500);
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[5%] max-w-md mx-auto bg-white border border-gray-200 rounded-[20px] shadow-2xl z-[60] overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', type === 'unmatch' ? 'bg-amber-400/10' : 'bg-red-400/10')}>
                  {type === 'unmatch' ? <UserMinus className="w-5 h-5 text-amber-400" /> : type === 'block' ? <Ban className="w-5 h-5 text-red-400" /> : <Flag className="w-5 h-5 text-red-400" />}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">{type === 'unmatch' ? 'Unmatch' : type === 'block' ? 'Block' : 'Report'} {matchName}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">{type === 'unmatch' ? 'Help us improve your matches' : type === 'block' ? 'They won\'t be able to contact you' : 'Help keep Miamo safe'}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-pink-50 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {done ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-[14px] font-semibold text-gray-900">Thank you for your feedback</p>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 px-1">Select a reason</p>
                  {reasons.map((r) => {
                    const Icon = r.icon;
                    const isActive = selectedReason === r.code;
                    return (
                      <button key={r.code} onClick={() => setSelectedReason(r.code)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                          isActive ? 'bg-gray-100 border-pink-200' : 'bg-transparent border-gray-100 hover:bg-gray-50',
                        )}>
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', isActive ? 'bg-pink-50' : 'bg-gray-50')}>
                          <Icon className={cn('w-4 h-4', isActive ? 'text-gray-800' : 'text-gray-400')} />
                        </div>
                        <span className={cn('text-[13px] font-medium', isActive ? 'text-gray-900' : 'text-gray-500')}>{r.label}</span>
                        {isActive && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto w-5 h-5 rounded-full bg-white flex items-center justify-center">
                            <Check className="w-3 h-3 text-[#151522]" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                  <div className="pt-3">
                    <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Additional details (optional)"
                      className="w-full h-20 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[12px] px-4 py-3 resize-none focus:border-pink-200 focus:outline-none placeholder:text-gray-400 transition-colors" />
                  </div>
                </div>
                <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 flex gap-3">
                  <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-500 text-[13px] font-semibold hover:bg-gray-50 transition-all">Cancel</button>
                  <button onClick={handleSubmit} disabled={!selectedReason || submitting}
                    className={cn(
                      'flex-1 h-11 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2',
                      selectedReason ? (type === 'report' || type === 'block') ? 'bg-red-500 text-gray-900' : 'bg-white text-gray-900' : 'bg-gray-50 text-gray-300 cursor-not-allowed',
                    )}>
                    {submitting ? <img src="/logo.png" alt="" className="w-4 h-4 rounded animate-pulse" /> : type === 'unmatch' ? 'Unmatch' : type === 'block' ? 'Block' : 'Report'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   HELD ITEM 3-DOT MENU
   ═══════════════════════════════════════════════════════ */
function HeldItemMenu({ userId, onResume, onReport, onBlock, onUnmatch }: { userId: string; onResume: () => void; onReport: () => void; onBlock: () => void; onUnmatch: () => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(!open);
  };

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }}
              style={{ top: pos.top, right: pos.right }}
              className="fixed z-[70] w-52 py-1 rounded-xl bg-white border border-gray-200 shadow-[0_8px_40px_rgba(0,0,0,0.7)]"
            >
              <button onClick={() => { setOpen(false); onResume(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-emerald-400 hover:bg-emerald-400/10 transition">
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
              <div className="h-px bg-gray-50 my-0.5" />
              <button onClick={() => { setOpen(false); onReport(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-amber-400/70 hover:bg-amber-400/5 transition">
                <Flag className="w-3.5 h-3.5" /> Report
              </button>
              <button onClick={() => { setOpen(false); onBlock(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-red-400/70 hover:bg-red-400/5 transition">
                <Ban className="w-3.5 h-3.5" /> Block
              </button>
              <button onClick={() => { setOpen(false); onUnmatch(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-red-400/70 hover:bg-red-400/5 transition">
                <UserMinus className="w-3.5 h-3.5" /> Unmatch
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   INCOMING CARD (person who liked you)
   ═══════════════════════════════════════════════════════ */
function IncomingCard({ item, onClick }: { item: any; onClick: () => void }) {
  const user = item.user || {};
  const name = user.displayName || 'User';
  const photo = user.photos?.[0]?.url || user.photos?.[0];
  const city = user.profile?.city;
  const age = user.profile?.age;
  const interests = (user.interests || []).slice(0, 3);

  const timeAgo = () => {
    const diff = Date.now() - new Date(item.createdAt).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200 transition-all overflow-hidden"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50">
            {photo ? (
              <img src={photo} alt={name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-300">{name[0]}</div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center">
            {item.type === 'move' ? <span className="text-[11px]">💫</span> : item.type === 'like' ? <Heart className="w-3 h-3 text-pink-400 fill-pink-400" /> : <MessageCircle className="w-3 h-3 text-purple-400" />}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-bold text-gray-900 truncate">{name}</h3>
            {age && <span className="text-[12px] text-gray-400">{age}</span>}
            {user.verified && <Shield className="w-3.5 h-3.5 text-blue-400/60 flex-shrink-0" />}
          </div>
          {city && <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-1"><MapPin className="w-2.5 h-2.5" />{city}</p>}
          {item.message && <p className="text-[11px] text-purple-300/70 truncate italic">&ldquo;{item.message}&rdquo;</p>}
          {!item.message && interests.length > 0 && (
            <div className="flex gap-1 mt-1">
              {interests.map((i: any) => <span key={i.name} className="px-1.5 py-0.5 rounded bg-gray-50 text-[9px] text-gray-400">{i.name}</span>)}
            </div>
          )}
        </div>

        {/* Time & CTA */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-[10px] text-gray-300 font-medium">{timeAgo()}</span>
          <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-pink-400/60" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════
   MATCH CARD (existing mutual match)
   ═══════════════════════════════════════════════════════ */
function MatchCard({ match, onOpenMenu, onChat }: { match: any; onOpenMenu: (id: string, e: React.MouseEvent) => void; onChat: (m: any) => void }) {
  const other = match.matchedUser || {};
  const name = other.displayName || 'User';
  const photo = other.photos?.[0]?.url || other.photos?.[0];
  const city = other.profile?.city || '';
  const age = other.profile?.age;
  const verified = other.verified;
  const online = other.profile?.online;
  const lastMsg = match.lastMessage;
  const isNew = match.isNew;
  const isFavorite = match.isFavorite;
  const isPinned = match.isPinned;

  const matchTime = new Date(match.createdAt);
  const daysDiff = Math.floor((Date.now() - matchTime.getTime()) / (1000 * 60 * 60 * 24));
  const timeLabel = daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Yesterday' : daysDiff < 7 ? `${daysDiff}d ago` : matchTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn('group rounded-2xl border transition-all cursor-pointer', isPinned ? 'bg-gray-50 border-gray-200' : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-200')}
      onClick={() => onChat(match)}>
      <div className="flex items-center gap-4 p-4">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50">
            {photo ? <img src={photo} alt={name} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-lg font-black text-gray-300">{name[0]}</div>}
          </div>
          {online && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-miamo-bg flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" /></div>}
          {isPinned && <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md"><Pin className="w-2.5 h-2.5 text-gray-900" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-bold text-gray-900 truncate">{name}</h3>
            {verified && <Shield className="w-3.5 h-3.5 text-blue-400/40 flex-shrink-0" />}
            {isNew && <span className="px-2 py-0.5 rounded-md bg-purple-400/15 text-purple-300 text-[9px] font-bold uppercase">New</span>}
            {isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            {city && <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{city}</span>}
            {age && <span>{age}</span>}
          </div>
          {lastMsg ? <p className="text-[11px] text-gray-400 mt-1.5 truncate max-w-[260px]">{lastMsg.content}</p> : <p className="text-[11px] text-purple-400/50 mt-1.5 italic">No messages yet — say hi!</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-gray-300 font-medium mr-2 hidden sm:block">{timeLabel}</span>
          <TooltipButton icon={MessageCircle} label="Message" onClick={(e: any) => { e?.stopPropagation(); onChat(match); }} />
          <TooltipButton icon={MoreHorizontal} label="More" onClick={(e: any) => { e?.stopPropagation(); onOpenMenu(match.id, e); }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONTEXT MENU
   ═══════════════════════════════════════════════════════ */
function ContextMenu({
  isOpen, position, onClose, onFavorite, onPin, onUnmatch, onReport, onHold, onBlock, isFavorite, isPinned,
}: {
  isOpen: boolean; position: { x: number; y: number }; onClose: () => void;
  onFavorite: () => void; onPin: () => void; onUnmatch: () => void; onReport: () => void;
  onHold: () => void; onBlock: () => void;
  isFavorite: boolean; isPinned: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const menuItems = [
    { label: isFavorite ? 'Remove Favorite' : 'Add to Favorites', icon: isFavorite ? StarOff : Star, onClick: onFavorite, color: 'text-amber-400' },
    { label: isPinned ? 'Unpin' : 'Pin to Top', icon: isPinned ? PinOff : Pin, onClick: onPin, color: 'text-gray-600' },
    { label: 'Put on Hold', icon: Pause, onClick: onHold, color: 'text-amber-400/70' },
    { divider: true },
    { label: 'Report', icon: Flag, onClick: onReport, color: 'text-orange-400' },
    { label: 'Block', icon: Ban, onClick: onBlock, color: 'text-red-400' },
    { label: 'Unmatch', icon: UserMinus, onClick: onUnmatch, color: 'text-red-400' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div ref={ref} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.12 }}
        className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] py-1.5 w-48"
        style={{ top: position.y, left: Math.min(position.x, typeof window !== 'undefined' ? window.innerWidth - 210 : 200) }}>
        {menuItems.map((item, i) => {
          if ('divider' in item) return <div key={i} className="my-1.5 h-px bg-gray-50" />;
          const Icon = item.icon;
          return (
            <button key={i} onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors">
              <Icon className={cn('w-4 h-4', item.color)} />
              <span className={cn('text-[12px] font-medium', item.color)}>{item.label}</span>
            </button>
          );
        })}
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   MOCK DATA — shown when no auth token / API returns empty
   ═══════════════════════════════════════════════════════ */
const MOCK_USERS = [
  { id: 'u1', name: 'Sofia Rivera',   photo: 'https://i.pravatar.cc/150?img=32', verified: true,  age: 24, city: 'Barcelona',  profession: 'UX Designer',      bio: 'Coffee addict. Art lover. Always planning my next trip.', online: true },
  { id: 'u2', name: 'Emma Chen',      photo: 'https://i.pravatar.cc/150?img=25', verified: false, age: 22, city: 'Toronto',    profession: 'Software Engineer', bio: 'Bookworm and hiking enthusiast. Let\'s explore together!', online: true },
  { id: 'u3', name: 'Aisha Patel',    photo: 'https://i.pravatar.cc/150?img=23', verified: true,  age: 26, city: 'London',     profession: 'Marketing Lead',    bio: 'Foodie who loves cooking and trying new restaurants.', online: true },
  { id: 'u4', name: 'Luna Martinez',  photo: 'https://i.pravatar.cc/150?img=44', verified: false, age: 21, city: 'Miami',      profession: 'Photographer',      bio: 'Capturing moments, one sunset at a time.', online: false },
  { id: 'u5', name: 'Zara Kim',       photo: 'https://i.pravatar.cc/150?img=45', verified: true,  age: 25, city: 'Seoul',      profession: 'Product Manager',   bio: 'K-drama binger. Yoga every morning. Dog mom.', online: false },
  { id: 'u6', name: 'Mia Johnson',    photo: 'https://i.pravatar.cc/150?img=47', verified: false, age: 23, city: 'New York',   profession: 'Journalist',        bio: 'Storyteller. Street food lover. Night owl.', online: true },
  { id: 'u7', name: 'Priya Singh',    photo: 'https://i.pravatar.cc/150?img=36', verified: true,  age: 27, city: 'Mumbai',     profession: 'Data Scientist',    bio: 'Love dancing, chai, and meaningful conversations.', online: false },
  { id: 'u8', name: 'Olivia Brown',   photo: 'https://i.pravatar.cc/150?img=27', verified: false, age: 24, city: 'Sydney',     profession: 'Nurse',             bio: 'Beach lover. Guitar player. Rescue dog mom.', online: true },
];

function generateMockIncoming() {
  return MOCK_USERS.slice(0, 4).map((u, i) => ({
    id: `inc-${i}`,
    user: {
      id: u.id,
      displayName: u.name,
      photos: [{ url: u.photo }],
      verified: u.verified,
      profile: { age: u.age, city: u.city, profession: u.profession, bio: u.bio, online: u.online },
    },
    createdAt: new Date(Date.now() - i * 3600000 * 6).toISOString(),
    isHeld: false,
  }));
}

function generateMockMatches() {
  return MOCK_USERS.slice(2, 8).map((u, i) => ({
    id: `match-${i}`,
    matchedUser: {
      id: u.id,
      displayName: u.name,
      photos: [{ url: u.photo }],
      verified: u.verified,
      profile: { age: u.age, city: u.city, profession: u.profession, bio: u.bio, online: u.online },
    },
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    isFavorite: i === 0,
    isPinned: i === 1,
    lastMessage: ['Hey! How was your day? 😊', 'That hiking photo is amazing!', 'We should try that new place!', 'Haha that\'s so funny 😂', 'Good morning ☀️', 'Let\'s plan something this weekend!'][i],
    lastMessageAt: new Date(Date.now() - i * 7200000).toISOString(),
  }));
}

/* ═══════════════════════════════════════════════════════
   MAIN MATCHES PAGE
   ═══════════════════════════════════════════════════════ */
export default function MatchesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('incoming');
  const [matchFilter, setMatchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [incoming, setIncoming] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [heldItems, setHeldItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingMeta, setIncomingMeta] = useState<any>({});

  // Profile modal
  const [selectedIncoming, setSelectedIncoming] = useState<any>(null);

  // Menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Feedback modal
  const [feedbackModal, setFeedbackModal] = useState<{ type: 'unmatch' | 'report' | 'block'; matchId: string; matchName: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Multi-select for On Hold
  const [selectMode, setSelectMode] = useState(false);
  const [selectedHeldIds, setSelectedHeldIds] = useState<Set<string>>(new Set());
  const toggleHeldSelect = (userId: string) => {
    setSelectedHeldIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };
  const selectAllHeld = () => {
    setSelectedHeldIds(new Set(heldItems.map(i => i.user?.id).filter(Boolean)));
  };
  const clearSelection = () => { setSelectedHeldIds(new Set()); setSelectMode(false); };
  const handleBulkResume = async () => {
    const ids = Array.from(selectedHeldIds);
    let resumed = 0;
    for (const id of ids) {
      try { await api.resumeIncoming(id); resumed++; } catch {}
    }
    showToast(`Resumed ${resumed} profile${resumed !== 1 ? 's' : ''}`, 'success');
    clearSelection();
    loadData();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('miamo_token') : null;
    if (!token) {
      // No auth — use mock data for testing
      setIncoming(generateMockIncoming());
      setMatches(generateMockMatches());
      setIncomingMeta({ total: 4, newToday: 2 });
      setHeldItems([]);
      setLoading(false);
      return;
    }
    try {
      const [inc, mtch, held, heldMatches] = await Promise.allSettled([
        api.getIncomingLikes(),
        api.getMatches(matchFilter !== 'all' ? { filter: matchFilter } : undefined),
        api.getIncomingLikes({ showHeld: 'true' }),
        api.getMatches({ includeHeld: 'true' }),
      ]);
      const incData = inc.status === 'fulfilled' ? inc.value.data || [] : [];
      const mtchData = mtch.status === 'fulfilled' ? mtch.value.data || [] : [];
      // If API returned nothing, use mock data
      if (incData.length === 0 && mtchData.length === 0) {
        setIncoming(generateMockIncoming());
        setMatches(generateMockMatches());
        setIncomingMeta({ total: 4, newToday: 2 });
        setHeldItems([]);
        setLoading(false);
        return;
      }
      setIncoming(incData);
      if (inc.status === 'fulfilled') setIncomingMeta(inc.value.meta || {});
      setMatches(mtchData);
      // Merge held incoming + held matches for the On Hold tab
      const heldList: any[] = [];
      const seenUserIds = new Set<string>();
      if (held.status === 'fulfilled') {
        const all = held.value.data || [];
        all.filter((i: any) => i.isHeld).forEach((item: any) => {
          const uid = item.user?.id;
          if (uid && !seenUserIds.has(uid)) { seenUserIds.add(uid); heldList.push(item); }
        });
      }
      if (heldMatches.status === 'fulfilled') {
        (heldMatches.value.data || []).filter((m: any) => m.isHeld).forEach((m: any) => {
          const uid = m.matchedUser?.id;
          if (uid && !seenUserIds.has(uid)) {
            seenUserIds.add(uid);
            heldList.push({ id: m.id, user: m.matchedUser, isHeld: true, createdAt: m.createdAt, matchId: m.id });
          }
        });
      }
      setHeldItems(heldList);
    } catch (e: any) {
      console.error('Failed to load matches data:', e);
      // Fallback to mock on error
      setIncoming(generateMockIncoming());
      setMatches(generateMockMatches());
      setIncomingMeta({ total: 4, newToday: 2 });
    } finally {
      setLoading(false);
    }
  }, [matchFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh held data when switching to the held tab
  useEffect(() => {
    if (activeTab === 'held') {
      Promise.allSettled([
        api.getIncomingLikes({ showHeld: 'true' }),
        api.getMatches({ includeHeld: 'true' }),
      ]).then(([held, heldMatches]) => {
        const heldList: any[] = [];
        const seenUserIds = new Set<string>();
        if (held.status === 'fulfilled') {
          (held.value.data || []).filter((i: any) => i.isHeld).forEach((item: any) => {
            const uid = item.user?.id;
            if (uid && !seenUserIds.has(uid)) { seenUserIds.add(uid); heldList.push(item); }
          });
        }
        if (heldMatches.status === 'fulfilled') {
          (heldMatches.value.data || []).filter((m: any) => m.isHeld).forEach((m: any) => {
            const uid = m.matchedUser?.id;
            if (uid && !seenUserIds.has(uid)) {
              seenUserIds.add(uid);
              heldList.push({ id: m.id, user: m.matchedUser, isHeld: true, createdAt: m.createdAt, matchId: m.id });
            }
          });
        }
        setHeldItems(heldList);
      });
    }
  }, [activeTab]);

  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (val.trim()) {
        const res = await api.getMatches({ q: val.trim() });
        setMatches(res.data || []);
      } else { loadData(); }
    }, 300);
  };

  /* ─── Actions ─── */
  const handleMatchBack = async () => {
    if (!selectedIncoming) return;
    try {
      const res = await api.matchBack(selectedIncoming.user.id);
      showToast("It's a Match! 🎉 Chat is ready");
      setSelectedIncoming(null);
      loadData();
      if (res.data?.chatId) setTimeout(() => router.push(`/messages?chat=${res.data.chatId}`), 1200);
    } catch { showToast('Something went wrong', 'info'); }
  };

  const handleMatchMove = async (message: string) => {
    if (!selectedIncoming) return;
    try {
      const res = await api.matchBackWithMove(selectedIncoming.user.id, message);
      showToast('Matched with a Move! 💫');
      setSelectedIncoming(null);
      loadData();
      if (res.data?.chatId) setTimeout(() => router.push(`/messages?chat=${res.data.chatId}`), 1200);
    } catch { showToast('Something went wrong', 'info'); }
  };

  const handleHold = async () => {
    if (!selectedIncoming) return;
    const userId = selectedIncoming.user.id;
    setSelectedIncoming(null);
    try {
      await api.holdIncoming(userId);
      showToast('Saved for later ⏸️');
      await loadData();
    } catch (e) {
      console.error('[Miamo] hold error:', e);
      showToast('Failed to hold — try again', 'info');
    }
  };

  const handleResume = async (userId?: string) => {
    const id = userId || selectedIncoming?.user?.id;
    if (!id) return;
    try {
      await api.resumeIncoming(id);
      showToast('Resumed — moved back to incoming');
      if (selectedIncoming) setSelectedIncoming(null);
      await loadData();
    } catch (e) {
      console.error('[Miamo] resume error:', e);
      showToast('Failed to resume', 'info');
    }
  };

  const handleHide = async (userId?: string) => {
    const id = userId || selectedIncoming?.user?.id;
    if (!id) return;
    try { await api.hideIncoming(id); showToast('Hidden'); if (selectedIncoming) setSelectedIncoming(null); loadData(); } catch {}
  };

  const handleReport = async (userId?: string) => {
    const id = userId || selectedIncoming?.user?.id;
    if (!id) return;
    // Find matchId for this user from heldItems or matches
    const heldItem = heldItems.find(i => i.user?.id === id);
    const matchItem = matches.find(m => m.matchedUser?.id === id);
    const matchId = heldItem?.matchId || heldItem?.id || matchItem?.id;
    const matchName = heldItem?.user?.displayName || matchItem?.matchedUser?.displayName || 'User';
    if (matchId) {
      setFeedbackModal({ type: 'report', matchId, matchName });
    } else {
      // Fallback: direct report without modal
      try { await api.reportUser({ reportedId: id, reason: 'other' }); showToast('Reported — thanks for keeping Miamo safe'); loadData(); } catch {}
    }
  };

  const handleBlock = async (userId?: string) => {
    const id = userId || selectedIncoming?.user?.id;
    if (!id) return;
    try { await api.blockUser(id); showToast('Blocked'); if (selectedIncoming) setSelectedIncoming(null); loadData(); } catch {}
  };

  const handleFavorite = async (matchId: string) => {
    try { const res = await api.favoriteMatch(matchId); setMatches(p => p.map(m => m.id === matchId ? { ...m, isFavorite: res.data.isFavorite } : m)); } catch {}
  };
  const handlePin = async (matchId: string) => {
    try { const res = await api.pinMatch(matchId); setMatches(p => p.map(m => m.id === matchId ? { ...m, isPinned: res.data.isPinned } : m)); } catch {}
  };
  const handleUnmatch = async (reason: string, details: string) => {
    if (!feedbackModal) return;
    try {
      await api.unmatch(feedbackModal.matchId, reason, details);
      setMatches(p => p.filter(m => m.id !== feedbackModal.matchId));
      setHeldItems(p => p.filter(i => (i.matchId || i.id) !== feedbackModal.matchId));
      showToast('Unmatched');
      loadData();
    } catch {}
  };
  const handleReportMatch = async (reason: string, details: string) => {
    if (!feedbackModal) return;
    try {
      await api.reportMatch(feedbackModal.matchId, reason, details);
      showToast('Reported — thanks for keeping Miamo safe');
      loadData();
    } catch {}
  };
  const handleBlockMatch = async (reason: string, details: string) => {
    if (!feedbackModal) return;
    const match = getMatchById(feedbackModal.matchId);
    const targetUserId = match?.matchedUser?.id;
    if (!targetUserId) return;
    try {
      await api.blockUser(targetUserId);
      // Also store the feedback reason for AI algorithm
      try { await api.reportMatch(feedbackModal.matchId, `block:${reason}`, details); } catch {}
      setMatches(p => p.filter(m => m.id !== feedbackModal.matchId));
      setHeldItems(p => p.filter(i => (i.matchId || i.id) !== feedbackModal.matchId));
      showToast('User blocked');
      loadData();
    } catch {}
  };

  const handleChat = (match: any) => { router.push(match.chatId ? `/messages?chat=${match.chatId}` : '/messages'); };

  const openMenu = (matchId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.right - 192, y: rect.bottom + 4 });
    setMenuOpen(matchId);
  };

  const getMatchById = (id: string) => matches.find(m => m.id === id);
  const getMatchName = (id: string) => getMatchById(id)?.matchedUser?.displayName || 'User';

  /* ─── Loading ─── */
  if (loading && incoming.length === 0 && matches.length === 0) {
    return <MiamoLoader text="Loading matches..." />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Matches</h1>
            <p className="text-[12px] text-gray-400 mt-0.5 font-medium">
              {incoming.length > 0 && <span className="text-pink-400">{incoming.length} incoming</span>}
              {incoming.length > 0 && matches.length > 0 && <span> · </span>}
              {matches.length > 0 && <span>{matches.length} mutual</span>}
              {incoming.length === 0 && matches.length === 0 && 'Your matches will appear here'}
            </p>
          </div>
        </div>



        {/* ─── Main Tabs ─── */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl card-premium">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'incoming' ? incoming.length : tab.id === 'matches' ? matches.length : heldItems.length;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12px] font-semibold transition-all', isActive ? 'bg-pink-50 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-500')}>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center', isActive ? 'bg-pink-500 text-gray-900' : 'bg-gray-50 text-gray-400')}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ INCOMING TAB ═══ */}
        {activeTab === 'incoming' && (
          <div>
            {incoming.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-lavender-400/10 to-lavender-600/10 border border-gray-200 flex items-center justify-center mx-auto mb-5">
                  <Heart className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-2">No matches for now</h3>
                <p className="text-[13px] text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                  When someone likes your profile, they&apos;ll appear here. Keep your profile active and engaging!
                </p>
                <button onClick={() => router.push('/discover')}
                  className="mt-6 h-10 px-6 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-[12px] font-semibold hover:bg-pink-50 transition-all">
                  Explore Discover →
                </button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-pink-400" /> People who liked you
                  <span className="ml-auto text-[10px] text-gray-300 font-normal normal-case">Tap to view profile</span>
                </p>
                {incoming.map((item) => (
                  <IncomingCard key={item.id} item={item} onClick={() => setSelectedIncoming(item)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ MY MATCHES TAB ═══ */}
        {activeTab === 'matches' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                <input value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Search matches..."
                  className="w-full h-9 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[12px] pl-9 pr-4 focus:border-pink-200 focus:outline-none placeholder:text-gray-400 transition" />
              </div>
            </div>
            <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
              {matchFilters.map(f => (
                <button key={f.id} onClick={() => setMatchFilter(f.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border', matchFilter === f.id ? 'bg-pink-50 border-pink-200 text-gray-900' : 'border-gray-100 text-gray-400 hover:text-gray-400')}>
                  {f.label}
                </button>
              ))}
            </div>

            {matches.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">
                  {searchQuery ? 'No matches found' : matchFilter !== 'all' ? `No ${matchFilter} matches` : 'No mutual matches yet'}
                </h3>
                <p className="text-[12px] text-gray-400 max-w-xs mx-auto">
                  {searchQuery ? 'Try a different search' : "When you match back with someone, they'll appear here and you can start chatting!"}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {matches.some(m => m.isPinned) && (
                  <>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1 flex items-center gap-1.5"><Pin className="w-3 h-3" /> Pinned</p>
                    {matches.filter(m => m.isPinned).map(match => <MatchCard key={match.id} match={match} onOpenMenu={openMenu} onChat={handleChat} />)}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-4 mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> All Matches</p>
                  </>
                )}
                {matches.filter(m => !m.isPinned).map(match => <MatchCard key={match.id} match={match} onOpenMenu={openMenu} onChat={handleChat} />)}
              </div>
            )}
          </div>
        )}

        {/* ═══ ON HOLD TAB ═══ */}
        {activeTab === 'held' && (
          <div>
            {heldItems.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4">
                  <Pause className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-1.5">Nothing on hold</h3>
                <p className="text-[12px] text-gray-400 max-w-xs mx-auto">When you&apos;re not sure about someone, put them on hold to revisit later.</p>
                {incomingMeta?.heldCount > 0 && (
                  <button onClick={loadData} className="mt-4 px-4 py-2 rounded-lg bg-gray-50 text-gray-500 text-[12px] font-medium hover:bg-pink-50 transition">
                    Refresh
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-2">
                {/* Header with Select toggle */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2">
                    <Pause className="w-3.5 h-3.5 text-amber-400" /> Saved for later ({heldItems.length})
                  </p>
                  <button
                    onClick={() => { if (selectMode) clearSelection(); else setSelectMode(true); }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-semibold transition",
                      selectMode ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    {selectMode ? 'Cancel' : 'Select'}
                  </button>
                </div>

                {/* Bulk action toolbar */}
                <AnimatePresence>
                  {selectMode && selectedHeldIds.size > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between"
                    >
                      <span className="text-[11px] text-gray-500 font-medium">{selectedHeldIds.size} selected</span>
                      <div className="flex items-center gap-2">
                        <button onClick={selectAllHeld} className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-gray-50 text-gray-500 hover:bg-pink-50 transition">
                          All
                        </button>
                        <button onClick={handleBulkResume} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition flex items-center gap-1">
                          <Play className="w-3 h-3" /> Resume All
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {heldItems.map((item) => {
                  const user = item.user || {};
                  const userId = user.id;
                  const name = user.displayName || 'User';
                  const photo = user.photos?.[0]?.url || user.photos?.[0];
                  const city = user.profile?.city;
                  const age = user.profile?.age;
                  const isSelected = selectedHeldIds.has(userId);
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-2xl border transition-all overflow-hidden",
                        isSelected ? "border-amber-400/30 bg-amber-400/[0.06]" : "border-amber-400/10 bg-amber-400/[0.02] hover:bg-amber-400/[0.04]"
                      )}
                    >
                      <div className="flex items-center gap-3 p-4">
                        {/* Checkbox in select mode */}
                        {selectMode && (
                          <button onClick={() => toggleHeldSelect(userId)} className="flex-shrink-0">
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition",
                              isSelected ? "bg-amber-400 border-amber-400" : "border-pink-200 bg-transparent hover:border-white/40"
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-black" />}
                            </div>
                          </button>
                        )}
                        <button onClick={() => selectMode ? toggleHeldSelect(userId) : setSelectedIncoming(item)} className="relative flex-shrink-0">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50">
                            {photo ? <img src={photo} alt={name} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-lg font-black text-gray-300">{name[0]}</div>}
                          </div>
                          {!selectMode && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                              <Pause className="w-2.5 h-2.5 text-amber-400" />
                            </div>
                          )}
                        </button>
                        <button onClick={() => selectMode ? toggleHeldSelect(userId) : setSelectedIncoming(item)} className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-[14px] font-bold text-gray-900 truncate">{name}</h3>
                            {age && <span className="text-[12px] text-gray-400">{age}</span>}
                          </div>
                          {city && <p className="text-[11px] text-gray-400 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{city}</p>}
                        </button>
                        {!selectMode && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleResume(userId)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition flex items-center gap-1">
                              <Play className="w-3 h-3" /> Resume
                            </button>
                            <HeldItemMenu userId={userId} onResume={() => handleResume(userId)} onReport={() => handleReport(userId)} onBlock={() => handleBlock(userId)} onUnmatch={() => {
                              const matchId = item.matchId || item.id;
                              setFeedbackModal({ type: 'unmatch', matchId, matchName: name });
                            }} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Profile Modal ─── */}
      <AnimatePresence>
        {selectedIncoming && (
          <ProfileModal
            isOpen={!!selectedIncoming}
            onClose={() => setSelectedIncoming(null)}
            incoming={selectedIncoming}
            onMatchBack={handleMatchBack}
            onMatchMove={handleMatchMove}
            onHold={handleHold}
            onHide={() => handleHide()}
            onReport={() => handleReport()}
            onBlock={() => handleBlock()}
          />
        )}
      </AnimatePresence>

      {/* ─── Context Menu ─── */}
      <ContextMenu
        isOpen={!!menuOpen}
        position={menuPosition}
        onClose={() => setMenuOpen(null)}
        onFavorite={() => menuOpen && handleFavorite(menuOpen)}
        onPin={() => menuOpen && handlePin(menuOpen)}
        onHold={() => {
          if (menuOpen) {
            const match = getMatchById(menuOpen);
            if (match?.matchedUser?.id) {
              api.holdIncoming(match.matchedUser.id).then(() => {
                showToast('Moved to On Hold ⏸️');
                loadData();
              }).catch(() => showToast('Failed to hold', 'info'));
            }
            setMenuOpen(null);
          }
        }}
        onBlock={() => {
          if (menuOpen) {
            setFeedbackModal({ type: 'block', matchId: menuOpen!, matchName: getMatchName(menuOpen!) });
            setMenuOpen(null);
          }
        }}
        onUnmatch={() => menuOpen && setFeedbackModal({ type: 'unmatch', matchId: menuOpen!, matchName: getMatchName(menuOpen!) })}
        onReport={() => menuOpen && setFeedbackModal({ type: 'report', matchId: menuOpen!, matchName: getMatchName(menuOpen!) })}
        isFavorite={menuOpen ? getMatchById(menuOpen)?.isFavorite : false}
        isPinned={menuOpen ? getMatchById(menuOpen)?.isPinned : false}
      />

      {/* ─── Feedback Modal ─── */}
      <FeedbackModal
        isOpen={!!feedbackModal}
        onClose={() => setFeedbackModal(null)}
        type={feedbackModal?.type || 'unmatch'}
        matchName={feedbackModal?.matchName || ''}
        onSubmit={feedbackModal?.type === 'report' ? handleReportMatch : feedbackModal?.type === 'block' ? handleBlockMatch : handleUnmatch}
      />

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-xl bg-white border border-gray-200 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <p className="text-[13px] font-semibold text-gray-900 whitespace-nowrap">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
