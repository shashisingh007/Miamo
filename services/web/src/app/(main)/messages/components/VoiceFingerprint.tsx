'use client';

/**
 * Voice Fingerprint reveal modal (v3.6.0).
 *
 * Bottom-sheet modal that reveals the user's statistical voice vector —
 * median message length, emoji rate, top emoji, lowercase-i habit, archetype.
 * Surfaced after the user has sent 50+ messages.
 *
 * Telemetry:
 *   - voice_fingerprint.shown   on open
 *   - voice_fingerprint.shared  when user taps "Share to Instagram Story"
 *
 * Both events are gated through `@/lib/track` (consent + sampling). The
 * server-side counterpart is `/api/v1/users/me/voice-fingerprint`, gated
 * behind FEATURE_VOICE_FINGERPRINT_ENABLED.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, X, Share2, Lock, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { track } from '@/lib/track';

// because: archetype list mirrors `UserMoveProfile.archetype` enum values
// in services/shared/prisma/schema.prisma — keep these in lock-step.
const ARCHETYPE_EMOJI: Record<string, string> = {
  wordsmith: '✍️',     // writing hand
  voice_first: '🎙',   // studio microphone
  visual: '📷',        // camera
  fast_replier: '⚡',        // lightning
};

const ARCHETYPE_LABEL: Record<string, string> = {
  wordsmith: 'wordsmith',
  voice_first: 'voice-first',
  visual: 'visual',
  fast_replier: 'fast replier',
};

type VoiceFingerprintData = NonNullable<Awaited<ReturnType<typeof api.getMyVoiceFingerprint>>>['data'];

export function VoiceFingerprint({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<VoiceFingerprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shownEmittedRef = useRef(false);

  // Load fingerprint on open. We do NOT emit `voice_fingerprint.shown` until
  // the data is in hand so the metric reflects "user actually saw their
  // fingerprint" rather than "modal mounted with a spinner".
  useEffect(() => {
    if (!isOpen) {
      shownEmittedRef.current = false;
      setData(null);
      setShared(false);
      return;
    }
    setLoading(true);
    api.getMyVoiceFingerprint()
      .then((r) => {
        setData(r.data);
        if (!shownEmittedRef.current) {
          shownEmittedRef.current = true;
          try { track('voice_fingerprint.shown', { messageCount: r.data?.voice?.sampleCount ?? 0 }); } catch { /* never break user flow */ }
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Draw the 1080x1920 IG-story canvas. Lazy — only renders when the user
  // taps "Share". We keep the canvas hidden off-screen and call toBlob().
  const renderStoryCanvas = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas || !data) return resolve(null);
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // Background — Miamo rose gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, '#1A1422');
      grad.addColorStop(1, '#3A1F2A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Title
      ctx.fillStyle = '#FAF8F5';
      ctx.font = 'bold 72px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('my voice fingerprint', 540, 280);
      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#C97856';
      ctx.fillText('miamo  /  v3.6', 540, 360);

      // Stat block
      const v = data.voice;
      const stats: Array<[string, string]> = [
        ['typical message', `${v.medianLengthChars} chars`],
        ['emoji rate', v.emojiRate > 0 ? `every ${Math.max(1, Math.round(1 / Math.max(v.emojiRate, 0.001)))}${ordinal(Math.max(1, Math.round(1 / Math.max(v.emojiRate, 0.001))))} message` : 'rarely'],
        ['top emoji', v.topEmojis[0] || '—'],
        ['lowercase "i"', `${Math.round(v.lowercaseIRate * 100)}%`],
      ];
      ctx.textAlign = 'left';
      ctx.font = 'bold 56px sans-serif';
      ctx.fillStyle = '#FAF8F5';
      let y = 640;
      for (const [label, value] of stats) {
        ctx.fillStyle = '#9E8B7C';
        ctx.font = '36px sans-serif';
        ctx.fillText(label.toUpperCase(), 140, y);
        ctx.fillStyle = '#FAF8F5';
        ctx.font = 'bold 64px sans-serif';
        ctx.fillText(value, 140, y + 80);
        y += 200;
      }

      // Archetype badge
      if (data.archetype) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 56px sans-serif';
        ctx.fillStyle = '#C97856';
        const label = (ARCHETYPE_LABEL[data.archetype] || data.archetype) + ' ' + (ARCHETYPE_EMOJI[data.archetype] || '');
        ctx.fillText(label, 540, 1680);
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#9E8B7C';
        ctx.fillText('my archetype', 540, 1620);
      }

      // Footer
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9E8B7C';
      ctx.font = '28px sans-serif';
      ctx.fillText('only i can see this  /  miamo.in', 540, 1840);

      canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
    });
  }, [data]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    try { track('voice_fingerprint.shared', { channel: 'instagram' }); } catch { /* never break user flow */ }
    const blob = await renderStoryCanvas();
    if (!blob) { setShared(true); return; }
    // Try the Web Share API first (mobile); fall back to a download anchor.
    const file = new File([blob], 'miamo-voice-fingerprint.png', { type: 'image/png' });
    try {
      // Some browsers expose canShare without files support — guard before calling.
      const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
      if (navAny.canShare && navAny.canShare({ files: [file] }) && navAny.share) {
        await navAny.share({ files: [file], title: 'My voice fingerprint', text: 'my miamo voice fingerprint' });
        setShared(true);
        return;
      }
    } catch { /* fall through to download */ }
    // Fallback: download the PNG so the user can attach it to a story manually.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'miamo-voice-fingerprint.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setShared(true);
  }, [data, renderStoryCanvas]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="fixed inset-x-4 bottom-6 max-w-sm mx-auto bg-miamo-card border border-border rounded-[24px] shadow-2xl z-50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Voice fingerprint"
      >
        {/* Hidden canvas — only painted on Share */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-main/15 flex items-center justify-center">
              <Mic className="w-5 h-5 text-rose-main" />
            </div>
            <div className="flex-1">
              <h3 className="text-[14px] font-bold text-text-primary">Your voice fingerprint</h3>
              <p className="text-[11px] text-text-muted">How you write, statistically.</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-miamo-surface flex items-center justify-center" aria-label="Close">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-rose-main animate-spin" />
            </div>
          ) : !data ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-text-secondary">Not enough messages yet.</p>
              <p className="text-[11px] text-text-muted mt-1">Keep chatting — your fingerprint forms after about 50 sent messages.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <StatRow label="Your typical message" value={`${data.voice.medianLengthChars} characters`} />
              <StatRow
                label="Emoji rate"
                value={data.voice.emojiRate > 0
                  ? `every ${ordinal(Math.max(1, Math.round(1 / Math.max(data.voice.emojiRate, 0.001))))} message`
                  : 'rarely uses emoji'}
              />
              {data.voice.topEmojis[0] && (
                <StatRow label="Your top emoji" value={data.voice.topEmojis[0]} />
              )}
              <StatRow
                label='You write "i" instead of "I"'
                value={`${Math.round(data.voice.lowercaseIRate * 100)}% of the time`}
              />
              {data.archetype && (
                <div className="rounded-xl bg-rose-main/10 border border-rose-main/20 p-3 flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{ARCHETYPE_EMOJI[data.archetype] || '✨'}</span>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Your archetype</p>
                    <p className="text-[14px] font-bold text-text-primary">{ARCHETYPE_LABEL[data.archetype] || data.archetype}</p>
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-miamo-surface border border-border p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Your top 3 phrases
                </p>
                <p className="text-[12px] text-text-secondary italic">based on your last 50 messages</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleShare}
              disabled={loading || !data}
              className="flex-1 h-11 rounded-xl bg-rose-main text-text-primary text-[13px] font-bold disabled:opacity-50 hover:bg-rose-main/90 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {shared ? 'Saved!' : 'Share to Instagram Story'}
            </button>
            <button
              onClick={onClose}
              className="px-4 h-11 rounded-xl bg-miamo-surface border border-border text-text-secondary text-[12px] font-medium hover:bg-miamo-elevated transition-colors"
            >
              Skip for now
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Lock className="w-3 h-3 text-text-muted" />
            <p className="text-[10px] text-text-muted">Only you ever see your fingerprint.</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// because: integer rank with English suffix for "every Nth message" copy
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-miamo-surface border border-border px-3 py-2.5">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="text-[13px] font-semibold text-text-primary text-right">{value}</span>
    </div>
  );
}
