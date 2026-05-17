'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, Shield, MessageSquare, ChevronDown, Send, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type DiscoverProfile, type AiData } from './constants';

/* ─── More Moves Section (collapsible) ──────────────── */
function MoreMovesSection({
  moves, startIndex, sentIndex, onSend,
}: {
  moves: { text: string; type: string; confidence: number }[];
  startIndex: number;
  sentIndex: number | null;
  onSend: (rec: { text: string; type: string }, idx: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl card-premium overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-lavender-400/60" /> {moves.length} more suggestions
        </span>
        <ChevronDown className={cn('w-4 h-4 text-gray-300 transition-transform', expanded && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4 space-y-2">
              {moves.map((rec, i) => {
                const idx = startIndex + i;
                const isSent = sentIndex === idx;
                return (
                  <button key={i} onClick={() => !isSent && onSend(rec, idx)} disabled={isSent}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border transition-all',
                      isSent ? 'bg-emerald-400/[0.06] border-emerald-400/20' : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-200',
                    )}>
                    <p className={cn('text-[12px] leading-relaxed', isSent ? 'text-emerald-300' : 'text-gray-600')}>{rec.text}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-gray-400 capitalize font-medium">{rec.type.replace(/-/g, ' ')}</span>
                      <div className="flex gap-[3px]">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div key={j} className={cn('w-[5px] h-[5px] rounded-full', j < Math.round(rec.confidence * 5) ? 'bg-white/40' : 'bg-gray-50')} />
                        ))}
                      </div>
                      {isSent && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AiSidePanel({
  user, aiData, onSendMove, loading,
}: {
  user: DiscoverProfile;
  aiData: AiData | null;
  onSendMove: (message: string, targetType: string, targetId?: string) => void;
  loading: boolean;
}) {
  const [sentIndex, setSentIndex] = useState<number | null>(null);
  const [customText, setCustomText] = useState('');
  const [customSent, setCustomSent] = useState(false);

  const handleClickRec = (rec: { text: string; type: string }, idx: number) => {
    onSendMove(rec.text, 'profile');
    setSentIndex(idx);
    setTimeout(() => setSentIndex(null), 3000);
  };

  const handleCustomSend = () => {
    onSendMove(customText, 'profile');
    setCustomSent(true);
    setCustomText('');
    setTimeout(() => setCustomSent(false), 2000);
  };

  const profile = user.profile || {};

  const breakdownLabels: Record<string, string> = {
    interests: 'Interests', datingIntent: 'Intent', location: 'Location', age: 'Age',
    lifestyle: 'Lifestyle', values: 'Values', profileQuality: 'Profile', verification: 'Verified',
    activity: 'Activity', zodiac: 'Zodiac',
  };
  const breakdownMaxes: Record<string, number> = {
    interests: 25, datingIntent: 20, location: 10, age: 10,
    lifestyle: 15, values: 10, profileQuality: 10, verification: 5, activity: 10, zodiac: 5,
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl card-premium p-5">
            <div className="h-3 bg-gray-50 rounded-full animate-pulse w-1/2 mb-4" />
            <div className="space-y-2.5">
              <div className="h-2.5 bg-gray-50 rounded-full animate-pulse" />
              <div className="h-2.5 bg-gray-50 rounded-full animate-pulse w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!aiData) return null;

  const scoreColor = aiData.score >= 70 ? 'text-emerald-400' : aiData.score >= 40 ? 'text-amber-400' : 'text-rose-400';
  const scoreBg = aiData.score >= 70 ? 'from-emerald-400/10' : aiData.score >= 40 ? 'from-amber-400/10' : 'from-rose-400/10';

  const breakdownEntries = aiData.breakdown
    ? Object.entries(aiData.breakdown).filter(([_, v]) => (v as number) >= 0).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5)
    : [];

  const topMoves = aiData.moveRecommendations?.slice(0, 2) || [];
  const restMoves = aiData.moveRecommendations?.slice(2) || [];

  return (
    <div className="space-y-3">
      {/* ── AI Compatibility ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl bg-gradient-to-b ${scoreBg} to-transparent border border-gray-200 overflow-hidden`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <Brain className="w-4 h-4 text-gray-800" />
              </div>
              <span className="text-[13px] font-bold text-gray-900 tracking-wide">AI Compatibility</span>
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
              className={`text-2xl font-black ${scoreColor}`}
            >
              {aiData.score}%
            </motion.span>
          </div>
          {breakdownEntries.length > 0 && (
            <div className="space-y-3">
              {breakdownEntries.map(([key, val], bIdx) => {
                const max = breakdownMaxes[key] || 25;
                const pct = Math.round(((val as number) / max) * 100);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-gray-400 font-semibold">{breakdownLabels[key] || key}</span>
                      <span className="text-[11px] text-gray-600 font-bold tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-[5px] bg-gray-50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.15 + bIdx * 0.08, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full bg-white"
                        style={{ opacity: Math.max(0.3, pct / 100) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Why This Match ── */}
      {aiData.whyThisMatch?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl card-premium p-5"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-lavender-400/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-lavender-400" />
            </div>
            <span className="text-[13px] font-bold text-gray-900 tracking-wide">Why this match?</span>
          </div>
          <div className="space-y-3">
            {aiData.whyThisMatch.map((reason, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-gray-600">{i + 1}</span>
                </div>
                <p className="text-[12px] text-gray-600 leading-[1.7] font-medium">{reason}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Top Move Cards ── */}
      {topMoves.map((rec, i) => {
        const isSent = sentIndex === i;
        const labels = ['Best conversation starter...', "Show genuine interest..."];
        return (
          <motion.button
            key={`move-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.1 }}
            onClick={() => !isSent && handleClickRec(rec, i)}
            disabled={isSent}
            className={cn(
              'w-full text-left rounded-2xl p-5 border transition-all group',
              isSent
                ? 'bg-emerald-400/[0.06] border-emerald-400/20'
                : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50 hover:border-gray-200 hover:shadow-md',
            )}
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-2">
              {isSent ? '✓ Move sent!' : labels[i] || `Suggested move`}
            </p>
            <p className={cn(
              'text-[14px] leading-[1.65] font-medium',
              isSent ? 'text-emerald-300' : 'text-gray-800',
            )}>
              {rec.text}
            </p>
            {!isSent && (
              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <Send className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">Click to send</span>
              </div>
            )}
          </motion.button>
        );
      })}

      {/* ── More Suggestions (collapsed) ── */}
      {restMoves.length > 0 && (
        <MoreMovesSection moves={restMoves} startIndex={2} sentIndex={sentIndex} onSend={handleClickRec} />
      )}

      {/* ── Trust & Safety ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl card-premium p-5"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-gray-800" />
          </div>
          <span className="text-[13px] font-bold text-gray-900 tracking-wide">Trust & Safety</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-2 h-2 rounded-full', user.verified ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'bg-amber-400')} />
            <span className="text-[12px] text-gray-500 font-medium">
              {user.verified ? (
                <>Identity <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md text-[10px] font-bold ml-1">VERIFIED</span></>
              ) : 'Not yet verified'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            <span className="text-[12px] text-gray-500 font-medium">No reports</span>
          </div>
          {profile.profileScore && (
            <div className="flex items-center gap-2.5">
              <div className={cn('w-2 h-2 rounded-full', profile.profileScore >= 80 ? 'bg-emerald-400' : profile.profileScore >= 60 ? 'bg-amber-400' : 'bg-rose-400')} />
              <span className="text-[12px] text-gray-500 font-medium">Profile {profile.profileScore}% complete</span>
            </div>
          )}
          {profile.online && (
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[12px] text-gray-500 font-medium">Currently online</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Custom Move ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="rounded-2xl card-premium p-5"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-gray-800" />
          </div>
          <span className="text-[13px] font-bold text-gray-900 tracking-wide">Write Your Move</span>
        </div>
        <div className="relative">
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder={`Say something to ${user.displayName}...`}
            className="w-full h-[60px] rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[12px] px-4 py-3 pr-12 resize-none focus:border-pink-200 focus:outline-none placeholder:text-gray-400 transition-colors"
          />
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={handleCustomSend}
            disabled={customSent}
            className={cn(
              'absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all',
              customSent ? 'bg-emerald-400/20' : 'bg-white hover:shadow-[0_0_12px_rgba(255,255,255,0.2)]',
            )}>
            {customSent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5 text-gray-800" />}
          </motion.button>
        </div>
        <p className="text-[10px] text-gray-300 mt-2 font-medium">Or send blank — just press send</p>
      </motion.div>
    </div>
  );
}
