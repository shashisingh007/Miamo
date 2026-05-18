'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical, Pin, Archive, VolumeX, EyeOff, Flag, Ban,
  PauseCircle, PlayCircle, CheckSquare, Square, User as UserIcon, UserMinus,
} from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function ChatListItem({ chat, active, onClick, onAction, selectMode, selected, onSelect }: { chat: any; active: boolean; onClick: () => void; onAction: (action: string, data?: any) => void; selectMode?: boolean; selected?: boolean; onSelect?: () => void }) {
  const other = chat.otherUser || chat.user1 || {};
  const name = other.displayName || 'User';
  const photo = other.photos?.[0]?.url || other.photos?.[0];
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const handleAction = (action: string, data?: any) => {
    setShowMenu(false);
    onAction(action, data);
  };

  return (
    <div className="relative">
      <button onClick={selectMode ? onSelect : onClick} className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 text-left group',
        active ? 'bg-lavender-400/10 border border-lavender-400/20' : 'hover:bg-miamo-elevated/50',
        selected && 'bg-lavender-400/5 border border-lavender-400/30',
        (chat.held || chat.onHold || chat._isHeld) && !active && 'opacity-40'
      )}>
        {selectMode && (
          <div className="shrink-0">
            {selected ? <CheckSquare className="w-5 h-5 text-lavender-400" /> : <Square className="w-5 h-5 text-text-muted/40" />}
          </div>
        )}
        <Avatar src={photo} name={name} size="md" online={other.online} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-text-primary truncate">{name}</h4>
              {chat._isHeld && <PauseCircle className="w-3 h-3 text-amber-400/70" />}
              {chat.muted && !chat._isHeld && <VolumeX className="w-3 h-3 text-text-muted/50" />}
              {chat.pinned && <Pin className="w-3 h-3 text-lavender-400" />}
            </div>
            {chat.lastMessageAt && <span className="text-[11px] text-text-muted shrink-0">{formatRelativeTime(chat.lastMessageAt)}</span>}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-text-muted truncate pr-2">{chat.lastMessagePreview || 'Start a conversation'}</p>
            {chat.unreadCount > 0 && (
              <span className="shrink-0 w-5 h-5 bg-lavender-400 text-gray-900 dark:text-white text-[10px] font-bold rounded-full flex items-center justify-center">{chat.unreadCount}</span>
            )}
          </div>
        </div>
        {/* 3-dot vertical menu trigger */}
        {!selectMode && (
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); setShowMenu(true); }}>
            <MoreVertical className="w-4 h-4 text-text-muted hover:text-text-primary" />
          </div>
        )}
      </button>

      {/* Chat list item context menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="absolute right-2 top-full mt-1 z-50 bg-miamo-card border border-border rounded-xl shadow-2xl py-1 w-52">
              <button onClick={() => handleAction('pin')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <Pin className="w-3 h-3" /> {chat.pinned ? 'Unpin chat' : 'Pin chat'}
              </button>
              <button onClick={() => handleAction('mute')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <VolumeX className="w-3 h-3" /> {chat.muted ? 'Unmute' : 'Mute notifications'}
              </button>
              <button onClick={() => handleAction('hold')} className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2">
                {chat._isHeld ? <><PlayCircle className="w-3 h-3" /> Resume</> : <><PauseCircle className="w-3 h-3" /> Hold</>}
              </button>
              <button onClick={() => handleAction('archive')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <Archive className="w-3 h-3" /> Archive
              </button>
              <button onClick={() => handleAction('hide')} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <EyeOff className="w-3 h-3" /> Hide chat
              </button>
              <div className="h-px bg-border/30 my-0.5" />
              <button onClick={() => router.push(`/profile?id=${other.id}`)} className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-miamo-elevated flex items-center gap-2">
                <UserIcon className="w-3 h-3" /> View profile
              </button>
              <button onClick={() => handleAction('report')} className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-amber-400/10 flex items-center gap-2">
                <Flag className="w-3 h-3" /> Report
              </button>
              <button onClick={() => handleAction('block')} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <Ban className="w-3 h-3" /> Block
              </button>
              <button onClick={() => handleAction('unmatch')} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                <UserMinus className="w-3 h-3" /> Unmatch
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
