'use client';

/**
 * ═══ Media Utils ═══════════════════════════════════════════════════════════════
 * Browser-side image & video processing utilities.
 * - Image: resize → CSS filter → caption bake → JPEG data URL
 * - Video: re-encode via canvas + MediaRecorder at capped resolution & bitrate → WebM/MP4 Blob
 */

// ─── Image Constants ─────────────────────────────────────────────────────────
export const MAX_IMAGE_DIM = 1080;
export const JPEG_QUALITY = 0.85;

// ─── Photo Filters (shared across all upload surfaces) ───────────────────────
export const PHOTO_FILTERS: { id: string; label: string; css: string }[] = [
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

// ─── Load an image File → HTMLImageElement ───────────────────────────────────
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
 return new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new window.Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
  img.src = url;
 });
}

// ─── Bake image: resize + filter + optional caption → JPEG data URL ──────────
export async function compressImage(opts: {
 img: HTMLImageElement;
 filterCss?: string;
 caption?: string;
 maxDim?: number;
 quality?: number;
}): Promise<string> {
 const { img, filterCss = 'none', caption, maxDim = MAX_IMAGE_DIM, quality = JPEG_QUALITY } = opts;
 const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
 const w = Math.round(img.naturalWidth * scale);
 const h = Math.round(img.naturalHeight * scale);
 const canvas = document.createElement('canvas');
 canvas.width = w; canvas.height = h;
 const ctx = canvas.getContext('2d')!;
 try { (ctx as any).filter = filterCss !== 'none' ? filterCss : 'none'; } catch {}
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
  for (let i = lines.length - 1; i >= 0; i--) { ctx.fillText(lines[i], w / 2, y); y -= lineHeight; }
  ctx.shadowBlur = 0;
 }
 return canvas.toDataURL('image/jpeg', quality);
}

// ─── Video Constants ─────────────────────────────────────────────────────────
export const MAX_VIDEO_DIM = 720; // longest edge cap
export const VIDEO_BITRATE = 1_500_000; // 1.5 Mbps (good quality, ~11 MB/min)
export const MAX_VIDEO_DURATION_S = 60; // 1 min story limit

// ─── Load video metadata ─────────────────────────────────────────────────────
export function loadVideoMeta(file: File): Promise<{ video: HTMLVideoElement; duration: number; width: number; height: number }> {
 return new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.onloadedmetadata = () => {
   resolve({ video, duration: video.duration, width: video.videoWidth, height: video.videoHeight });
  };
  video.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
  video.src = url;
 });
}

// ─── Compress / re-encode video via canvas + MediaRecorder ───────────────────
// Returns a Blob (WebM VP8/VP9 or MP4 depending on browser support).
// If the input is already small enough and short enough, may return the input directly.
export async function compressVideo(opts: {
 file: File;
 maxDim?: number;
 bitrate?: number;
 trimStart?: number; // seconds
 trimEnd?: number;   // seconds
 onProgress?: (pct: number) => void;
}): Promise<{ blob: Blob; dataUrl: string; duration: number }> {
 const { file, maxDim = MAX_VIDEO_DIM, bitrate = VIDEO_BITRATE, trimStart = 0, onProgress } = opts;
 const { video, duration, width, height } = await loadVideoMeta(file);
 const trimEnd = opts.trimEnd ?? Math.min(duration, MAX_VIDEO_DURATION_S);
 const targetDuration = trimEnd - trimStart;

 // Calculate output dimensions (cap longest edge)
 const scale = Math.min(1, maxDim / Math.max(width, height));
 const outW = Math.round(width * scale / 2) * 2; // even dimensions for codec
 const outH = Math.round(height * scale / 2) * 2;

 // Setup offscreen canvas for video frames
 const canvas = document.createElement('canvas');
 canvas.width = outW; canvas.height = outH;
 const ctx = canvas.getContext('2d')!;

 // Determine supported MIME type
 const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
  ? 'video/webm;codecs=vp9'
  : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
   ? 'video/webm;codecs=vp8'
   : 'video/webm';

 return new Promise((resolve, reject) => {
  const stream = canvas.captureStream(30); // 30 fps
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
   const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
   const reader = new FileReader();
   reader.onload = () => resolve({ blob, dataUrl: reader.result as string, duration: targetDuration });
   reader.onerror = reject;
   reader.readAsDataURL(blob);
  };
  recorder.onerror = (e) => reject(e);

  // Seek to trimStart and begin
  video.currentTime = trimStart;
  video.oncanplay = () => {
   recorder.start(100); // collect data every 100ms
   video.play();
  };

  // Draw frames to canvas
  const drawFrame = () => {
   if (video.paused || video.ended || video.currentTime >= trimEnd) {
    video.pause();
    recorder.stop();
    URL.revokeObjectURL(video.src);
    return;
   }
   ctx.drawImage(video, 0, 0, outW, outH);
   if (onProgress) {
    const pct = Math.min(100, Math.round(((video.currentTime - trimStart) / targetDuration) * 100));
    onProgress(pct);
   }
   requestAnimationFrame(drawFrame);
  };
  video.onplay = () => requestAnimationFrame(drawFrame);

  // Safety: if video ends before trimEnd
  video.onended = () => {
   if (recorder.state === 'recording') recorder.stop();
   URL.revokeObjectURL(video.src);
  };
  video.ontimeupdate = () => {
   if (video.currentTime >= trimEnd) {
    video.pause();
    if (recorder.state === 'recording') recorder.stop();
    URL.revokeObjectURL(video.src);
   }
  };
 });
}

// ─── Quick helper: is video small enough to skip re-encode? ──────────────────
export function videoNeedsCompression(file: File, maxSizeMb = 4): boolean {
 return file.size > maxSizeMb * 1024 * 1024;
}

// ─── Validate file ───────────────────────────────────────────────────────────
export type MediaType = 'image' | 'video' | 'audio';
export function validateMediaFile(file: File, type?: MediaType): string | null {
 const mime = file.type || '';
 const detected: MediaType | null = mime.startsWith('image/')
  ? 'image'
  : mime.startsWith('video/')
   ? 'video'
   : mime.startsWith('audio/')
    ? 'audio'
    : null;
 const kind = type || detected;
 if (!kind) return 'Unsupported file type. Please pick an image, video, or audio file.';
 if (type && detected && type !== detected) {
  return `Please pick a ${type} file.`;
 }
 if (kind === 'image' && file.size > 25 * 1024 * 1024) return 'Image must be under 25 MB.';
 if (kind === 'video' && file.size > 250 * 1024 * 1024) return 'Video must be under 250 MB.';
 if (kind === 'audio' && file.size > 50 * 1024 * 1024) return 'Audio must be under 50 MB.';
 return null;
}
