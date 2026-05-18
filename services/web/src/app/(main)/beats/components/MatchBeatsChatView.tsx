'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Check, CheckCheck, ChevronLeft, Clock,
  Download, Eye, EyeOff, Send, Trash2, X, Zap,
} from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { BeatMatch, BeatEntry, BEAT_TYPES } from './constants';
import { BeatsIcon, StreakFlame, BeatDayStatus } from './BeatWidgets';

/* ═══════════════════════════════════════════════════════════
   BEAT ENTRY ROW — single sent/received beat
   ═══════════════════════════════════════════════════════════ */
function BeatEntryRow({ entry, onDelete, onToggleChat }: {
  entry: BeatEntry; onDelete: (id: string) => void; onToggleChat: (id: string) => void;
}) {
  const beatType = BEAT_TYPES.find(t => t.type === entry.type) || BEAT_TYPES[3];
  const Icon = beatType.icon;
  const isMine = entry.sender === 'me';

  return (
    <motion.div initial={{ opacity: 0, x: isMine ? 10 : -10 }} animate={{ opacity: 1, x: 0 }}
      className={cn('flex gap-3 py-3 px-4 rounded-xl transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/50', isMine ? 'flex-row-reverse' : '')}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', beatType.bg)}>
        <Icon className={cn('w-4 h-4', beatType.color)} />
      </div>
      <div className={cn('flex-1 min-w-0', isMine ? 'text-right' : '')}>
        <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">{entry.content}</p>
        <div className={cn('flex items-center gap-2 mt-1', isMine ? 'justify-end' : '')}>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatRelativeTime(entry.sentAt)}</span>
          {isMine && entry.seen && <CheckCheck className="w-3 h-3 text-sky-400" />}
          {entry.showInChat && <span className="text-[9px] bg-pink-50 dark:bg-pink-950/30 text-pink-500 px-1.5 py-0.5 rounded-full font-medium">In Chat</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => {
          const el = document.createElement('a');
          el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(`Beat: ${entry.content}\nType: ${entry.type}\nSent: ${new Date(entry.sentAt).toLocaleString()}`));
          el.setAttribute('download', `beat-${entry.id.slice(0,8)}.txt`);
          el.click();
        }} title="Download beat"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => {
          const text = `\u2764\ufe0f Beat from Miamo\n\n${entry.content}\n\nType: ${beatType.label}\nSent: ${new Date(entry.sentAt).toLocaleString()}`;
          navigator.clipboard?.writeText(text).then(() => { /* copied */ });
        }} title="Copy to clipboard"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all">
          <Camera className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onToggleChat(entry.id)} title={entry.showInChat ? 'Hide from chat' : 'Show in chat'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-all">
          {entry.showInChat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onDelete(entry.id)} title="Delete"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MATCH BEATS CHAT VIEW — full-window chat-style beat history
   ═══════════════════════════════════════════════════════════ */
export function MatchBeatsChatView({ beat, entries, onBack, onSendBeat, onDeleteEntry, onToggleChat, filter, setFilter, sending, initialType, initialText }: {
  beat: BeatMatch; entries: BeatEntry[]; onBack: () => void;
  onSendBeat: (type: string, content: string) => void; onDeleteEntry: (id: string) => void;
  onToggleChat: (id: string) => void; filter: 'all' | 'sent' | 'received';
  setFilter: (f: 'all' | 'sent' | 'received') => void; sending?: boolean;
  initialType?: string | null; initialText?: string | null;
}) {
  const other = beat.matchedUser || { id: '', displayName: 'Unknown', photos: [], online: false, verified: false };
  const photo = other.photos?.[0]?.url || other.photos?.[0] || undefined;
  const filtered = useMemo(() => entries.filter(e =>
    filter === 'all' ? true : filter === 'sent' ? e.sender === 'me' : e.sender === 'them'
  ), [entries, filter]);
  const [selectedType, setSelectedType] = useState<string | null>(initialType || null);
  const [composeText, setComposeText] = useState(initialText || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new entries
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries, filtered]);

  // Focus input when compose opens
  useEffect(() => {
    if (selectedType && inputRef.current) inputRef.current.focus();
  }, [selectedType]);

  const handleComposeSend = () => {
    if (!selectedType) return;
    const content = composeText.trim();
    if (!content) return;
    onSendBeat(selectedType, content);
    setComposeText('');
    setSelectedType(null);
  };

  const alreadySent = beat.iSentToday;

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      {/* ─── Header ─── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-pink-50/80 dark:from-pink-950/30 to-rose-50/60 dark:to-rose-950/20 border-b border-pink-100/40 backdrop-blur-sm">
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <Avatar src={photo} name={other.displayName} size="sm" online={other.online} verified={other.verified} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            {other.displayName}
            {other.verified && <Check className="w-3.5 h-3.5 text-pink-500" />}
          </h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{beat.count} day streak &bull; {beat.totalSent || 0} sent &bull; {beat.totalReceived || 0} received</p>
        </div>
        <StreakFlame count={beat.count} size="md" />
      </div>

      {/* ─── Filter pills ─── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-pink-50/30 dark:bg-pink-950/30 border-b border-pink-100/20">
        {([
          { key: 'all' as const, label: 'All Beats' },
          { key: 'sent' as const, label: 'Sent' },
          { key: 'received' as const, label: 'Received' },
        ]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
              filter === f.key ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60'
            )}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">{filtered.length} beats</span>
      </div>

      {/* ─── Beat entries (scrollable area) ─── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 bg-gradient-to-b from-pink-50/20 dark:from-pink-950/20 to-rose-50/10 dark:to-rose-950/10">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BeatsIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-base font-semibold text-gray-400 dark:text-gray-500 mb-1">No beats yet</p>
            <p className="text-sm text-gray-300">Send the first one below!</p>
          </div>
        ) : (
          filtered.map(entry => (
            <BeatEntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} onToggleChat={onToggleChat} />
          ))
        )}
        {/* Day status indicator */}
        <div className="pt-4 pb-2 flex justify-center">
          <BeatDayStatus beat={beat} />
        </div>
      </div>

      {/* ─── Compose / Send area ─── */}
      <div className="shrink-0 border-t border-pink-100/40 bg-gradient-to-r from-white dark:from-gray-900 to-pink-50/30 dark:to-pink-950/20">
        {alreadySent ? (
          /* Already sent today — show status */
          <div className="p-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCheck className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {beat.todayCompleted ? 'Both sent today! Streak saved!' : "You've sent today's beat — waiting for " + (other.displayName?.split(' ')[0] || 'them')}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">Come back tomorrow to keep the streak alive!</p>
          </div>
        ) : selectedType ? (
          /* Compose input for the selected beat type */
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {(() => { const bt = BEAT_TYPES.find(b => b.type === selectedType); if (!bt) return null; const Icon = bt.icon; return <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bt.bg)}><Icon className={cn('w-4 h-4', bt.color)} /></div>; })()}
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {BEAT_TYPES.find(b => b.type === selectedType)?.desc || 'Type your beat'}
              </span>
              <button onClick={() => { setSelectedType(null); setComposeText(''); }} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={composeText}
                onChange={e => setComposeText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComposeSend(); } }}
                placeholder={`Write your ${selectedType} beat...`}
                className="flex-1 px-4 py-2.5 rounded-xl bg-pink-50/50 dark:bg-pink-950/30 border border-pink-100 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleComposeSend}
                disabled={!composeText.trim() || sending}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0',
                  composeText.trim() && !sending
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-300'
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        ) : (
          /* Beat type selector */
          <div className="p-3">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-2 text-center">Choose a beat type to send</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {BEAT_TYPES.slice(0, 6).map(bt => {
                const BtIcon = bt.icon;
                return (
                  <motion.button key={bt.type} whileTap={{ scale: 0.93 }}
                    onClick={() => setSelectedType(bt.type)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all',
                      'bg-white dark:bg-gray-900 border border-pink-100 text-gray-600 dark:text-gray-400 hover:border-pink-300 hover:shadow-md hover:shadow-pink-100/30 active:bg-pink-50 dark:active:bg-pink-950/30'
                    )}>
                    <BtIcon className={cn('w-4 h-4', bt.color)} /> {bt.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
