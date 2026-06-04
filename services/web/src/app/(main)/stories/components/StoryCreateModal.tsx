'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
 X, ChevronLeft, Type, Image, Smile, Upload,
 Check, Users, Lock, Eye, Target, Link2, ImagePlus, Wand2, Film, Scissors,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { STORY_BACKGROUNDS, STORY_MOODS, getBackgroundGradient } from './constants';
import { compressVideo, loadVideoMeta, MAX_VIDEO_DURATION_S, videoNeedsCompression } from '@/lib/media-utils';

// CSS filter presets reused for the live preview and the canvas bake.
const PHOTO_FILTERS: { id: string; label: string; css: string }[] = [
 { id: 'none', label: 'Original', css: 'none' },
 { id: 'vivid', label: 'Vivid', css: 'saturate(1.4) contrast(1.1)' },
 { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.15) hue-rotate(-10deg)' },
 { id: 'cool', label: 'Cool', css: 'saturate(1.05) hue-rotate(15deg) brightness(1.02)' },
 { id: 'fade', label: 'Fade', css: 'contrast(0.9) brightness(1.08) saturate(0.85)' },
 { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.05)' },
 { id: 'sepia', label: 'Sepia', css: 'sepia(0.85) contrast(1.05)' },
 { id: 'dream', label: 'Dream', css: 'blur(0.5px) brightness(1.05) saturate(1.15)' },
 { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.25) brightness(0.95)' },
];

const MAX_DIM = 1080;
const JPEG_QUALITY = 0.85;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
 return new Promise((resolve, reject) => {
 const url = URL.createObjectURL(file);
 const img = new window.Image();
 img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
 img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
 img.src = url;
 });
}

