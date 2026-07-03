'use client';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
}

// 6-box OTP input. Pasting the full code distributes across boxes.
// Backspace on empty cell jumps left.
export function OtpInput({ value, onChange, length = 6, autoFocus = true, onComplete }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => { if (autoFocus) refs.current[0]?.focus(); }, [autoFocus]);
  const chars = value.padEnd(length, ' ').slice(0, length).split('');

  const setAt = (i: number, ch: string) => {
    const next = (value.padEnd(length, ' ').slice(0, length).split(''));
    next[i] = ch;
    const v = next.join('').replace(/\s/g, '');
    onChange(v);
    if (v.length === length && onComplete) onComplete(v);
  };

  return (
    <div className="flex gap-2 justify-center">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={ch.trim()}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(-1);
            if (!c) return;
            setAt(i, c);
            if (i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (!ch.trim() && i > 0) {
                setAt(i - 1, ' ');
                refs.current[i - 1]?.focus();
              } else {
                setAt(i, ' ');
              }
            } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (txt.length >= 1) {
              e.preventDefault();
              onChange(txt);
              if (txt.length === length && onComplete) onComplete(txt);
              refs.current[Math.min(txt.length, length - 1)]?.focus();
            }
          }}
          className="w-11 h-12 text-center text-xl font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      ))}
    </div>
  );
}
