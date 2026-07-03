'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

// Simple email-only forgot-password flow. The API always returns 200
// (whether the email exists or not), so we can't tell the user "no such
// account". Instead we show a neutral "if that account exists…" message.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setBusy(true);
    try {
      // Uses api.forgotPassword if defined; otherwise raw fetch to the aliased route.
      const anyApi = api as unknown as { forgotPassword?: (e: string) => Promise<unknown> };
      if (typeof anyApi.forgotPassword === 'function') {
        await anyApi.forgotPassword(email.trim());
      } else {
        await fetch('/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
      }
      setSent(true);
    } catch (err) {
      // Even on failure, do not reveal whether the email exists.
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-[440px]"
    >
      <div className="bg-white border border-border-light rounded-3xl shadow-soft p-8 sm:p-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">Reset password</p>
          <h1 className="font-brand font-semibold text-[40px] leading-[1.05] text-text-primary mb-2">
            Forgot your <span className="italic text-rose">password</span>?
          </h1>
          <p className="text-[15px] text-text-secondary">
            {sent
              ? 'If an account exists for that email, a reset link is on its way.'
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 p-3.5 rounded-xl bg-rose-soft/40 border border-rose-main/20 text-text-primary text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose" />
            <span>{error}</span>
          </div>
        )}

        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              label="Email"
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />
            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-soft/30 border border-rose-main/20 flex items-center gap-3">
            <Check className="w-5 h-5 text-rose flex-shrink-0" />
            <p className="text-sm text-text-primary">
              Check your inbox (and spam folder). The link expires in 30 minutes.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-text-secondary mt-6">
          <Link href="/login" className="text-rose font-medium hover:underline underline-offset-4 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