// Resize, apply CSS filter, optionally bake a caption, return JPEG data URL.
async function bakePhoto(opts: { img: HTMLImageElement; filterCss: string; caption?: string }): Promise<string> {
 const { img, filterCss, caption } = opts;
 const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
 const w = Math.round(img.naturalWidth * scale);
 const h = Math.round(img.naturalHeight * scale);
 const canvas = document.createElement('canvas');
 canvas.width = w; canvas.height = h;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('canvas unsupported');
 try { (ctx as any).filter = filterCss && filterCss !== 'none' ? filterCss : 'none'; } catch {}
 ctx.drawImage(img, 0, 0, w, h);
 try { (ctx as any).filter = 'none'; } catch {}
 const text = caption?.trim();
 if (text) {
 const fontSize = Math.max(22, Math.round(w * 0.045));
 const padX = Math.round(w * 0.06);
 const padY = Math.round(fontSize * 0.55);
 ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
 ctx.textAlign = 'center';
 ctx.textBaseline = 'bottom';
 const maxLineWidth = w - padX * 2;
 const words = text.split(/\s+/);
 const lines: string[] = [];
 let cur = '';
 for (const word of words) {
 const test = cur ? `${cur} ${word}` : word;
 if (ctx.measureText(test).width > maxLineWidth && cur) { lines.push(cur); cur = word; } else { cur = test; }
 }
 if (cur) lines.push(cur);
 const lineHeight = Math.round(fontSize * 1.2);
 const blockH = lines.length * lineHeight + padY * 2;
 const blockY = h - blockH;
 const grad = ctx.createLinearGradient(0, blockY - 40, 0, h);
 grad.addColorStop(0, 'rgba(0,0,0,0)');
 grad.addColorStop(1, 'rgba(0,0,0,0.55)');
 ctx.fillStyle = grad;
 ctx.fillRect(0, blockY - 40, w, blockH + 40);
 ctx.fillStyle = '#fff';
 ctx.shadowColor = 'rgba(0,0,0,0.5)';
 ctx.shadowBlur = 6;
 let y = h - padY;
 for (let i = lines.length - 1; i >= 0; i--) {
 ctx.fillText(lines[i], w / 2, y);
 y -= lineHeight;
 }
 ctx.shadowBlur = 0;
 }
 return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/* ═══ Story Create Modal ═══ */
export function StoryCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
 const [step, setStep] = useState<'type' | 'compose'>('type');
 const [storyType, setStoryType] = useState<'text' | 'photo' | 'video' | 'mood'>('text');
 const [content, setContent] = useState('');
 const [mediaUrl, setMediaUrl] = useState('');
 const [photoSource, setPhotoSource] = useState<'upload' | 'url'>('upload');
 const [pickedImg, setPickedImg] = useState<HTMLImageElement | null>(null);
 const [pickedPreview, setPickedPreview] = useState<string>('');
 const [photoFilter, setPhotoFilter] = useState<string>('none');
 const [photoErr, setPhotoErr] = useState<string>('');
 const fileInputRef = useRef<HTMLInputElement | null>(null);
 const [dragOver, setDragOver] = useState(false);
 // Video state
 const [videoFile, setVideoFile] = useState<File | null>(null);
 const [videoPreview, setVideoPreview] = useState('');
 const [videoDuration, setVideoDuration] = useState(0);
 const [trimStart, setTrimStart] = useState(0);
 const [trimEnd, setTrimEnd] = useState(0);
 const [videoCompressing, setVideoCompressing] = useState(false);
 const [videoProgress, setVideoProgress] = useState(0);
 const [compressedVideoDataUrl, setCompressedVideoDataUrl] = useState<string>('');
 const videoInputRef = useRef<HTMLInputElement | null>(null);
 const [selectedBg, setSelectedBg] = useState(STORY_BACKGROUNDS[0].id);
 const [selectedMood, setSelectedMood] = useState('');
 const [visibility, setVisibility] = useState<'everyone' | 'close' | 'target'>('everyone');
 const [viewOnce, setViewOnce] = useState(false);
 const [matches, setMatches] = useState<any[]>([]);
 const [closeCircleIds, setCloseCircleIds] = useState<Set<string>>(new Set());
 const [targetUserId, setTargetUserId] = useState<string>('');
 const [creating, setCreating] = useState(false);

 useEffect(() => {
 api.getMatches().then(r => setMatches(r.data || [])).catch(() => {});
 }, []);

 useEffect(() => () => { if (pickedPreview) URL.revokeObjectURL(pickedPreview); }, [pickedPreview]);

 const acceptFile = async (file: File | null | undefined) => {
 if (!file) return;
 setPhotoErr('');
 if (!file.type.startsWith('image/')) { setPhotoErr('Please pick an image file.'); return; }
 if (file.size > 20 * 1024 * 1024) { setPhotoErr('Image must be under 20 MB.'); return; }
 try {
 const img = await loadImageFromFile(file);
 if (pickedPreview) URL.revokeObjectURL(pickedPreview);
 const previewUrl = URL.createObjectURL(file);
 setPickedImg(img);
 setPickedPreview(previewUrl);
 setMediaUrl('');
 } catch {
 setPhotoErr('Could not read that image.');
 }
 };

 const onDrop = (e: React.DragEvent) => {
 e.preventDefault(); setDragOver(false);
 acceptFile(e.dataTransfer.files?.[0]);
 };

 const clearPickedPhoto = () => {
 if (pickedPreview) URL.revokeObjectURL(pickedPreview);
 setPickedImg(null); setPickedPreview(''); setPhotoFilter('none'); setPhotoErr('');
 };

 const acceptVideoFile = async (file: File | null | undefined) => {
 if (!file) return;
 setPhotoErr('');
 if (!file.type.startsWith('video/')) { setPhotoErr('Please pick a video file.'); return; }
 if (file.size > 200 * 1024 * 1024) { setPhotoErr('Video must be under 200 MB.'); return; }
 try {
 const { duration } = await loadVideoMeta(file);
 if (videoPreview) URL.revokeObjectURL(videoPreview);
 setVideoFile(file);
 setVideoPreview(URL.createObjectURL(file));
 setVideoDuration(duration);
 setTrimStart(0);
 setTrimEnd(Math.min(duration, MAX_VIDEO_DURATION_S));
 setCompressedVideoDataUrl('');
 } catch { setPhotoErr('Could not read that video.'); }
 };

 const compressVideoForStory = async () => {
 if (!videoFile) return;
 setVideoCompressing(true); setVideoProgress(0);
 try {
 const result = await compressVideo({ file: videoFile, trimStart, trimEnd, onProgress: setVideoProgress });
 setCompressedVideoDataUrl(result.dataUrl);
 } catch (e: any) { setPhotoErr(e?.message || 'Compression failed.'); }
 setVideoCompressing(false);
 };

 const toggleClose = (id: string) => {
 setCloseCircleIds(prev => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id); else next.add(id);
 return next;
 });
 };

 const handleCreate = async () => {
 if (storyType === 'text' && !content.trim()) return;
 if (storyType === 'photo') {
 if (photoSource === 'upload' && !pickedImg) return;
 if (photoSource === 'url' && !mediaUrl.trim()) return;
 }
 if (storyType === 'video' && !compressedVideoDataUrl && !videoFile) return;
 if (storyType === 'mood' && !selectedMood) return;
 if (visibility === 'target' && !targetUserId) return;
 if (visibility === 'close' && closeCircleIds.size === 0) return;
 setCreating(true);
 try {
 const text = storyType === 'mood' ? `${selectedMood} ${content}` : content;
 const payload = {
 text,
 background: (storyType !== 'photo' && storyType !== 'video') ? selectedBg : undefined,
 viewOnce: viewOnce || undefined,
 targetUserId: visibility === 'target' ? targetUserId : undefined,
 closeCircleIds: visibility === 'close' ? Array.from(closeCircleIds) : undefined,
 };
 let finalMediaUrl: string | undefined;
 if (storyType === 'photo') {
 if (photoSource === 'upload' && pickedImg) {
 const filterCss = PHOTO_FILTERS.find(f => f.id === photoFilter)?.css || 'none';
 finalMediaUrl = await bakePhoto({ img: pickedImg, filterCss, caption: content });
 } else {
 finalMediaUrl = mediaUrl.trim() || undefined;
 }
 } else if (storyType === 'video') {
 if (compressedVideoDataUrl) {
 finalMediaUrl = compressedVideoDataUrl;
 } else if (videoFile) {
 // Auto-compress if not yet done
 const result = await compressVideo({ file: videoFile, trimStart, trimEnd });
 finalMediaUrl = result.dataUrl;
 }
 }
 await api.createStory({
 type: storyType === 'photo' || storyType === 'video' ? storyType : 'text',
 content: JSON.stringify(payload),
 mediaUrl: finalMediaUrl,
 background: (storyType !== 'photo' && storyType !== 'video') ? selectedBg : undefined,
 visibility,
 });
 onCreated();
 onClose();
 } catch (e: any) {
 setPhotoErr(e?.message || 'Could not share story.');
 }
 setCreating(false);
 };

 const bgGradient = getBackgroundGradient(selectedBg);
 const activeFilterCss = PHOTO_FILTERS.find(f => f.id === photoFilter)?.css || 'none';

 return (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
 <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
 className="bg-miamo-card rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

 {/* Header */}
 <div className="flex items-center justify-between p-4 border-b border-border">
 <h2 className="text-lg font-black text-text-primary">Create Story</h2>
 <button onClick={onClose} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center hover:bg-miamo-elevated">
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto">
 {step === 'type' ? (
 <div className="p-6 space-y-4">
 <p className="text-sm text-text-muted">What kind of story?</p>
 <div className="grid grid-cols-2 gap-3">
 {[
 { id: 'text' as const, icon: Type, label: 'Text', desc: 'Share a thought', color: 'from-rose-alt to-rose-main' },
 { id: 'photo' as const, icon: Image, label: 'Photo', desc: 'Share an image', color: 'from-rose-main to-rose-main' },
 { id: 'video' as const, icon: Film, label: 'Video', desc: 'Share a clip', color: 'from-rose-main to-rose-alt' },
 { id: 'mood' as const, icon: Smile, label: 'Mood', desc: 'Share your vibe', color: 'from-rose-alt to-rose-main' },
 ].map(t => (
 <motion.button key={t.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }}
 onClick={() => { setStoryType(t.id); setStep('compose'); }}
 className="p-5 rounded-2xl border-2 border-border hover:border-border text-center group transition-all">
 <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform', t.color)}>
 <t.icon className="w-6 h-6 text-text-primary" />
 </div>
 <p className="font-bold text-sm text-text-primary">{t.label}</p>
 <p className="text-[10px] text-text-muted mt-0.5">{t.desc}</p>
 </motion.button>
 ))}
 </div>
 </div>
 ) : (
 <div className="p-6 space-y-4">
 <button onClick={() => setStep('type')} className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
 <ChevronLeft className="w-3 h-3" /> Change type
 </button>

 {/* Preview */}
 <div className={cn('relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[300px]',
 (storyType === 'photo' && (pickedPreview || mediaUrl)) || (storyType === 'video' && videoPreview) ? 'bg-black' : `bg-gradient-to-br ${bgGradient}`)}>
 {storyType === 'photo' && (pickedPreview || mediaUrl) ? (
 <img loading="lazy" src={photoSource === 'upload' ? pickedPreview : mediaUrl} alt="Preview"
 className="w-full h-full object-cover"
 style={{ filter: photoSource === 'upload' ? activeFilterCss : 'none' }} />
 ) : null}
 {storyType === 'video' && videoPreview ? (
 <video src={videoPreview} className="w-full h-full object-cover" muted playsInline autoPlay loop />
 ) : null}
 <div className="absolute inset-0 flex items-end justify-center p-6 pointer-events-none">
 {(storyType === 'photo' && (pickedPreview || mediaUrl)) || (storyType === 'video' && videoPreview) ? (
 content ? (
 <div className="w-full bg-gradient-to-t from-black/55 to-transparent -mx-6 px-6 pb-2 pt-6">
 <p className="text-white text-base font-bold text-center drop-shadow-lg">{content}</p>
 </div>
 ) : null
 ) : (
 <p className="text-text-primary text-lg font-bold text-center drop-shadow-lg w-full">
 {storyType === 'mood' && selectedMood && <span className="text-4xl block mb-2">{selectedMood}</span>}
 {content || 'Your story here...'}
 </p>
 )}
 </div>
 </div>

 {/* Mood picker */}
 {storyType === 'mood' && (
 <div>
 <p className="text-xs font-bold text-text-muted mb-2">Pick your mood</p>
 <div className="flex flex-wrap gap-2">
 {STORY_MOODS.map(m => (
 <motion.button key={m} whileTap={{ scale: 0.8 }}
 onClick={() => setSelectedMood(m)}
 className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-all',
 selectedMood === m ? 'border-rose-main bg-miamo-surface scale-110' : 'border-border hover:bg-miamo-surface')}>
 {m}
 </motion.button>
 ))}
 </div>
 </div>
 )}

 {/* Photo picker */}
 {storyType === 'photo' && (
 <div className="space-y-3">
 {/* Source toggle */}
 <div className="flex gap-2 text-xs font-semibold">
 <button onClick={() => setPhotoSource('upload')}
 className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 transition-all',
 photoSource === 'upload' ? 'border-rose-main bg-miamo-surface text-rose' : 'border-border text-text-muted hover:bg-miamo-surface')}>
 <ImagePlus className="w-3.5 h-3.5" /> Upload
 </button>
 <button onClick={() => setPhotoSource('url')}
 className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 transition-all',
 photoSource === 'url' ? 'border-rose-main bg-miamo-surface text-rose' : 'border-border text-text-muted hover:bg-miamo-surface')}>
 <Link2 className="w-3.5 h-3.5" /> Paste URL
 </button>
 </div>

 {photoSource === 'upload' ? (
 <>
 {!pickedImg ? (
 <div
 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
 onDragLeave={() => setDragOver(false)}
 onDrop={onDrop}
 onClick={() => fileInputRef.current?.click()}
 role="button"
 tabIndex={0}
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
 className={cn('cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all',
 dragOver ? 'border-rose-main bg-miamo-surface' : 'border-border hover:bg-miamo-surface')}
 >
 <ImagePlus className="w-8 h-8 mx-auto text-text-muted mb-2" />
 <p className="text-sm font-semibold text-text-primary">Drop a photo or click to choose</p>
 <p className="text-[11px] text-text-muted mt-1">JPG, PNG, WEBP, HEIC · up to 20 MB · auto-resized to 1080</p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs">
 <span className="text-text-muted">Filter</span>
 <button onClick={clearPickedPhoto} className="text-rose hover:underline font-semibold">Replace photo</button>
 </div>
 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
 {PHOTO_FILTERS.map(f => (
 <button key={f.id} onClick={() => setPhotoFilter(f.id)}
 className={cn('flex-shrink-0 flex flex-col items-center gap-1 transition-all',
 photoFilter === f.id ? 'opacity-100' : 'opacity-70 hover:opacity-100')}>
 <div className={cn('w-14 h-14 rounded-xl overflow-hidden border-2',
 photoFilter === f.id ? 'border-rose-main' : 'border-transparent')}>
 <img src={pickedPreview} alt={f.label} className="w-full h-full object-cover" style={{ filter: f.css }} />
 </div>
 <span className={cn('text-[10px] font-semibold', photoFilter === f.id ? 'text-rose' : 'text-text-muted')}>{f.label}</span>
 </button>
 ))}
 </div>
 <p className="text-[11px] text-text-muted flex items-center gap-1">
 <Wand2 className="w-3 h-3" /> Filter and caption are baked into the final image.
 </p>
 </div>
 )}
 <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
 onChange={(e) => acceptFile(e.target.files?.[0])} />
 </>
 ) : (
 <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
 placeholder="Paste image URL..." className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:border-rose focus:ring-2 focus:ring-rose-main/15 outline-none" />
 )}
 {photoErr && <p className="text-xs text-red-500">{photoErr}</p>}
 </div>
 )}

 {/* Video picker */}
 {storyType === 'video' && (
 <div className="space-y-3">
 {!videoFile ? (
 <div
 onClick={() => videoInputRef.current?.click()}
 role="button" tabIndex={0}
 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') videoInputRef.current?.click(); }}
 className="cursor-pointer rounded-2xl border-2 border-dashed border-border px-4 py-8 text-center hover:bg-miamo-surface transition-all"
 >
 <Film className="w-8 h-8 mx-auto text-text-muted mb-2" />
 <p className="text-sm font-semibold text-text-primary">Drop a video or click to choose</p>
 <p className="text-[11px] text-text-muted mt-1">MP4, MOV, WebM · up to 200 MB · max 60s · auto-compressed to 720p</p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="relative rounded-2xl overflow-hidden bg-black">
 <video src={videoPreview} className="w-full max-h-[240px] object-contain rounded-2xl" controls muted playsInline />
 <button onClick={() => { if (videoPreview) URL.revokeObjectURL(videoPreview); setVideoFile(null); setVideoPreview(''); setCompressedVideoDataUrl(''); }}
 className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 z-10">
 <X className="w-4 h-4 text-white" />
 </button>
 </div>
 {videoDuration > 5 && (
 <div className="space-y-2">
 <p className="text-[11px] text-text-muted flex items-center gap-1"><Scissors className="w-3 h-3" /> Trim ({Math.round(trimEnd - trimStart)}s of {Math.round(videoDuration)}s · max {MAX_VIDEO_DURATION_S}s)</p>
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-text-muted w-8 text-right">{Math.floor(trimStart / 60)}:{String(Math.floor(trimStart % 60)).padStart(2, '0')}</span>
 <input type="range" min={0} max={Math.floor(videoDuration)} step={0.5} value={trimStart}
 onChange={(e) => { const v = parseFloat(e.target.value); setTrimStart(Math.min(v, trimEnd - 1)); setCompressedVideoDataUrl(''); }}
 className="flex-1 accent-rose-main h-1" />
 <input type="range" min={0} max={Math.floor(videoDuration)} step={0.5} value={trimEnd}
 onChange={(e) => { const v = parseFloat(e.target.value); setTrimEnd(Math.max(v, trimStart + 1)); setCompressedVideoDataUrl(''); }}
 className="flex-1 accent-rose-main h-1" />
 <span className="text-[10px] text-text-muted w-8">{Math.floor(trimEnd / 60)}:{String(Math.floor(trimEnd % 60)).padStart(2, '0')}</span>
 </div>
 </div>
 )}
 {!compressedVideoDataUrl && (
 <button onClick={compressVideoForStory} disabled={videoCompressing}
 className={cn('w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
 videoCompressing ? 'bg-miamo-surface text-text-muted' : 'bg-gradient-to-r from-rose-main to-rose-alt text-white hover:shadow-lg')}>
 {videoCompressing ? `Compressing… ${videoProgress}%` : 'Compress Video'}
 </button>
 )}
 {compressedVideoDataUrl && (
 <p className="text-xs text-green-600 font-semibold">✓ Video compressed & ready</p>
 )}
 </div>
 )}
 <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
 onChange={(e) => { acceptVideoFile(e.target.files?.[0]); if (e.target) e.target.value = ''; }} />
 {photoErr && <p className="text-xs text-red-500">{photoErr}</p>}
 </div>
 )}

 {/* Text input */}
 <textarea value={content} onChange={e => setContent(e.target.value)}
 placeholder={storyType === 'mood' ? 'Add a caption (optional)...' : storyType === 'photo' || storyType === 'video' ? 'Add a caption (optional)...' : "What's on your mind?"}
 className="w-full rounded-xl border border-border px-4 py-3 text-sm resize-none focus:border-rose focus:ring-2 focus:ring-rose-main/15 outline-none" rows={3} />

 {/* Background picker (text & mood only) */}
 {storyType !== 'photo' && storyType !== 'video' && (
 <div>
 <p className="text-xs font-bold text-text-muted mb-2">Background</p>
 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
 {STORY_BACKGROUNDS.map(bg => (
 <motion.button key={bg.id} whileTap={{ scale: 0.9 }}
 onClick={() => setSelectedBg(bg.id)}
 className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex-shrink-0 border-2 transition-all', bg.gradient,
 selectedBg === bg.id ? 'border-white ring-2 ring-rose-main scale-110' : 'border-transparent')}>
 {selectedBg === bg.id && <Check className="w-4 h-4 text-text-primary mx-auto" />}
 </motion.button>
 ))}
 </div>
 </div>
 )}

 {/* Visibility */}
 <div>
 <p className="text-xs font-bold text-text-muted mb-2">Who can see?</p>
 <div className="grid grid-cols-3 gap-2">
 {[
 { id: 'everyone' as const, label: 'All Matches', icon: Users },
 { id: 'close' as const, label: 'Close Circle', icon: Lock },
 { id: 'target' as const, label: 'One Person', icon: Target },
 ].map(v => (
 <button key={v.id} onClick={() => setVisibility(v.id)}
 className={cn('flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
 visibility === v.id ? 'border-rose-main bg-miamo-surface text-rose' : 'border-border text-text-muted hover:bg-miamo-surface')}>
 <v.icon className="w-3.5 h-3.5" /> {v.label}
 </button>
 ))}
 </div>
 </div>

 {/* Close Circle picker */}
 {visibility === 'close' && (
 <div>
 <p className="text-xs font-bold text-text-muted mb-2">Pick your close circle ({closeCircleIds.size})</p>
 <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto">
 {matches.map((m: any) => {
 const u = m.matchedUser || {};
 const id = u.id;
 const sel = closeCircleIds.has(id);
 return (
 <button key={m.id} onClick={() => toggleClose(id)}
 className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
 sel ? 'border-rose-main bg-miamo-surface' : 'border-transparent hover:bg-miamo-surface')}>
 <div className="relative">
 <Avatar src={u.photos?.[0]?.url || u.photos?.[0]} name={u.displayName || 'U'} size="sm" />
 {sel && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-main flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
 </div>
 <span className="text-[10px] text-text-muted truncate w-full text-center">{u.displayName || 'User'}</span>
 </button>
 );
 })}
 {matches.length === 0 && <p className="col-span-4 text-xs text-text-muted text-center py-4">No matches yet.</p>}
 </div>
 </div>
 )}

 {/* Target person picker */}
 {visibility === 'target' && (
 <div>
 <p className="text-xs font-bold text-text-muted mb-2">Send to one person — visible until they see it</p>
 <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto">
 {matches.map((m: any) => {
 const u = m.matchedUser || {};
 const id = u.id;
 const sel = targetUserId === id;
 return (
 <button key={m.id} onClick={() => setTargetUserId(id)}
 className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all',
 sel ? 'border-rose-main bg-miamo-surface' : 'border-transparent hover:bg-miamo-surface')}>
 <Avatar src={u.photos?.[0]?.url || u.photos?.[0]} name={u.displayName || 'U'} size="sm" />
 <span className="text-[10px] text-text-muted truncate w-full text-center">{u.displayName || 'User'}</span>
 </button>
 );
 })}
 {matches.length === 0 && <p className="col-span-4 text-xs text-text-muted text-center py-4">No matches yet.</p>}
 </div>
 </div>
 )}

 {/* View Once toggle */}
 <button onClick={() => setViewOnce(v => !v)}
 className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left',
 viewOnce ? 'border-rose-main bg-miamo-surface' : 'border-border hover:bg-miamo-surface')}>
 <Eye className={cn('w-4 h-4', viewOnce ? 'text-rose' : 'text-text-muted')} />
 <div className="flex-1">
 <p className={cn('text-sm font-semibold', viewOnce ? 'text-rose' : 'text-text-primary')}>View once</p>
 <p className="text-[11px] text-text-muted">Disappears after each viewer sees it</p>
 </div>
 <div className={cn('w-9 h-5 rounded-full transition-all relative', viewOnce ? 'bg-rose-main' : 'bg-border')}>
 <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', viewOnce ? 'left-4' : 'left-0.5')} />
 </div>
 </button>
 </div>
 )}
 </div>

 {/* Footer */}
 {step === 'compose' && (
 <div className="p-4 border-t border-border flex gap-3">
 <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
 <Button onClick={handleCreate} disabled={creating || (storyType === 'text' && !content.trim()) || (storyType === 'photo' && photoSource === 'upload' && !pickedImg) || (storyType === 'photo' && photoSource === 'url' && !mediaUrl.trim()) || (storyType === 'video' && !videoFile) || (storyType === 'mood' && !selectedMood) || (visibility === 'target' && !targetUserId) || (visibility === 'close' && closeCircleIds.size === 0)}
 className="flex-1 gap-2 bg-gradient-rose">
 {creating ? 'Posting...' : <><Upload className="w-4 h-4" /> Share Story</>}
 </Button>
 </div>
 )}
 </motion.div>
 </motion.div>
 );
}
