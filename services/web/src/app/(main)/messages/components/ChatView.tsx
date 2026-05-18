'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Phone, Video, MoreVertical, Pin, Archive, Image, Mic, Send, Smile, Paperclip,
  MessageCircle, ChevronLeft, Trash2, VolumeX, X, Lock, AlertTriangle, Sparkles,
  Palette, EyeOff, Flag, Ban, Clock, Zap, Music, Gamepad2, User as UserIcon, Film,
  PauseCircle, PlayCircle, Check, UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { useSSE } from '@/hooks/useSSE';
import { MessageBubble } from './MessageBubble';
import { SUGGESTION_CATEGORIES, ENTERTAINMENT_ITEMS, EMOJI_CATEGORIES } from './constants';

// ═══════════════════════════════════════════════════════════
// BACKGROUND PICKER
// ═══════════════════════════════════════════════════════════
function BackgroundPicker({ chatId, currentBg, onClose, onSelect }: { chatId: string; currentBg: string; onClose: () => void; onSelect: (bg: string, bgName?: string) => void }) {
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [customColor, setCustomColor] = useState('#EC407A');
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');

  useEffect(() => { api.getChatBackgrounds().then(r => setBackgrounds(r.data || [])).catch(() => {}); }, []);

  const handleSelect = async (bgValue: string, bgName?: string) => {
    try { await api.setChatBackground(chatId, bgValue); onSelect(bgValue, bgName); } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-miamo-card border border-border rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2"><Palette className="w-4 h-4 text-lavender-400" /> Chat Background</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2 p-3 border-b border-border/30">
          <button onClick={() => setTab('presets')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', tab === 'presets' ? 'bg-lavender-400/20 text-lavender-400' : 'text-text-muted hover:text-text-primary')}>Scenes ({backgrounds.length})</button>
          <button onClick={() => setTab('custom')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', tab === 'custom' ? 'bg-lavender-400/20 text-lavender-400' : 'text-text-muted hover:text-text-primary')}>Custom RGB</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {tab === 'presets' ? (
            <div className="grid grid-cols-3 gap-2">
              {backgrounds.map(bg => (
                <button key={bg.id} onClick={() => handleSelect(bg.value, bg.name)}
                  className={cn('aspect-[3/4] rounded-xl border-2 overflow-hidden flex flex-col items-center justify-end p-2',
                    currentBg === bg.value ? 'border-lavender-400 ring-2 ring-lavender-400/30' : 'border-border/30 hover:border-lavender-400/50'
                  )} style={{ background: bg.value }}>
                  <span className="text-[10px] text-gray-800 dark:text-gray-200 font-medium bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">{bg.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-12 h-12 rounded-xl border-0 cursor-pointer bg-transparent" />
                <input value={customColor} onChange={e => setCustomColor(e.target.value)} className="input-premium flex-1 text-sm font-mono" placeholder="#EC407A" />
              </div>
              <div className="aspect-[4/3] rounded-xl border border-border/30 flex items-end p-3" style={{ background: customColor }}>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5"><span className="text-xs text-gray-800 dark:text-gray-200">Preview</span></div>
              </div>
              <Button className="w-full" onClick={() => handleSelect(customColor, 'Custom Color')}>Apply Custom Color</Button>
              <div className="flex flex-wrap gap-2">
                {['#EC407A', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#D81B60', '#06B6D4', '#F97316', '#84CC16', '#FF80AB', '#E11D48'].map(c => (
                  <button key={c} onClick={() => { setCustomColor(c); handleSelect(c, 'Custom Color'); }} className="w-8 h-8 rounded-full border-2 border-border/30 hover:scale-110 transition-transform" style={{ background: c }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// HARSH WORDS WARNING
// ═══════════════════════════════════════════════════════════
function HarshWarningModal({ warnings, onSend, onCancel }: { warnings: string[]; onSend: () => void; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-miamo-card border border-red-500/30 rounded-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Content Warning</h3>
            <p className="text-xs text-text-muted">Harsh language detected</p>
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Your message contains words that may violate Miamo community guidelines. Sending inappropriate content could result in your profile being <span className="text-red-400 font-semibold">flagged or permanently blocked</span>.
        </p>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <p className="text-[11px] text-red-300/80">Detected: {warnings.join(', ')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Edit Message</Button>
          <Button className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30" onClick={onSend}>Send Anyway</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// VOICE / VIDEO CALL OVERLAY
// ═══════════════════════════════════════════════════════════
function CallOverlay({ type, user, onEnd }: { type: 'voice' | 'video'; user: any; onEnd: () => void }) {
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'ringing' | 'connected'>('ringing');

  useEffect(() => { const t = setTimeout(() => setStatus('connected'), 3000); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (status !== 'connected') return;
    const i = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-miamo-bg via-miamo-bg/95 to-miamo-bg flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className={cn('w-28 h-28 rounded-full flex items-center justify-center', status === 'ringing' && 'animate-pulse')}>
            <Avatar src={user?.photos?.[0]?.url} name={user?.displayName || 'User'} size="lg" />
          </div>
          {status === 'ringing' && <div className="absolute inset-0 rounded-full border-2 border-lavender-400/30 animate-ping" />}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary">{user?.displayName || 'User'}</h2>
          <p className="text-sm text-text-muted mt-1">{status === 'ringing' ? (type === 'video' ? 'Video calling…' : 'Calling…') : fmt(duration)}</p>
        </div>
        <div className="flex items-center gap-4 mt-8">
          {type === 'video' && (
            <button className="w-14 h-14 rounded-full bg-miamo-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary"><Video className="w-6 h-6" /></button>
          )}
          <button className="w-14 h-14 rounded-full bg-miamo-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary"><Mic className="w-6 h-6" /></button>
          <button onClick={onEnd} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-gray-900 dark:text-white hover:bg-red-600 shadow-lg shadow-red-500/30"><Phone className="w-7 h-7 rotate-[135deg]" /></button>
          <button className="w-14 h-14 rounded-full bg-miamo-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary"><VolumeX className="w-6 h-6" /></button>
        </div>
        <div className="flex items-center gap-2 mt-4"><Lock className="w-3 h-3 text-emerald-400" /><span className="text-[11px] text-text-muted">End-to-end encrypted</span></div>
        <p className="text-[10px] text-text-muted/50 mt-2">Audio/video calls coming soon — this is a preview</p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHAT VIEW
// ═══════════════════════════════════════════════════════════
export function ChatView({ chat, onBack, onRefreshChats, onReport, onUnmatch, onBlock }: { chat: any; onBack: () => void; onRefreshChats: () => void; onReport: () => void; onUnmatch: () => void; onBlock: () => void }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEntertainment, setShowEntertainment] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [chatBackground, setChatBackground] = useState(chat.background || '#FDF2F5');
  const [harshWarning, setHarshWarning] = useState<{ warnings: string[]; content: string } | null>(null);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());
  const [attachedFile, setAttachedFile] = useState<{ file: File; preview: string; type: string } | null>(null);
  const [beatStreak, setBeatStreak] = useState<{ id: string; count: number; iSentToday: boolean; theyCompletedToday: boolean; todayCompleted: boolean } | null>(null);
  const [showBeatPanel, setShowBeatPanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const other = chat.otherUser || chat.user1 || {};
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages & mark as read (backend marks read on getChatMessages)
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    api.getChatMessages(chat.id).then(r => {
      setMessages(r.data || []);
      // Refresh chat list to update unread counts after marking read
      onRefreshChats();
    }).catch(() => {}).finally(() => setLoading(false));
    setReplyTo(null); setEditingMsg(null); setShowSuggestions(false); setShowEntertainment(false);
    setChatBackground(chat.background || '#FDF2F5');

    // Load beat streak for this chat partner
    const otherUserId = (chat.otherUser || chat.user1)?.id;
    if (otherUserId) {
      api.getBeats().then(r => {
        const beats = r.data || [];
        const match = beats.find((b: any) => {
          const u = b.user || b.matchedUser || {};
          return u.id === otherUserId;
        });
        if (match) {
          setBeatStreak({
            id: match.id,
            count: match.count || 0,
            iSentToday: !!match.iSentToday,
            theyCompletedToday: !!match.theyCompletedToday,
            todayCompleted: !!match.todayCompleted,
          });
        } else {
          setBeatStreak(null);
        }
      }).catch(() => setBeatStreak(null));
    }
  }, [chat.id]);

  // Real-time SSE: fetch messages instantly when a new-message or message-sent event arrives for this chat
  const refreshMessages = useCallback(() => {
    api.getChatMessages(chat.id).then(r => {
      const newMsgs = r.data || [];
      setMessages(prev => newMsgs.length !== prev.length ? newMsgs : prev);
    }).catch(() => {});
  }, [chat.id]);

  useSSE('new-message', (data) => {
    if (data.chatId === chat.id) refreshMessages();
  });
  useSSE('message-sent', (data) => {
    if (data.chatId === chat.id) refreshMessages();
  });

  // Slow fallback poll every 30s (in case SSE reconnects)
  useEffect(() => {
    pollRef.current = setInterval(refreshMessages, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refreshMessages]);

  // Auto-scroll — use scrollTop on the container directly to avoid scrollIntoView
  // bubbling up and scrolling ancestor elements (which pushes the layout header off-screen)
  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    const container = el.parentElement;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Send with harsh-words check
  const handleSend = async (forceSend = false) => {
    const content = message.trim();
    if (!content) return;
    if (!forceSend) {
      try {
        const check = await api.checkContent(content);
        if (check.data && !check.data.safe) { setHarshWarning({ warnings: check.data.warnings, content }); return; }
      } catch {}
    }
    try {
      if (editingMsg) {
        await api.editMessage(editingMsg.id, content);
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content, editedAt: new Date().toISOString() } : m));
        setEditingMsg(null);
      } else {
        const res = await api.sendMessage(chat.id, content, 'text', replyTo?.id);
        if (res.data) setMessages(prev => [...prev, res.data]);
        setReplyTo(null);
      }
      setMessage('');
      setShowSuggestions(false);
    } catch { /* send failed - message stays in input */ }
  };

  const handlePin = async () => { try { await api.pinChat(chat.id, !chat.pinned); setShowMenu(false); onRefreshChats(); } catch {} };
  const handleMute = async () => { try { await api.muteChat(chat.id, !chat.muted); setShowMenu(false); onRefreshChats(); } catch {} };
  const handleArchive = async () => { try { await api.archiveChat(chat.id); onBack(); onRefreshChats(); } catch {} };
  const handleClear = async () => { try { await api.clearChat(chat.id); setMessages([]); setShowMenu(false); } catch {} };
  const handleDeleteForMe = async (id: string) => { try { await api.deleteMessageForMe(id); setMessages(p => p.filter(m => m.id !== id)); } catch {} };
  const handleDeleteForAll = async (id: string) => { try { await api.deleteMessageForAll(id); setMessages(p => p.map(m => m.id === id ? { ...m, deletedForAll: true, content: 'This message was deleted' } : m)); } catch {} };
  const handleReact = async (id: string, emoji: string) => {
    try {
      await api.reactToMessage(id, emoji);
      setMessages(p => p.map(m => {
        if (m.id !== id) return m;
        const existing = m.reactions ? (typeof m.reactions === 'string' ? JSON.parse(m.reactions) : m.reactions) : [];
        existing.push({ emoji, userId: currentUser?.id });
        return { ...m, reactions: JSON.stringify(existing) };
      }));
    } catch {}
  };
  const handleCopy = (content: string) => navigator.clipboard.writeText(content);
  const handleHide = (id: string) => setHiddenMsgIds(p => { const n = new Set(p); n.add(id); return n; });

  // File picker for media sharing
  const handleFilePick = (accept: string, mediaType: string) => {
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.dataset.mediaType = mediaType;
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mediaType = e.target.dataset?.mediaType || 'file';
    const preview = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : '';
    setAttachedFile({ file, preview, type: mediaType });
    // Reset input
    e.target.value = '';
  };

  const handleSendWithAttachment = async () => {
    if (!attachedFile) { handleSend(); return; }
    const content = message.trim() || `${attachedFile.type === 'photo' ? '📷' : attachedFile.type === 'video' ? '🎥' : attachedFile.type === 'audio' ? '🎵' : '📄'} ${attachedFile.file.name}`;
    try {
      const res = await api.sendMessage(chat.id, content, attachedFile.type === 'photo' ? 'image' : attachedFile.type, replyTo?.id);
      if (res.data) setMessages(prev => [...prev, { ...res.data, attachmentPreview: attachedFile.preview, attachmentName: attachedFile.file.name }]);
      setMessage('');
      setAttachedFile(null);
      setReplyTo(null);
    } catch { /* attachment send failed */ }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try { const r = await api.searchMessages(chat.id, searchQuery); setSearchResults(r.data || []); } catch {}
  };

  const handleSendBeatFromChat = async (type: string) => {
    if (!beatStreak) return;
    const typeLabels: Record<string, string> = { text: '💬 Text', photo: '📷 Photo', voice: '🎤 Voice', video: '🎬 Video' };
    try {
      const res = await api.completeBeat(beatStreak.id, type, `${type} beat from chat! ⚡`);
      const data = res.data || {};
      const newCount = data.count ?? beatStreak.count;
      setBeatStreak(prev => prev ? {
        ...prev,
        count: newCount,
        iSentToday: true,
        theyCompletedToday: data.theyCompletedToday ?? prev.theyCompletedToday,
        todayCompleted: data.todayCompleted ?? prev.todayCompleted,
      } : null);
      // Add visible beat event as a system message
      const beatMsg = {
        id: `beat-sent-${Date.now()}`,
        type: 'system',
        content: data.countIncremented
          ? `⚡ You sent a ${typeLabels[type] || type} Beat! Streak is now ${newCount} 🔥`
          : `⚡ You sent a ${typeLabels[type] || type} Beat! Waiting for ${other.displayName?.split(' ')[0] || 'them'} to send back ⏳`,
        createdAt: new Date().toISOString(),
        isSystem: true,
      };
      setMessages(prev => [...prev, beatMsg]);
      setShowBeatPanel(false);
    } catch { /* beat send failed - UI already shows optimistic msg */ }
  };

  const loadSuggestions = async (context?: string) => {
    try { const r = await api.getChatSuggestions(chat.id, context); setSuggestions(r.data || []); setShowSuggestions(true); } catch {}
  };

  const goToProfile = () => router.push(`/profile?id=${other.id}`);
  const visibleMessages = useMemo(() => messages.filter(m => !hiddenMsgIds.has(m.id)), [messages, hiddenMsgIds]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AnimatePresence>{callType && <CallOverlay type={callType} user={other} onEnd={() => setCallType(null)} />}</AnimatePresence>
      <AnimatePresence>{showBgPicker && <BackgroundPicker chatId={chat.id} currentBg={chatBackground} onClose={() => setShowBgPicker(false)} onSelect={(bg, bgName) => {
        setChatBackground(bg);
        setShowBgPicker(false);
        // Insert system message about background change
        const systemMsg = {
          id: `system-bg-${Date.now()}`,
          type: 'system',
          content: `💜 Chat background changed to "${bgName || 'new theme'}"`,
          createdAt: new Date().toISOString(),
          isSystem: true,
        };
        setMessages(prev => [...prev, systemMsg]);
      }} />}</AnimatePresence>
      <AnimatePresence>{harshWarning && <HarshWarningModal warnings={harshWarning.warnings} onSend={() => { setHarshWarning(null); handleSend(true); }} onCancel={() => setHarshWarning(null)} />}</AnimatePresence>

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-3 p-4 border-b border-border/50 bg-miamo-surface/30 backdrop-blur-sm z-10">
        <button onClick={onBack} className="lg:hidden text-text-muted hover:text-text-primary"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={goToProfile} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar src={other.photos?.[0]?.url} name={other.displayName || 'User'} size="sm" online={other.online} verified={other.verified} />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-primary">{other.displayName || 'User'}</h3>
            <p className="text-[11px] text-text-muted flex items-center gap-1">
              {other.online ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Active now</> : 'Tap to view profile'}
            </p>
          </div>
        </button>
        {/* Beat streak tracker badge — click to go to beats page */}
        {beatStreak && (
          <button
            onClick={() => router.push('/beats')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer hover:scale-105',
              beatStreak.todayCompleted
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : beatStreak.iSentToday
                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 animate-pulse'
            )}
            title="View Beats — Click to open Beats page"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{beatStreak.count}</span>🔥
            {beatStreak.todayCompleted && <Check className="w-3 h-3" />}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setCallType('voice')} title="Voice call"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setCallType('video')} title="Video call"><Video className="w-4 h-4" /></Button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full bg-miamo-elevated hover:bg-miamo-card border border-border/30 text-text-muted hover:text-text-primary transition-colors"><MoreVertical className="w-4 h-4" /></button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="absolute right-0 top-full mt-1 z-40 bg-miamo-card border border-border rounded-xl shadow-xl py-1 w-48">
                    <button onClick={() => { setShowSearch(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Search className="w-3 h-3" /> Search in chat</button>
                    <button onClick={() => { setShowBgPicker(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Palette className="w-3 h-3" /> Change background</button>
                    <button onClick={handlePin} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Pin className="w-3 h-3" /> {chat.pinned ? 'Unpin' : 'Pin chat'}</button>
                    <button onClick={handleMute} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><VolumeX className="w-3 h-3" /> {chat.muted ? 'Unmute' : 'Mute'}</button>
                    <button onClick={handleArchive} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><Archive className="w-3 h-3" /> Archive</button>
                    <div className="h-px bg-border/30 my-0.5" />
                    <button onClick={goToProfile} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><UserIcon className="w-3 h-3" /> View profile</button>
                    <button onClick={() => { setShowMenu(false); api.archiveChat(chat.id).catch(() => {}); onBack(); }} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2"><EyeOff className="w-3 h-3" /> Hide chat</button>
                    <button onClick={() => { setShowMenu(false); onReport(); }} className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-400/10 flex items-center gap-2"><Flag className="w-3 h-3" /> Report</button>
                    <button onClick={() => { setShowMenu(false); onBlock(); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Ban className="w-3 h-3" /> Block</button>
                    <button onClick={() => { setShowMenu(false); onUnmatch(); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><UserMinus className="w-3 h-3" /> Unmatch</button>
                    <div className="h-px bg-border/30 my-0.5" />
                    <button onClick={handleClear} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Clear chat</button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-border/50 overflow-hidden">
            <div className="p-3 flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search messages…" className="input-premium w-full pl-8 text-xs" autoFocus />
              </div>
              <Button size="sm" onClick={handleSearch}>Search</Button>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
            {searchResults.length > 0 && (
              <div className="px-3 pb-3 max-h-32 overflow-y-auto space-y-1">
                {searchResults.map(r => (
                  <div key={r.id} className="text-xs bg-miamo-elevated/50 rounded-lg px-3 py-2">
                    <span className="text-text-muted">{r.sender?.displayName}: </span><span className="text-text-primary">{r.content}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages Area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
        style={{ background: chatBackground.startsWith('linear') || chatBackground.startsWith('radial') ? chatBackground : chatBackground.startsWith('#') ? chatBackground : undefined }}>
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] text-text-muted">End-to-end encrypted</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><img src="/logo.png" alt="" className="w-8 h-8 rounded-lg animate-pulse" /></div>
        ) : visibleMessages.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-lavender-400/10 flex items-center justify-center"><MessageCircle className="w-8 h-8 text-lavender-400" /></div>
            <div>
              <p className="text-sm font-medium text-text-primary">Say hello to {other.displayName?.split(' ')[0] || 'your match'} 💜</p>
              <p className="text-xs text-text-muted mt-1">Need help? Try AI suggestions below!</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadSuggestions()} className="gap-2"><Sparkles className="w-3.5 h-3.5" /> Get conversation starters</Button>
          </div>
        ) : (
          visibleMessages.map((msg: any) => (
            msg.isSystem ? (
              <div key={msg.id} className="flex justify-center my-2">
                <div className={cn(
                  'backdrop-blur-sm px-4 py-1.5 rounded-full',
                  msg.content?.includes('⚡') ? 'bg-pink-500/15 border border-pink-300/20'
                  : msg.content?.includes('💜') ? 'bg-violet-500/15 border border-violet-300/20'
                  : 'bg-black/20'
                )}>
                  <span className={cn(
                    'text-[11px]',
                    msg.content?.includes('⚡') ? 'text-pink-600 font-medium'
                    : msg.content?.includes('💜') ? 'text-violet-600 font-medium'
                    : 'text-text-muted'
                  )}>{msg.content}</span>
                </div>
              </div>
            ) : (
            <MessageBubble key={msg.id} msg={msg} isOwn={msg.isOwn}
              onReply={() => { setReplyTo(msg); inputRef.current?.focus(); }}
              onEdit={() => { setEditingMsg(msg); setMessage(msg.content); inputRef.current?.focus(); }}
              onReact={(emoji) => handleReact(msg.id, emoji)}
              onDeleteForMe={() => handleDeleteForMe(msg.id)}
              onDeleteForAll={() => handleDeleteForAll(msg.id)}
              onCopy={() => handleCopy(msg.content)}
              onHide={() => handleHide(msg.id)}
              onView={() => {
                // Open media in new tab for viewing
                if (msg.attachmentPreview) window.open(msg.attachmentPreview, '_blank');
                else if (msg.mediaUrl) window.open(msg.mediaUrl, '_blank');
              }}
              onDownload={() => {
                // Download media
                const url = msg.attachmentPreview || msg.mediaUrl;
                if (url) {
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = msg.attachmentName || msg.content || 'download';
                  a.click();
                }
              }}
            />
            )
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── AI Suggestions Panel ── */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-lavender-400" /> AI Suggestions</span>
                <button onClick={() => setShowSuggestions(false)} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s: any, i: number) => (
                  <button key={i} onClick={() => { setMessage(s.text); setShowSuggestions(false); inputRef.current?.focus(); }}
                    className="bg-miamo-elevated/50 border border-border/30 rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:bg-lavender-400/10 hover:border-lavender-400/30 hover:text-lavender-400 transition-all text-left max-w-[280px]">
                    {s.text}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {SUGGESTION_CATEGORIES.map((cat, i) => (
                  <button key={i} onClick={() => loadSuggestions(cat.context)}
                    className="px-2 py-1 rounded-full bg-miamo-elevated/30 text-[10px] text-text-muted hover:text-lavender-400 hover:bg-lavender-400/10 transition-colors">{cat.label}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Entertainment Zone ── */}
      <AnimatePresence>
        {showEntertainment && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-2"><Gamepad2 className="w-3.5 h-3.5 text-lavender-400" /> Entertainment Zone</span>
                <button onClick={() => setShowEntertainment(false)} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ENTERTAINMENT_ITEMS.map((item, i) => (
                  <button key={i} onClick={() => { const p = item.prompts[Math.floor(Math.random() * item.prompts.length)]; setMessage(`${item.icon} ${item.label}: ${p}`); setShowEntertainment(false); inputRef.current?.focus(); }}
                    className="bg-miamo-elevated/30 border border-border/20 rounded-xl p-3 text-center hover:bg-lavender-400/10 hover:border-lavender-400/20 transition-all group">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="text-[10px] text-text-muted group-hover:text-lavender-400 mt-1 font-medium">{item.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Beat Send Panel ── */}
      <AnimatePresence>
        {showBeatPanel && beatStreak && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-pink-400" /> Send a Beat
                  <span className="text-[10px] text-text-muted">({beatStreak.count} day streak 🔥)</span>
                </span>
                <button onClick={() => setShowBeatPanel(false)} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
              </div>
              {beatStreak.todayCompleted ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400 font-medium">Both sent today — streak saved! You can still send more beats.</span>
                </div>
              ) : beatStreak.iSentToday ? (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] text-blue-400 font-medium">You sent — waiting for {other.displayName?.split(' ')[0]} to send back.</span>
                </div>
              ) : beatStreak.theyCompletedToday ? (
                <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-lg px-3 py-2 animate-pulse">
                  <Zap className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[11px] text-pink-400 font-medium">{other.displayName?.split(' ')[0]} sent — send back to grow your streak!</span>
                </div>
              ) : null}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: 'text', icon: MessageCircle, label: 'Text', color: 'text-pink-400', bg: 'bg-pink-500/10' },
                  { type: 'photo', icon: Image, label: 'Photo', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { type: 'voice', icon: Mic, label: 'Voice', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { type: 'video', icon: Film, label: 'Video', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                ].map(bt => (
                  <button key={bt.type} onClick={() => handleSendBeatFromChat(bt.type)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-miamo-elevated/30 border border-border/20 hover:bg-lavender-400/10 hover:border-lavender-400/20 transition-all group">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bt.bg)}>
                      <bt.icon className={cn('w-4 h-4', bt.color)} />
                    </div>
                    <span className="text-[10px] text-text-muted group-hover:text-lavender-400 font-medium">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reply / Edit Bar ── */}
      <AnimatePresence>
        {(replyTo || editingMsg) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 bg-miamo-elevated/30">
              <div className={cn('w-1 h-8 rounded-full', editingMsg ? 'bg-amber-400' : 'bg-lavender-400')} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold">{editingMsg ? <span className="text-amber-400">Editing message</span> : <span className="text-lavender-400">Replying to {replyTo?.isOwn ? 'yourself' : other.displayName}</span>}</p>
                <p className="text-xs text-text-muted truncate">{editingMsg?.content || replyTo?.content}</p>
              </div>
              <button onClick={() => { setReplyTo(null); setEditingMsg(null); setMessage(''); }} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ── */}
      <div className="shrink-0 p-3 border-t border-border/50 bg-miamo-surface/30 backdrop-blur-sm">
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

        {/* Attachment preview */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-2 overflow-hidden">
              <div className="flex items-center gap-3 bg-miamo-elevated/50 border border-border/30 rounded-xl p-3">
                {attachedFile.preview && attachedFile.type === 'photo' ? (
                  <img src={attachedFile.preview} alt="Preview" className="w-14 h-14 object-contain rounded-lg" />
                ) : attachedFile.preview && attachedFile.type === 'video' ? (
                  <video src={attachedFile.preview} className="w-14 h-14 object-contain rounded-lg" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-lavender-400/10 flex items-center justify-center">
                    <Paperclip className="w-6 h-6 text-lavender-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{attachedFile.file.name}</p>
                  <p className="text-[10px] text-text-muted">{(attachedFile.file.size / 1024).toFixed(1)} KB · {attachedFile.type}</p>
                </div>
                <button onClick={() => setAttachedFile(null)} className="text-text-muted hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <div className="flex gap-0.5 items-end">
            <div className="relative">
              <Button variant="ghost" size="icon-sm" onClick={() => setShowAttachMenu(!showAttachMenu)} title="Attach"><Paperclip className="w-4 h-4" /></Button>
              <AnimatePresence>
                {showAttachMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowAttachMenu(false)} />
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                      className="absolute bottom-full mb-2 left-0 z-40 bg-miamo-card border border-border rounded-xl shadow-xl p-2 space-y-1 w-40">
                      <button onClick={() => handleFilePick('image/*', 'photo')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center"><Image className="w-3.5 h-3.5 text-blue-400" /></div> Photo
                      </button>
                      <button onClick={() => handleFilePick('video/*', 'video')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-rose-500/20 flex items-center justify-center"><Film className="w-3.5 h-3.5 text-rose-400" /></div> Video
                      </button>
                      <button onClick={() => handleFilePick('audio/*', 'audio')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center"><Music className="w-3.5 h-3.5 text-emerald-400" /></div> Audio
                      </button>
                      <button onClick={() => handleFilePick('*/*', 'file')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-miamo-elevated">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center"><Paperclip className="w-3.5 h-3.5 text-amber-400" /></div> File
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <Button variant="ghost" size="icon-sm" title="Voice message" onClick={() => setMessage('[🎤 Voice message]')}><Mic className="w-4 h-4" /></Button>
          </div>
          <div className="flex-1 relative">
            <input ref={inputRef} value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); attachedFile ? handleSendWithAttachment() : handleSend(); } }}
              placeholder={editingMsg ? 'Edit message…' : attachedFile ? `Add caption for ${attachedFile.file.name}…` : 'Type a message…'} className="input-premium w-full pr-36 text-sm" />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {beatStreak && (
                <button onClick={() => setShowBeatPanel(!showBeatPanel)}
                  className={cn('p-1.5 rounded-md transition-colors flex items-center gap-0.5', showBeatPanel ? 'text-pink-500 bg-pink-100' : 'text-text-muted hover:text-pink-400')}
                  title={`Beats (${beatStreak.count}🔥)`}>
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold">{beatStreak.count}</span>
                </button>
              )}
              <button onClick={() => loadSuggestions()} className="p-1.5 text-text-muted hover:text-lavender-400 transition-colors" title="AI suggestions"><Sparkles className="w-3.5 h-3.5" /></button>
              <button onClick={() => setShowEntertainment(!showEntertainment)} className="p-1.5 text-text-muted hover:text-lavender-400 transition-colors" title="Entertainment"><Gamepad2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={cn('p-1.5 transition-colors', showEmojiPicker ? 'text-amber-500' : 'text-text-muted hover:text-amber-400')} title="Emoji"><Smile className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <button
            onClick={() => attachedFile ? handleSendWithAttachment() : handleSend()}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #EC407A 0%, #D81B60 50%, #AD1457 100%)', boxShadow: '0 4px 14px rgba(236,64,122,0.35)' }}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Emoji Picker ── */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/30 overflow-hidden">
            <div className="p-3 space-y-2 max-h-[240px] flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">Emojis</span>
                <button onClick={() => setShowEmojiPicker(false)} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button key={i} data-cat={i}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap text-text-muted hover:text-lavender-400 hover:bg-lavender-400/10 transition-colors"
                    onClick={() => {
                      const el = document.getElementById(`emoji-cat-${i}`);
                      if (el && el.parentElement) {
                        el.parentElement.scrollTo({ top: el.offsetTop - el.parentElement.offsetTop, behavior: 'smooth' });
                      }
                    }}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'thin' }}>
                {EMOJI_CATEGORIES.map((cat, ci) => (
                  <div key={ci} id={`emoji-cat-${ci}`}>
                    <p className="text-[10px] text-text-muted font-medium mb-1">{cat.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {cat.emojis.map((emoji, ei) => (
                        <button key={ei} onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                          className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-miamo-elevated/50 hover:scale-110 transition-all">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
