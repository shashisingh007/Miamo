'use client';

import React, { useState, useEffect, useCallback, useMemo, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Pin, Archive, MessageCircle, ChevronLeft, Trash2, VolumeX,
  Shield, Lock, EyeOff, ListChecks, PlayCircle, Unlink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSSE } from '@/hooks/useSSE';
import { useTrackPageView, useTrackActivity, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ChatListItem } from './components/ChatListItem';
import { ChatView } from './components/ChatView';
import { MessagesFeedbackModal } from './components/MessagesFeedbackModal';

// ═══════════════════════════════════════════════════════════
// GLASS TOOLTIP BUTTON — shows label on hover with glass effect
// ═══════════════════════════════════════════════════════════
function GlassTooltipButton({ label, active, activeColor = 'lavender', onClick, children }: { label: string; active?: boolean; activeColor?: 'lavender' | 'amber'; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const colorActive = activeColor === 'amber' ? 'text-amber-400 bg-amber-400/10' : 'text-lavender-400 bg-lavender-400/10';
  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button onClick={onClick} className={cn('p-1.5 rounded-lg transition-all text-text-muted hover:text-text-primary', active && colorActive)}>
        {children}
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <span className="px-2 py-1 text-[10px] font-medium text-text-secondary whitespace-nowrap rounded-lg bg-white/5 backdrop-blur-md border border-white/10 shadow-lg">
              {label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// MESSAGES PAGE
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// ERROR BOUNDARY — prevents full page crash
// ═══════════════════════════════════════════════════════════
class MessagesErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    if (process.env.NODE_ENV === 'development') console.warn('[MessagesErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6 space-y-4">
            <MessageCircle className="w-10 h-10 text-lavender-400/40 mx-auto" />
            <h2 className="text-lg font-bold text-text-primary">Something went wrong</h2>
            <p className="text-sm text-text-muted">The chat encountered an error.</p>
            {this.state.error && (
              <p className="text-xs text-red-400 font-mono max-w-sm break-all">{this.state.error.message}</p>
            )}
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-4 py-2 bg-lavender-400 text-gray-900 dark:text-white rounded-lg font-medium text-sm">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MessagesPage() {
  return (
    <MessagesErrorBoundary>
      <MessagesPageInner />
    </MessagesErrorBoundary>
  );
}

function MessagesPageInner() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'archived' | 'hidden' | 'held'>('all');
  const [totalMsgCount, setTotalMsgCount] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [heldChatIds, setHeldChatIds] = useState<Set<string>>(new Set());
  const [heldUserIds, setHeldUserIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ type: 'unmatch' | 'report' | 'block'; userId: string; userName: string } | null>(null);

  useTrackPageView('messages');
  useTrackScrollDepth('messages');
  const trackActivity = useTrackActivity();

  // Sync held state from backend (source of truth)
  const syncHeldFromBackend = useCallback(async () => {
    try {
      const [incoming, matches] = await Promise.allSettled([
        api.getIncomingLikes({ showHeld: 'true' }),
        api.getMatches({ includeHeld: 'true' }),
      ]);
      const heldUids = new Set<string>();
      if (incoming.status === 'fulfilled') {
        (incoming.value.data || []).filter((i: any) => i.isHeld).forEach((i: any) => {
          if (i.user?.id) heldUids.add(i.user.id);
        });
      }
      if (matches.status === 'fulfilled') {
        (matches.value.data || []).filter((m: any) => m.isHeld).forEach((m: any) => {
          if (m.matchedUser?.id) heldUids.add(m.matchedUser.id);
        });
      }
      setHeldUserIds(heldUids);
    } catch {}
  }, []);

  // Load held state on mount
  useEffect(() => {
    setMounted(true);
    syncHeldFromBackend();
  }, [syncHeldFromBackend]);

  // Persist held chats to localStorage (backup) and update local held set
  const updateHeldChats = (updater: (prev: Set<string>) => Set<string>) => {
    setHeldChatIds(prev => {
      const next = updater(prev);
      return next;
    });
  };

  const loadChats = useCallback(() => {
    setLoading(true);
    const fetcher = (tab === 'archived' || tab === 'hidden') ? api.getArchivedChats() : api.getChats();
    fetcher.then(r => {
      let data = r.data || [];
      const total = data.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      setTotalMsgCount(total);
      data = data.map((c: any) => {
        const otherUserId = (c.otherUser || c.user1)?.id;
        return { ...c, _isHeld: heldUserIds.has(otherUserId) || heldChatIds.has(c.id) };
      });
      if (tab === 'held') data = data.filter((c: any) => c._isHeld);
      setChats(data);
    }).catch(() => { setChats([]); setTotalMsgCount(0); }).finally(() => setLoading(false));
  }, [tab, heldUserIds, heldChatIds]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Real-time SSE: refresh chat list instantly on new messages
  useSSE('new-message', () => { loadChats(); });
  useSSE('message-sent', () => { loadChats(); });

  // Slow fallback poll every 30s + re-sync held state
  useEffect(() => {
    const i = setInterval(() => {
      syncHeldFromBackend();
      loadChats();
    }, 30000);
    return () => clearInterval(i);
  }, [syncHeldFromBackend, loadChats]);

  const filteredChats = useMemo(() => chats.filter(c => {
    const other = c.otherUser || c.user1 || {};
    return (other.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
  }), [chats, searchQuery]);

  const activeConversation = chats.find(c => c.id === activeChat);

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <div className={cn('w-full lg:w-[360px] border-r border-border/50 flex flex-col bg-miamo-surface/20', activeChat && 'hidden lg:flex')}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-lavender-400" /> Messages
              {totalMsgCount > 0 && (
                <span className="ml-1 min-w-[22px] h-[22px] bg-lavender-400 rounded-full text-[11px] font-bold text-gray-900 dark:text-white flex items-center justify-center px-1.5">
                  {totalMsgCount > 99 ? '99+' : totalMsgCount}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              <GlassTooltipButton label="Select" active={selectMode} onClick={() => { setSelectMode(!selectMode); setSelectedChats(new Set()); }}>
                <ListChecks className="w-4 h-4" />
              </GlassTooltipButton>
              <GlassTooltipButton label="Hidden" active={tab === 'hidden'} onClick={() => setTab(tab === 'hidden' ? 'all' : 'hidden')}>
                <EyeOff className="w-4 h-4" />
              </GlassTooltipButton>
              <GlassTooltipButton label="Archived" active={tab === 'archived'} onClick={() => setTab(tab === 'archived' ? 'all' : 'archived')}>
                <Archive className="w-4 h-4" />
              </GlassTooltipButton>
            </div>
          </div>
          {tab !== 'all' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setTab('all')} className="text-text-muted hover:text-text-primary"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-text-muted font-medium">{tab === 'archived' ? 'Archived Chats' : tab === 'held' ? 'On Hold' : 'Hidden Chats'}</span>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations…" className="input-premium w-full pl-9 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-12"><img src="/logo.png" alt="" className="w-8 h-8 rounded-lg animate-pulse" /></div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <MessageCircle className="w-10 h-10 text-text-muted/20 mx-auto" />
              <p className="text-sm text-text-muted">{searchQuery ? 'No results' : tab === 'archived' ? 'No archived chats' : tab === 'hidden' ? 'No hidden chats' : tab === 'held' ? 'No conversations on hold' : 'No conversations yet'}</p>
            </div>
          ) : (
            filteredChats.map(c => <ChatListItem key={c.id} chat={c} active={c.id === activeChat} onClick={() => { trackActivity('open_chat', 'conversation', c.id); setActiveChat(c.id); }}
              selectMode={selectMode}
              selected={selectedChats.has(c.id)}
              onSelect={() => setSelectedChats(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
              onAction={async (action, data) => {
                try {
                  const otherUserId = (c.otherUser || c.user1)?.id;
                  const otherName = (c.otherUser || c.user1)?.displayName || 'User';
                  switch (action) {
                    case 'pin': await api.pinChat(c.id, !c.pinned); break;
                    case 'mute': await api.muteChat(c.id, !c.muted); break;
                    case 'hold':
                      if (c._isHeld) {
                        // Resume: call backend, then re-sync
                        if (otherUserId) try { await api.resumeIncoming(otherUserId); } catch {}
                        setHeldUserIds(prev => { const n = new Set(prev); n.delete(otherUserId); return n; });
                        updateHeldChats(prev => { const n = new Set(prev); n.delete(c.id); return n; });
                      } else {
                        // Hold: call backend, then re-sync
                        if (otherUserId) try { await api.holdIncoming(otherUserId); } catch {}
                        setHeldUserIds(prev => { const n = new Set(prev); n.add(otherUserId); return n; });
                        updateHeldChats(prev => { const n = new Set(prev); n.add(c.id); return n; });
                      }
                      break;
                    case 'archive': await api.archiveChat(c.id); break;
                    case 'hide': await api.archiveChat(c.id); break;
                    case 'block':
                      if (otherUserId) setFeedbackModal({ type: 'block', userId: otherUserId, userName: otherName });
                      return; // Don't reload yet — modal will handle it
                    case 'unmatch':
                      if (otherUserId) setFeedbackModal({ type: 'unmatch', userId: otherUserId, userName: otherName });
                      return;
                    case 'report':
                      if (otherUserId) setFeedbackModal({ type: 'report', userId: otherUserId, userName: otherName });
                      return;
                  }
                  loadChats();
                } catch {}
              }}
            />)
          )}
        </div>
        {/* Selection action bar */}
        {selectMode && selectedChats.size > 0 ? (
          <div className="p-3 border-t border-border/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-medium">{selectedChats.size} selected</span>
              <button onClick={() => { setSelectedChats(new Set(filteredChats.map(c => c.id))); }} className="text-[11px] text-lavender-400 hover:underline">Select all</button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {tab === 'held' ? (
                <>
                  <button onClick={async () => {
                    // Resume all selected: call backend for each, then sync held state
                    for (const id of Array.from(selectedChats)) {
                      const chat = chats.find(ch => ch.id === id);
                      const otherUserId = (chat?.otherUser || chat?.user1)?.id;
                      if (otherUserId) try { await api.resumeIncoming(otherUserId); } catch {}
                    }
                    await syncHeldFromBackend();
                    updateHeldChats(prev => { const n = new Set(prev); Array.from(selectedChats).forEach(id => n.delete(id)); return n; });
                    setSelectedChats(new Set()); setSelectMode(false); loadChats();
                  }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition-colors">
                    <PlayCircle className="w-3 h-3" /> Resume
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.unmatch(id, 'bulk_unmatch'); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Unlink className="w-3 h-3" /> Unmatch
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.archiveChat(id); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-miamo-elevated border border-border/30 text-text-secondary text-[11px] font-medium hover:bg-miamo-card transition-colors">
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.muteChat(id, true); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-miamo-elevated border border-border/30 text-text-secondary text-[11px] font-medium hover:bg-miamo-card transition-colors">
                    <VolumeX className="w-3 h-3" /> Mute
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.pinChat(id, true); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-miamo-elevated border border-border/30 text-text-secondary text-[11px] font-medium hover:bg-miamo-card transition-colors">
                    <Pin className="w-3 h-3" /> Pin
                  </button>
                  <button onClick={async () => { for (const id of Array.from(selectedChats)) { try { await api.unmatch(id, 'bulk_unmatch'); } catch {} } setSelectedChats(new Set()); setSelectMode(false); loadChats(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors">
                    <Unlink className="w-3 h-3" /> Unmatch
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-border/30">
            <div className="flex items-center justify-center gap-2 py-1"><Lock className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-text-muted">End-to-end encrypted</span></div>
          </div>
        )}
      </div>

      {/* ── Chat View ── */}
      <div className={cn('flex-1 flex flex-col min-h-0 overflow-hidden', !activeChat && 'hidden lg:flex')}>
        {activeConversation ? (
          <ChatView chat={activeConversation} onBack={() => setActiveChat(null)} onRefreshChats={loadChats}
            onReport={() => {
              const other = activeConversation.otherUser || activeConversation.user1;
              if (other?.id) setFeedbackModal({ type: 'report', userId: other.id, userName: other.displayName || 'User' });
            }}
            onUnmatch={() => {
              const other = activeConversation.otherUser || activeConversation.user1;
              if (other?.id) setFeedbackModal({ type: 'unmatch', userId: other.id, userName: other.displayName || 'User' });
            }}
            onBlock={() => {
              const other = activeConversation.otherUser || activeConversation.user1;
              if (other?.id) setFeedbackModal({ type: 'block', userId: other.id, userName: other.displayName || 'User' });
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-lavender-400/10 to-violet-deep/10 flex items-center justify-center"><MessageCircle className="w-10 h-10 text-lavender-400/40" /></div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Your Messages</h3>
                <p className="text-sm text-text-muted mt-1">Select a conversation to start chatting</p>
              </div>
              <div className="flex items-center justify-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400" /><span className="text-xs text-text-muted">All messages are private and encrypted</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Feedback Modal (Report / Unmatch / Block) ─── */}
      <AnimatePresence>
        {feedbackModal && (
          <MessagesFeedbackModal
            type={feedbackModal.type}
            userName={feedbackModal.userName}
            onClose={() => setFeedbackModal(null)}
            onSubmit={async (reason, details) => {
              const { type, userId } = feedbackModal;
              try {
                if (type === 'unmatch') {
                  await api.unmatchByUser(userId, reason, details);
                } else if (type === 'report') {
                  await api.reportByUser(userId, reason, details);
                } else if (type === 'block') {
                  await api.blockByUser(userId, reason, details);
                }
              } catch {}
              setFeedbackModal(null);
              loadChats();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}