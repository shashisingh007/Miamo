'use client';

/**
 * ═══ MediaPicker ══════════════════════════════════════════════════════════════
 * Reusable media picker with:
 * - Drag-and-drop or click to choose from local storage
 * - Image: filter presets, caption bake, auto-compress to JPEG ≤1080px
 * - Video: trim (start/end), auto-compress via MediaRecorder to 720p WebM
 * - Returns compressed data URL or Blob ready for API submission
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Film, X, Wand2, Scissors, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
 PHOTO_FILTERS,
 loadImageFromFile,
 compressImage,
 compressVideo,
 loadVideoMeta,
 validateMediaFile,
 videoNeedsCompression,
 MAX_VIDEO_DURATION_S,
} from '@/lib/media-utils';

export type MediaPickerResult = {
 type: 'image' | 'video';
 dataUrl: string; // JPEG data URL (image) or WebM data URL (video)
 blob?: Blob;     // Original blob for FormData uploads
};

interface MediaPickerProps {
 /** Which types to accept. Default: both */
 accept?: ('image' | 'video')[];
 /** Whether to show filter presets (images only). Default: true */
 showFilters?: boolean;
 /** Whether to show trim controls (video only). Default: true */
 showTrim?: boolean;
 /** Optional caption to bake into images */
 caption?: string;
 /** Called when user picks & processes media */
 onMedia: (result: MediaPickerResult) => void;
 /** Called when media is cleared */
 onClear?: () => void;
 /** Compact mode (smaller drop zone) */
 compact?: boolean;
 /** Custom class for the container */
 className?: string;
}

