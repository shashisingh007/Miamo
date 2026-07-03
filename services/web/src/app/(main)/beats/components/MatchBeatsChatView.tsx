'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Camera, Check, CheckCheck, ChevronLeft, Clock,
 Download, Eye, EyeOff, Send, Trash2, X, Zap, Paperclip, Loader2,
 Lock, BookmarkCheck, Bookmark, ScanLine, Play,
} from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { BeatMatch, BeatEntry, BEAT_TYPES } from './constants';
import { BeatsIcon, StreakFlame, BeatDayStatus } from './BeatWidgets';
import { loadImageFromFile, compressImage, compressVideo, validateMediaFile } from '@/lib/media-utils';
import { api } from '@/lib/api';
import { Portal } from '@/components/ui/portal';

const MEDIA_BEAT_TYPES = new Set(['photo', 'video', 'voice', 'music', 'gif', 'snap']);
const PHOTO_TIMER_SEC = 10;
function acceptForBeatType(type: string | null): string {
 switch (type) {
 case 'photo': return 'image/*';
 case 'video': return 'video/*';
 case 'voice': return 'audio/*';
 case 'music': return 'audio/*';
 case 'gif': return 'image/gif,image/*';
 default: return '';
 }
}

function detectMediaKind(content: string): 'image' | 'video' | 'audio' | null {
 const first = (content || '').split('\n', 1)[0] || '';
 if (/^data:image\//.test(first) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(first)) return 'image';
 if (/^data:video\//.test(first) || /\.(mp4|webm|mov)(\?|$)/i.test(first)) return 'video';
 if (/^data:audio\//.test(first) || /\.(mp3|m4a|wav|ogg|aac)(\?|$)/i.test(first)) return 'audio';
 return null;
}

/* ═══════════════════════════════════════════════════════════
 SAVED MEDIA WRAPPER — double-tap anywhere on the tile to unsave
 ═══════════════════════════════════════════════════════════ */
function SavedMedia({ enabled, onUnsave, children, className }: {
 enabled: boolean;
 onUnsave: () => void;
 children: React.ReactNode;
 className?: string;
}) {
 const lastTapRef = useRef(0);
 const [flash, setFlash] = useState(false);
 const trigger = (e: React.PointerEvent) => {
 if (!enabled) return;
 const now = Date.now();
 if (now - lastTapRef.current < 350) {
 lastTapRef.current = 0;
 e.preventDefault();
 e.stopPropagation();
 setFlash(true);
 window.setTimeout(() => setFlash(false), 350);
 onUnsave();
 } else {
 lastTapRef.current = now;
 }
 };
 return (
 <div
 onPointerDownCapture={trigger}
 className={cn('relative inline-block group', className)}
 title={enabled ? 'Double-tap to unsave' : undefined}
 >
 {children}
 {enabled && (
 <span className="pointer-events-none absolute top-1.5 right-1.5 text-[9px] font-semibold uppercase tracking-wide bg-black/50 text-white px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
 Double-tap to unsave
 </span>
 )}
 {flash && (
 <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-rose-main animate-pulse" />
 )}
 </div>
 );
}

/* ═══════════════════════════════════════════════════════════
 TAP / LONG-PRESS BUTTON for ephemeral beats (web + touch)
 ═══════════════════════════════════════════════════════════ */
const HOLD_MS = 550;
function TapHoldButton({ viewed, onTap, onHold, isMine }: {
 viewed: boolean; onTap: () => void; onHold: () => void; isMine: boolean;
}) {
 const heldRef = useRef(false);
 const timerRef = useRef<number | null>(null);
 const startedAtRef = useRef<number>(0);
 const [pressing, setPressing] = useState(false);

 const start = (e: React.PointerEvent<HTMLButtonElement>) => {
 if (e.button !== undefined && e.button !== 0) return; // left/main only
 (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
 e.preventDefault();
 heldRef.current = false;
 startedAtRef.current = Date.now();
 setPressing(true);
 if (timerRef.current) window.clearTimeout(timerRef.current);
 timerRef.current = window.setTimeout(() => {
 heldRef.current = true;
 setPressing(false);
 if (viewed) {
 // haptic feedback (mobile) + animate
 try { (navigator as any).vibrate?.(15); } catch { /* ignore */ }
 onHold();
 }
 }, HOLD_MS);
 };
 const finish = () => {
 if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
 setPressing(false);
 if (!heldRef.current && !viewed) onTap();
 heldRef.current = false;
 };
 const cancel = () => {
 if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
 setPressing(false);
 heldRef.current = false;
 };

 return (
 <button
 onPointerDown={start}
 onPointerUp={finish}
 onPointerLeave={cancel}
 onPointerCancel={cancel}
 onContextMenu={(e) => e.preventDefault()}
 className={cn(
 'relative inline-flex items-center gap-2 px-4 py-3 rounded-xl border transition-all select-none overflow-hidden',
 viewed
 ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40'
 : 'bg-rose-main/10 hover:bg-rose-main/20 border-rose-main/30',
 pressing && 'scale-[0.98]',
 isMine ? 'ml-auto' : ''
 )}
 style={{ touchAction: 'manipulation', WebkitUserSelect: 'none' }}
 >
 {viewed && pressing && (
 <span
 className="absolute inset-0 bg-amber-500/30 origin-left"
 style={{ animation: `holdFill ${HOLD_MS}ms linear forwards` }}
 />
 )}
 <Eye className={cn('w-4 h-4 relative z-10', viewed ? 'text-amber-600' : 'text-rose-main')} />
 <span className={cn('text-[13px] font-semibold relative z-10', viewed ? 'text-amber-700' : 'text-rose-main')}>
 {viewed ? (pressing ? 'Hold to replay…' : 'Long-press to replay') : 'Tap to view'}
 </span>
 <style>{`@keyframes holdFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
 </button>
 );
}

/* ═══════════════════════════════════════════════════════════
 EPHEMERAL VIEWER — Snapchat-style fullscreen overlay
 ═══════════════════════════════════════════════════════════ */
function EphemeralViewer({ entry, content, onClose, onSave, onDownload, lastView }: {
 entry: BeatEntry;
 content: string;
 onClose: () => void;
 onSave: () => Promise<void> | void;
 onDownload: () => Promise<void> | void;
 lastView: boolean;
}) {
 const kind = detectMediaKind(content);
 const first = content.split('\n', 1)[0] || '';
 const caption = content.length > first.length ? content.slice(first.length + 1) : '';
 const [remaining, setRemaining] = useState(PHOTO_TIMER_SEC);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const closedRef = useRef(false);
 const close = useCallback(() => { if (!closedRef.current) { closedRef.current = true; onClose(); } }, [onClose]);

 // Photo / audio: 10s timer. Video: ends on `ended` or tap.
 useEffect(() => {
 if (kind === 'video') return; // video handles its own end
 const interval = setInterval(() => {
 setRemaining(r => {
 if (r <= 1) { clearInterval(interval); close(); return 0; }
 return r - 1;
 });
 }, 1000);
 return () => clearInterval(interval);
 }, [kind, close]);

 const handleSave = async () => {
 if (saved || saving) return;
 setSaving(true);
 try { await onSave(); setSaved(true); } finally { setSaving(false); }
 };

 return (
 <Portal>
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[80] bg-black flex items-center justify-center"
 onClick={close}
 >
 <button onClick={(e) => { e.stopPropagation(); close(); }}
 className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center">
 <X className="w-5 h-5" />
 </button>
 {kind !== 'video' && (
 <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-semibold flex items-center gap-2">
 <Clock className="w-4 h-4" /> {remaining}s
 </div>
 )}
 {lastView && (
 <div className="absolute top-16 left-4 z-10 px-2.5 py-1 rounded-full bg-rose-main/80 text-white text-[11px] font-semibold">
 Last view
 </div>
 )}
 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
 <button onClick={(e) => { e.stopPropagation(); handleSave(); }}
 disabled={saved || saving}
 className={cn('px-4 py-2 rounded-full text-white text-sm font-semibold flex items-center gap-2',
 saved ? 'bg-emerald-500/80' : 'bg-black/60 hover:bg-black/80')}>
 {saving ? <Loader2 className="w-4 h-4 animate-spin" />
   : saved ? <BookmarkCheck className="w-4 h-4" />
   : <Bookmark className="w-4 h-4" />}
 {saved ? 'Saved to chat' : saving ? 'Saving\u2026' : 'Save in chat'}
 </button>
 <button onClick={(e) => { e.stopPropagation(); onDownload(); }}
 className="px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 text-white text-sm font-semibold flex items-center gap-2">
 <Download className="w-4 h-4" /> Download
 </button>
 </div>
 <div className="max-w-[92vw] max-h-[80vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
 {kind === 'image' && (
 <img src={first} alt="beat" className="max-w-[92vw] max-h-[80vh] object-contain rounded-xl" />
 )}
 {kind === 'video' && (
 <video src={first} autoPlay playsInline controls={false}
 onEnded={close}
 onClick={close}
 className="max-w-[92vw] max-h-[80vh] rounded-xl" />
 )}
 {kind === 'audio' && (
 <audio src={first} autoPlay controls className="w-[80vw] max-w-md" />
 )}
 {!kind && <p className="text-white text-base px-4 text-center">{content}</p>}
 {caption && <p className="text-white/90 text-sm px-3 max-w-[80vw] text-center">{caption}</p>}
 </div>
 </motion.div>
 </Portal>
 );
}

/* ═══════════════════════════════════════════════════════════
 BEAT ENTRY ROW — single sent/received beat
 ═══════════════════════════════════════════════════════════ */
function BeatEntryRow({ entry, onDelete, onToggleChat, onView, onReplay, onUnsave, otherName }: {
 entry: BeatEntry;
 onDelete: (id: string) => void;
 onToggleChat: (id: string) => void;
 onView: (entry: BeatEntry) => void;
 onReplay: (entry: BeatEntry) => void;
 onUnsave: (id: string) => void;
 otherName: string;
}) {
 // System events render as a centered chip in the chat
 if (entry.type === 'system') {
 const c = entry.content || '';
 const who = entry.sender === 'me' ? 'You' : otherName;
 let label = 'System event';
 let icon: React.ReactNode = <ScanLine className="w-3 h-3" />;
 if (c.startsWith('__system:saved:')) { label = `${who} saved this beat`; icon = <BookmarkCheck className="w-3 h-3" />; }
 else if (c.startsWith('__system:unsaved:')) { label = `${who} unsaved this beat`; icon = <X className="w-3 h-3" />; }
 else if (c.startsWith('__system:viewed:')) { label = `${who} viewed this beat`; icon = <Eye className="w-3 h-3" />; }
 else if (c.startsWith('__system:screenshot:')) { label = `${who} took a screenshot`; icon = <ScanLine className="w-3 h-3" />; }
 else if (c.startsWith('__system:downloaded:')) { label = `${who} downloaded this beat`; icon = <Download className="w-3 h-3" />; }
 else label = c;
 return (
 <div className="flex justify-center py-2">
 <span className="text-[10px] font-medium text-text-muted bg-miamo-surface/60 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
 {icon} {label}
 </span>
 </div>
 );
 }
 const beatType = BEAT_TYPES.find(t => t.type === entry.type) || BEAT_TYPES[3];
 const Icon = beatType.icon;
 const isMine = entry.sender === 'me';

 const raw = entry.content || '';
 const firstLine = raw.split('\n', 1)[0] || '';
 const caption = raw.length > firstLine.length ? raw.slice(firstLine.length + 1) : '';
 const isImage = /^data:image\//.test(firstLine) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(firstLine);
 const isVideo = /^data:video\//.test(firstLine) || /\.(mp4|webm|mov)(\?|$)/i.test(firstLine);
 const isAudio = /^data:audio\//.test(firstLine) || /\.(mp3|m4a|wav|ogg|aac)(\?|$)/i.test(firstLine);
 const isMediaType = MEDIA_BEAT_TYPES.has(entry.type);
 // Receiver-side ephemeral states
 const lockedForView = !isMine && isMediaType && !entry.mediaSaved && !!entry.ephemeralLocked && !entry.mediaCleared;
 const cleared = !isMine && isMediaType && !entry.mediaSaved && entry.mediaCleared;

 return (
 <motion.div initial={{ opacity: 0, x: isMine ? 10 : -10 }} animate={{ opacity: 1, x: 0 }}
 className={cn('flex gap-3 py-3 px-4 rounded-xl transition-colors hover:bg-miamo-surface/50', isMine ? 'flex-row-reverse' : '')}
 >
 <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', beatType.bg)}>
 <Icon className={cn('w-4 h-4', beatType.color)} />
 </div>
 <div className={cn('flex-1 min-w-0', isMine ? 'text-right' : '')}>
 {lockedForView ? (
 <TapHoldButton
 viewed={(entry.viewCount || 0) >= 1}
 onTap={() => onView(entry)}
 onHold={() => onReplay(entry)}
 isMine={isMine}
 />
 ) : cleared ? (
 <span className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-miamo-surface/60 text-text-muted', isMine ? 'ml-auto' : '')}>
 <Lock className="w-3.5 h-3.5" />
 <span className="text-[12px] font-medium">Beat expired</span>
 </span>
 ) : isImage ? (
 <SavedMedia enabled={!!entry.mediaSaved} onUnsave={() => onUnsave(entry.id)} className={isMine ? 'ml-auto' : ''}>
 <img
 src={firstLine}
 alt="beat"
 className="rounded-xl max-w-[220px] max-h-[220px] object-cover shadow-sm"
 />
 </SavedMedia>
 ) : isVideo ? (
 <SavedMedia enabled={!!entry.mediaSaved} onUnsave={() => onUnsave(entry.id)} className={isMine ? 'ml-auto' : ''}>
 <video
 src={firstLine}
 controls
 autoPlay
 muted
 loop
 playsInline
 className="rounded-xl max-w-[240px] max-h-[280px] bg-black shadow-sm"
 />
 </SavedMedia>
 ) : isAudio ? (
 <SavedMedia enabled={!!entry.mediaSaved} onUnsave={() => onUnsave(entry.id)} className={isMine ? 'ml-auto' : ''}>
 <audio src={firstLine} controls className="max-w-[240px]" />
 </SavedMedia>
 ) : (
 <p className="text-[13px] text-text-secondary leading-relaxed">{raw}</p>
 )}
 {!lockedForView && !cleared && (isImage || isVideo || isAudio) && caption && (
 <p className="text-[12px] text-text-secondary leading-relaxed mt-1">{caption}</p>
 )}
 <div className={cn('flex items-center gap-2 mt-1', isMine ? 'justify-end' : '')}>
 <span className="text-[10px] text-text-muted">{formatRelativeTime(entry.sentAt)}</span>
 {isMine && entry.seen && <CheckCheck className="w-3 h-3 text-rose-alt" />}
 {entry.showInChat && <span className="text-[9px] bg-miamo-surface text-rose px-1.5 py-0.5 rounded-full font-medium">In Chat</span>}
 </div>
 </div>
 {!lockedForView && (
 <div className="flex items-center gap-1 shrink-0">
 <button onClick={() => onToggleChat(entry.id)} title={entry.showInChat ? 'Hide from chat' : 'Show in chat'}
 className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-rose hover:bg-miamo-surface transition-all">
 {entry.showInChat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 </button>
 <button onClick={() => onDelete(entry.id)} title="Delete"
 className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-red-500 hover:bg-red-50 transition-all">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 )}
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
 const [mediaPreview, setMediaPreview] = useState<{ url: string; kind: 'image' | 'video' | 'audio' } | null>(null);
 const [mediaProcessing, setMediaProcessing] = useState(false);
 const [mediaError, setMediaError] = useState<string | null>(null);
 const scrollRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const isMediaBeat = !!selectedType && MEDIA_BEAT_TYPES.has(selectedType);

 // Auto-scroll on new entries
 useEffect(() => {
 const el = scrollRef.current;
 if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
 }, [entries, filtered]);

 // ─── Ephemeral viewer state ─────────────────────────────
 const [viewer, setViewer] = useState<{ entry: BeatEntry; content: string; lastView: boolean } | null>(null);
 const [viewerError, setViewerError] = useState<string | null>(null);
 const handleView = useCallback(async (entry: BeatEntry) => {
 setViewerError(null);
 try {
 const res = await api.viewBeatEvent(entry.id);
 const data = res.data || {};
 if (data.cleared) {
 setViewerError('Beat is no longer available');
 setTimeout(() => setViewerError(null), 2200);
 return;
 }
 setViewer({ entry, content: data.content || '', lastView: !!data.lastView });
 } catch (e: any) {
 const msg = e?.message || 'Could not open beat';
 setViewerError(msg);
 setTimeout(() => setViewerError(null), 2500);
 }
 }, []);
 const handleReplay = useCallback(async (entry: BeatEntry) => {
 setViewerError(null);
 try {
 const res = await api.replayBeatEvent(entry.id);
 const data = res.data || {};
 setViewer({ entry, content: data.content || '', lastView: false });
 } catch (e: any) {
 const msg = e?.message || 'Replay unavailable';
 setViewerError(msg);
 setTimeout(() => setViewerError(null), 2500);
 }
 }, []);
 const handleSaveCurrent = useCallback(async () => {
 if (!viewer) return;
 try { await api.saveBeatEvent(viewer.entry.id); } catch { /* ignore */ }
 }, [viewer]);
 const handleDownloadCurrent = useCallback(async () => {
 if (!viewer) return;
 const first = (viewer.content || '').split('\n', 1)[0] || '';
 if (first) {
 try {
 const a = document.createElement('a');
 a.href = first;
 const ext = /^data:image\//.test(first) ? 'jpg' : /^data:video\//.test(first) ? 'mp4' : /^data:audio\//.test(first) ? 'mp3' : 'bin';
 a.download = `beat-${viewer.entry.id.slice(0,8)}.${ext}`;
 document.body.appendChild(a); a.click(); a.remove();
 } catch { /* ignore */ }
 }
 try { await api.downloadBeatEvent(viewer.entry.id); } catch { /* ignore */ }
 }, [viewer]);
 const handleUnsave = useCallback(async (eventId: string) => {
 onDeleteEntry(eventId); // optimistic removal
 try { await api.unsaveBeatEvent(eventId); } catch (e: any) {
 setViewerError(e?.message || 'Could not unsave');
 setTimeout(() => setViewerError(null), 2500);
 }
 }, [onDeleteEntry]);

 // ─── Screenshot detection (best-effort, web) ───────────
 useEffect(() => {
 if (!viewer) return;
 const eventId = viewer.entry.id;
 let firedAt = 0;
 const fire = () => {
 const now = Date.now();
 if (now - firedAt < 3000) return;
 firedAt = now;
 api.screenshotBeatEvent(eventId).catch(() => {});
 };
 const onKey = (e: KeyboardEvent) => {
 const k = (e.key || '').toLowerCase();
 if (k === 'printscreen') { fire(); return; }
 if ((e.metaKey || e.ctrlKey) && e.shiftKey && (k === '3' || k === '4' || k === '5' || k === 's')) fire();
 if ((e.metaKey || e.ctrlKey) && (k === 's')) fire();
 };
 const onBlur = () => {
 // macOS screenshot tool steals focus from the page — heuristic signal
 fire();
 };
 window.addEventListener('keydown', onKey, true);
 window.addEventListener('blur', onBlur);
 return () => {
 window.removeEventListener('keydown', onKey, true);
 window.removeEventListener('blur', onBlur);
 };
 }, [viewer]);

 // Focus input when compose opens
 useEffect(() => {
 if (selectedType && inputRef.current) inputRef.current.focus();
 }, [selectedType]);

 const handleComposeSend = () => {
 if (!selectedType) return;
 if (isMediaBeat) {
 if (!mediaPreview || mediaProcessing) return;
 const caption = composeText.trim();
 const payload = caption ? `${mediaPreview.url}\n${caption}` : mediaPreview.url;
 onSendBeat(selectedType, payload);
 setMediaPreview(null);
 setMediaError(null);
 } else {
 const content = composeText.trim();
 if (!content) return;
 onSendBeat(selectedType, content);
 }
 setComposeText('');
 setSelectedType(null);
 };

 const handleMediaPick = async (file: File) => {
 setMediaError(null);
 const err = validateMediaFile(file);
 if (err) { setMediaError(err); return; }
 setMediaProcessing(true);
 try {
 if (file.type.startsWith('image/')) {
 const img = await loadImageFromFile(file);
 const dataUrl = await compressImage({ img, maxDim: 1080 });
 setMediaPreview({ url: dataUrl, kind: 'image' });
 } else if (file.type.startsWith('video/')) {
 const result = await compressVideo({ file });
 setMediaPreview({ url: result.dataUrl, kind: 'video' });
 } else if (file.type.startsWith('audio/')) {
 const dataUrl: string = await new Promise((resolve, reject) => {
 const r = new FileReader();
 r.onload = () => resolve(String(r.result));
 r.onerror = () => reject(r.error);
 r.readAsDataURL(file);
 });
 setMediaPreview({ url: dataUrl, kind: 'audio' });
 } else {
 setMediaError('Unsupported file type');
 }
 } catch (err: any) {
 setMediaError(err?.message || 'Failed to process file');
 }
 setMediaProcessing(false);
 };

 const alreadySent = beat.iSentToday;

 return (
 <div className="flex flex-col" style={{ height: '100%' }}>
 <AnimatePresence>
 {viewer && (
 <EphemeralViewer
 entry={viewer.entry}
 content={viewer.content}
 lastView={viewer.lastView}
 onClose={() => setViewer(null)}
 onSave={handleSaveCurrent}
 onDownload={handleDownloadCurrent}
 />
 )}
 {viewerError && (
 <Portal>
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
 className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[85] px-4 py-2.5 rounded-xl bg-black/85 text-white text-sm font-medium shadow-lg">
 {viewerError}
 </motion.div>
 </Portal>
 )}
 </AnimatePresence>
 {/* ─── Header ─── */}
 <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-main/10 to-rose-soft/60 border-b border-border/40 backdrop-blur-sm">
 <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-miamo-card/60 transition-all">
 <ChevronLeft className="w-5 h-5 text-text-secondary" />
 </button>
 <Avatar src={photo} name={other.displayName} size="sm" online={other.online} verified={other.verified} />
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
 {other.displayName}
 {other.verified && <Check className="w-3.5 h-3.5 text-rose" />}
 </h3>
 <p className="text-[11px] text-text-muted">{beat.count} day streak &bull; {beat.totalSent || 0} sent &bull; {beat.totalReceived || 0} received</p>
 </div>
 <StreakFlame count={beat.count} size="md" />
 </div>

 {/* ─── Filter pills ─── */}
 <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-miamo-surface/30 border-b border-border/20">
 {([
 { key: 'all' as const, label: 'All Beats' },
 { key: 'sent' as const, label: 'Sent' },
 { key: 'received' as const, label: 'Received' },
 ]).map(f => (
 <button key={f.key} onClick={() => setFilter(f.key)}
 className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
 filter === f.key ? 'bg-miamo-surface text-rose-dark border border-border' : 'text-text-muted hover:bg-miamo-card/60'
 )}>
 {f.label}
 </button>
 ))}
 <span className="ml-auto text-[10px] text-text-muted">{filtered.length} beats</span>
 </div>

 {/* ─── Beat entries (scrollable area) ─── */}
 <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 bg-gradient-to-b from-rose-main/10 to-rose-soft/10">
 {filtered.length === 0 ? (
 <div className="text-center py-20">
 <BeatsIcon size={48} className="mx-auto mb-4 opacity-30" />
 <p className="text-base font-semibold text-text-muted mb-1">No beats yet</p>
 <p className="text-sm text-text-secondary">Send the first one below!</p>
 </div>
 ) : (
 filtered.map(entry => (
 <BeatEntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} onToggleChat={onToggleChat} onView={handleView} onReplay={handleReplay} onUnsave={handleUnsave} otherName={other.displayName?.split(' ')[0] || 'They'} />
 ))
 )}
 {/* Day status indicator */}
 <div className="pt-4 pb-2 flex justify-center">
 <BeatDayStatus beat={beat} />
 </div>
 </div>

 {/* ─── Compose / Send area ─── */}
 <div className="shrink-0 border-t border-border/40 bg-gradient-to-r from-white to-rose-main/10">
 {alreadySent ? (
 /* Already sent today — show status */
 <div className="p-4 text-center">
 <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-soft text-rose-main border border-rose-soft">
 <CheckCheck className="w-4 h-4" />
 <span className="text-sm font-semibold">
 {beat.todayCompleted ? 'Both sent today! Streak saved!' : "You've sent today's beat — waiting for " + (other.displayName?.split(' ')[0] || 'them')}
 </span>
 </div>
 <p className="text-[10px] text-text-muted mt-2">Come back tomorrow to keep the streak alive!</p>
 </div>
 ) : selectedType ? (
 /* Compose input for the selected beat type */
 <div className="p-3 space-y-2">
 <div className="flex items-center gap-2">
 {(() => { const bt = BEAT_TYPES.find(b => b.type === selectedType); if (!bt) return null; const Icon = bt.icon; return <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bt.bg)}><Icon className={cn('w-4 h-4', bt.color)} /></div>; })()}
 <span className="text-xs font-semibold text-text-secondary">
 {BEAT_TYPES.find(b => b.type === selectedType)?.desc || 'Type your beat'}
 </span>
 <button onClick={() => { setSelectedType(null); setComposeText(''); setMediaPreview(null); setMediaError(null); }} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center hover:bg-miamo-surface transition-all">
 <X className="w-4 h-4 text-text-muted" />
 </button>
 </div>
 {isMediaBeat && (
 <input
 ref={fileInputRef}
 type="file"
 accept={acceptForBeatType(selectedType)}
 hidden
 onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaPick(f); e.currentTarget.value = ''; }}
 />
 )}
 {isMediaBeat && mediaPreview && (
 <div className="flex items-center gap-2 p-2 rounded-xl bg-miamo-surface/40 border border-border">
 {mediaPreview.kind === 'image' ? (
 <img src={mediaPreview.url} alt="preview" className="w-14 h-14 rounded-lg object-cover" />
 ) : mediaPreview.kind === 'video' ? (
 <video src={mediaPreview.url} className="w-14 h-14 rounded-lg object-cover" muted playsInline />
 ) : (
 <div className="w-14 h-14 rounded-lg bg-rose-main/15 flex items-center justify-center"><Camera className="w-5 h-5 text-rose-main" /></div>
 )}
 <span className="text-[11px] text-text-muted flex-1">Ready to send</span>
 <button onClick={() => setMediaPreview(null)} className="text-text-muted hover:text-text-secondary"><X className="w-4 h-4" /></button>
 </div>
 )}
 {isMediaBeat && mediaError && <p className="text-[11px] text-red-500">{mediaError}</p>}
 <div className="flex items-center gap-2">
 {isMediaBeat && (
 <motion.button
 whileTap={{ scale: 0.9 }}
 onClick={() => fileInputRef.current?.click()}
 disabled={mediaProcessing}
 className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-main/10 text-rose-main hover:bg-rose-main/20 transition-all shrink-0"
 title={mediaPreview ? 'Replace media' : 'Pick from device'}
 >
 {mediaProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
 </motion.button>
 )}
 <input
 ref={inputRef}
 value={composeText}
 onChange={e => setComposeText(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComposeSend(); } }}
 placeholder={isMediaBeat ? (mediaPreview ? 'Add a caption (optional)…' : `Pick a ${selectedType} from your device…`) : `Write your ${selectedType} beat...`}
 className="flex-1 px-4 py-2.5 rounded-xl bg-miamo-surface/50 border border-border text-sm text-text-secondary placeholder-text-placeholder focus:outline-none focus:ring-2 focus:ring-rose/20 focus:border-rose transition-all"
 />
 <motion.button
 whileTap={{ scale: 0.9 }}
 onClick={handleComposeSend}
 disabled={isMediaBeat ? (!mediaPreview || mediaProcessing || sending) : (!composeText.trim() || sending)}
 className={cn(
 'w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0',
 (isMediaBeat ? (mediaPreview && !mediaProcessing) : composeText.trim()) && !sending
 ? 'bg-gradient-rose text-text-primary shadow-lg shadow-medium'
 : 'bg-miamo-surface text-text-secondary'
 )}
 >
 <Send className="w-4 h-4" />
 </motion.button>
 </div>
 </div>
 ) : (
 /* Beat type selector */
 <div className="p-3">
 <p className="text-[10px] text-text-muted font-medium mb-2 text-center">Choose a beat type to send</p>
 <div className="flex items-center justify-center gap-2 flex-wrap">
 {BEAT_TYPES.slice(0, 6).map(bt => {
 const BtIcon = bt.icon;
 return (
 <motion.button key={bt.type} whileTap={{ scale: 0.93 }}
 onClick={() => setSelectedType(bt.type)}
 className={cn(
 'flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all',
 'bg-miamo-card border border-border text-text-secondary hover:border-rose hover:shadow-md hover:shadow-soft/30 active:bg-miamo-surface'
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