export function MediaPicker({
 accept = ['image', 'video'],
 showFilters = true,
 showTrim = true,
 caption,
 onMedia,
 onClear,
 compact = false,
 className,
}: MediaPickerProps) {
 const [dragOver, setDragOver] = useState(false);
 const [error, setError] = useState('');
 const [processing, setProcessing] = useState(false);
 const [progress, setProgress] = useState(0);

 // Image state
 const [pickedImg, setPickedImg] = useState<HTMLImageElement | null>(null);
 const [imgPreview, setImgPreview] = useState('');
 const [photoFilter, setPhotoFilter] = useState('none');

 // Video state
 const [videoFile, setVideoFile] = useState<File | null>(null);
 const [videoPreview, setVideoPreview] = useState('');
 const [videoDuration, setVideoDuration] = useState(0);
 const [trimStart, setTrimStart] = useState(0);
 const [trimEnd, setTrimEnd] = useState(0);
 const [videoCompressed, setVideoCompressed] = useState(false);

 const fileInputRef = useRef<HTMLInputElement>(null);
 const videoRef = useRef<HTMLVideoElement>(null);

 // Cleanup URLs on unmount
 useEffect(() => () => {
  if (imgPreview) URL.revokeObjectURL(imgPreview);
  if (videoPreview) URL.revokeObjectURL(videoPreview);
 }, [imgPreview, videoPreview]);

 const acceptStr = accept.map(t => t === 'image' ? 'image/*' : 'video/*').join(',');

 // ─── Accept file ────────────────────────────────────────────────────────────
 const acceptFile = useCallback(async (file: File | null | undefined) => {
  if (!file) return;
  setError('');
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (isImage && accept.includes('image')) {
   const err = validateMediaFile(file, 'image');
   if (err) { setError(err); return; }
   try {
    const img = await loadImageFromFile(file);
    if (imgPreview) URL.revokeObjectURL(imgPreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setPickedImg(img);
    setImgPreview(URL.createObjectURL(file));
    setVideoFile(null); setVideoPreview(''); setVideoCompressed(false);
   } catch { setError('Could not read that image.'); }
  } else if (isVideo && accept.includes('video')) {
   const err = validateMediaFile(file, 'video');
   if (err) { setError(err); return; }
   try {
    const { duration } = await loadVideoMeta(file);
    if (imgPreview) URL.revokeObjectURL(imgPreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setVideoDuration(duration);
    setTrimStart(0);
    setTrimEnd(Math.min(duration, MAX_VIDEO_DURATION_S));
    setVideoCompressed(false);
    setPickedImg(null); setImgPreview('');
   } catch { setError('Could not read that video.'); }
  } else {
   setError(`Please pick ${accept.join(' or ')} file.`);
  }
 }, [accept, imgPreview, videoPreview]);

 // ─── Process & deliver media ────────────────────────────────────────────────
 const processAndDeliver = useCallback(async () => {
  setProcessing(true); setProgress(0); setError('');
  try {
   if (pickedImg) {
    const filterCss = PHOTO_FILTERS.find(f => f.id === photoFilter)?.css || 'none';
    const dataUrl = await compressImage({ img: pickedImg, filterCss, caption });
    onMedia({ type: 'image', dataUrl });
   } else if (videoFile) {
    const result = await compressVideo({
     file: videoFile,
     trimStart,
     trimEnd,
     onProgress: setProgress,
    });
    setVideoCompressed(true);
    onMedia({ type: 'video', dataUrl: result.dataUrl, blob: result.blob });
   }
  } catch (e: any) {
   setError(e?.message || 'Processing failed.');
  }
  setProcessing(false);
 }, [pickedImg, photoFilter, caption, videoFile, trimStart, trimEnd, onMedia]);

 // Auto-process images when filter changes (debounced) or on mount
 useEffect(() => {
  if (pickedImg) {
   const t = setTimeout(() => processAndDeliver(), 200);
   return () => clearTimeout(t);
  }
 }, [pickedImg, photoFilter, caption]);

 // ─── Clear ──────────────────────────────────────────────────────────────────
 const clearMedia = () => {
  if (imgPreview) URL.revokeObjectURL(imgPreview);
  if (videoPreview) URL.revokeObjectURL(videoPreview);
  setPickedImg(null); setImgPreview(''); setPhotoFilter('none');
  setVideoFile(null); setVideoPreview(''); setVideoCompressed(false);
  setTrimStart(0); setTrimEnd(0); setVideoDuration(0);
  setError(''); setProcessing(false); setProgress(0);
  onClear?.();
 };

 const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files?.[0]); };
 const hasMedia = !!(pickedImg || videoFile);

 // ─── Render ─────────────────────────────────────────────────────────────────
 return (
  <div className={cn('space-y-3', className)}>
   {/* Drop zone (hidden once media is picked) */}
   {!hasMedia && (
    <div
     onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
     onDragLeave={() => setDragOver(false)}
     onDrop={onDrop}
     onClick={() => fileInputRef.current?.click()}
     role="button" tabIndex={0}
     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
     className={cn(
      'cursor-pointer rounded-2xl border-2 border-dashed text-center transition-all',
      dragOver ? 'border-rose-main bg-miamo-surface' : 'border-border hover:bg-miamo-surface',
      compact ? 'px-3 py-4' : 'px-4 py-8'
     )}
    >
     <div className="flex items-center justify-center gap-2 mb-1">
      {accept.includes('image') && <ImagePlus className={cn('text-text-muted', compact ? 'w-5 h-5' : 'w-7 h-7')} />}
      {accept.includes('video') && <Film className={cn('text-text-muted', compact ? 'w-5 h-5' : 'w-7 h-7')} />}
     </div>
     <p className={cn('font-semibold text-text-primary', compact ? 'text-xs' : 'text-sm')}>
      Drop {accept.join('/')} or click to choose
     </p>
     <p className="text-[11px] text-text-muted mt-0.5">
      {accept.includes('image') && 'JPG, PNG, WEBP, HEIC · up to 20 MB'}
      {accept.includes('image') && accept.includes('video') && ' · '}
      {accept.includes('video') && 'MP4, MOV, WebM · up to 200 MB · max 60s'}
     </p>
    </div>
   )}

   {/* Image preview + filters */}
   {pickedImg && imgPreview && (
    <div className="space-y-3">
     <div className="relative rounded-2xl overflow-hidden">
      <img src={imgPreview} alt="Preview"
       className="w-full max-h-[300px] object-contain bg-black rounded-2xl"
       style={{ filter: PHOTO_FILTERS.find(f => f.id === photoFilter)?.css || 'none' }} />
      <button onClick={clearMedia}
       className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition">
       <X className="w-4 h-4 text-white" />
      </button>
     </div>
     {showFilters && (
      <div>
       <p className="text-[11px] text-text-muted mb-1.5 flex items-center gap-1"><Wand2 className="w-3 h-3" /> Filters</p>
       <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {PHOTO_FILTERS.map(f => (
         <button key={f.id} onClick={() => setPhotoFilter(f.id)}
          className={cn('flex-shrink-0 flex flex-col items-center gap-0.5 transition-all', photoFilter === f.id ? 'opacity-100' : 'opacity-60 hover:opacity-100')}>
          <div className={cn('w-12 h-12 rounded-lg overflow-hidden border-2', photoFilter === f.id ? 'border-rose-main' : 'border-transparent')}>
           <img src={imgPreview} alt={f.label} className="w-full h-full object-cover" style={{ filter: f.css }} />
          </div>
          <span className={cn('text-[9px] font-semibold', photoFilter === f.id ? 'text-rose' : 'text-text-muted')}>{f.label}</span>
         </button>
        ))}
       </div>
      </div>
     )}
    </div>
   )}

   {/* Video preview + trim */}
   {videoFile && videoPreview && (
    <div className="space-y-3">
     <div className="relative rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} src={videoPreview} className="w-full max-h-[260px] object-contain rounded-2xl" controls muted playsInline />
      <button onClick={clearMedia}
       className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition z-10">
       <X className="w-4 h-4 text-white" />
      </button>
     </div>
     {showTrim && videoDuration > 5 && (
      <div className="space-y-2">
       <p className="text-[11px] text-text-muted flex items-center gap-1"><Scissors className="w-3 h-3" /> Trim ({Math.round(trimEnd - trimStart)}s of {Math.round(videoDuration)}s · max {MAX_VIDEO_DURATION_S}s)</p>
       <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted w-8 text-right">{formatTime(trimStart)}</span>
        <input type="range" min={0} max={Math.floor(videoDuration)} step={0.5} value={trimStart}
         onChange={(e) => { const v = parseFloat(e.target.value); setTrimStart(Math.min(v, trimEnd - 1)); setVideoCompressed(false); }}
         className="flex-1 accent-rose-main h-1" />
        <input type="range" min={0} max={Math.floor(videoDuration)} step={0.5} value={trimEnd}
         onChange={(e) => { const v = parseFloat(e.target.value); setTrimEnd(Math.max(v, trimStart + 1)); setVideoCompressed(false); }}
         className="flex-1 accent-rose-main h-1" />
        <span className="text-[10px] text-text-muted w-8">{formatTime(trimEnd)}</span>
       </div>
      </div>
     )}
     {/* Compress button (video needs explicit action due to time cost) */}
     {!videoCompressed && (
      <button onClick={processAndDeliver} disabled={processing}
       className={cn('w-full py-2.5 rounded-xl text-sm font-semibold transition-all',
        processing ? 'bg-miamo-surface text-text-muted' : 'bg-gradient-to-r from-rose-main to-rose-alt text-white hover:shadow-lg')}>
       {processing ? `Compressing… ${progress}%` : 'Compress & Ready'}
      </button>
     )}
     {videoCompressed && (
      <p className="text-xs text-green-600 font-semibold flex items-center gap-1">✓ Video compressed & ready</p>
     )}
    </div>
   )}

   {/* Error */}
   {error && <p className="text-xs text-red-500">{error}</p>}

   {/* Hidden file input */}
   <input ref={fileInputRef} type="file" accept={acceptStr} className="hidden"
    onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = ''; }} />
  </div>
 );
}

function formatTime(s: number): string {
 const m = Math.floor(s / 60);
 const sec = Math.floor(s % 60);
 return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default MediaPicker;
