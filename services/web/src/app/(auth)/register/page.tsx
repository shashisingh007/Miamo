'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, Check, AlertCircle, ArrowLeft, Phone, KeyRound, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/OtpInput';
import { AuthOptions } from '@/components/AuthOptions';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { useCountdown } from '@/lib/useCountdown';

// v3.7 signup rewrite. Single-input identifier → method picker → password
// signup OR OTP signup (with optional "set password too" toggle in details).
type Stage = 'identifier' | 'method' | 'password-signup' | 'otp-signup' | 'details';

function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function looksLikePhone(s: string) {
  const cleaned = s.trim();
  return /^\+\d{7,15}$/.test(cleaned) || /^\d{10}$/.test(cleaned);
}
function detectChannel(s: string): 'email' | 'phone' | null {
  const v = s.trim();
  if (!v) return null;
  if (looksLikeEmail(v)) return 'email';
  if (looksLikePhone(v)) return 'phone';
  if (v.includes('@')) return 'email';
  return null;
}

const RESEND_SECONDS = 60;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [stage, setStage] = useState<Stage>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP-signup state
  const [signupToken, setSignupToken] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [otpChannel, setOtpChannel] = useState<'email' | 'phone'>('email');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [alsoSetPassword, setAlsoSetPassword] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { secondsLeft, reset: resetCountdown } = useCountdown(0);

  const detected = detectChannel(identifier);

  const getStrength = () => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };
  const strength = getStrength();
  const strengthLabel = strength <= 2 ? 'Weak' : strength <= 3 ? 'Fair' : strength <= 4 ? 'Strong' : 'Excellent';

  function backToIdentifier() {
    setStage('identifier');
    setError('');
    setPassword('');
    setConfirm('');
    setOtpCode('');
    setSignupToken('');
    setVerifiedToken('');
    setDevCode('');
  }

  function submitIdentifier(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!detected) {
      setError('Enter a valid email or phone number.');
      return;
    }
    setStage('method');
  }

  async function startOtpSignup() {
    setError('');
    setBusy(true);
    try {
      const r = await api.signupStart({ identifier: identifier.trim() });
      setSignupToken(r.data.signupToken);
      setOtpChannel(r.data.channel || (detected as 'email' | 'phone') || 'email');
      setOtpSentTo(r.data.sentTo || identifier.trim());
      setDevCode(r.data._devCode || '');
      setOtpCode('');
      resetCountdown(RESEND_SECONDS);
      setStage('otp-signup');
    } catch (err: any) {
      const raw = String(err?.code || err?.message || '');
      if (raw.includes('OTP_COOLDOWN')) {
        setError('A code was already sent recently. Check spam, wait a moment, then try again.');
      } else if (raw.includes('OTP_SEND_FAILED') || raw.includes('502')) {
        setError('We could not deliver a code to that ' + (detected === 'phone' ? 'number' : 'inbox') + '. Try "Set a password" instead — no code needed.');
      } else if (raw.includes('DAILY_CAP')) {
        setError('Too many codes requested today. Try "Set a password" instead — no code needed.');
      } else {
        setError(err?.message || 'Could not send code. Try "Set a password" instead.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(codeOverride?: string) {
    const c = (codeOverride ?? otpCode).trim();
    if (c.length !== 6 || !signupToken) return;
    setError('');
    setBusy(true);
    try {
      const r = await api.signupVerify({ signupToken, code: c });
      setVerifiedToken(r.data.verifiedToken);
      // Reset name/password for the details step (identifier already known).
      setDisplayName('');
      setPassword('');
      setConfirm('');
      setAlsoSetPassword(false);
      setStage('details');
    } catch (err: any) {
      setError(err.message || 'Invalid code.');
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (secondsLeft > 0) return;
    setError('');
    setBusy(true);
    try {
      const r = await api.signupStart({ identifier: identifier.trim() });
      setSignupToken(r.data.signupToken);
      setDevCode(r.data._devCode || '');
      setOtpCode('');
      resetCountdown(RESEND_SECONDS);
    } catch (err: any) {
      setError(err.message || 'Could not resend.');
    } finally {
      setBusy(false);
    }
  }

  async function completePasswordSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (displayName.trim().length < 2) { setError('Display name too short.'); return; }
    if (strength < 4) { setError('Choose a stronger password (8+ chars, mix of upper/lower/number/special).'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await api.register({ identifier: identifier.trim(), password, displayName });
      setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  async function completeDetails(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (displayName.trim().length < 2) { setError('Display name too short.'); return; }
    if (alsoSetPassword) {
      if (strength < 4) { setError('Choose a stronger password (8+ chars, mix of upper/lower/number/special).'); return; }
      if (password !== confirm) { setError('Passwords do not match.'); return; }
    }
    setBusy(true);
    try {
      const r = alsoSetPassword
        ? await api.signupComplete({ verifiedToken, password, displayName })
        : await api.signupOtpComplete({ verifiedToken, displayName });
      setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  const headerCopy = {
    identifier: {
      kicker: 'Create account',
      title: <>Begin <span className="italic text-rose">something real</span>.</>,
      sub: 'Enter your email or phone. You choose how to secure it next.',
    },
    method: {
      kicker: 'Choose how',
      title: <>How would you like to <span className="italic text-rose">sign up</span>?</>,
      sub: `Creating an account for ${identifier.trim()}`,
    },
    'password-signup': {
      kicker: 'Almost there',
      title: <>Set your <span className="italic text-rose">password</span>.</>,
      sub: `Creating an account for ${identifier.trim()}`,
    },
    'otp-signup': {
      kicker: "Verify it's you",
      title: <>Enter the <span className="italic text-rose">6-digit code</span>.</>,
      sub: otpSentTo
        ? `We sent a code to ${otpSentTo}${otpChannel === 'phone' ? ' via SMS' : ' by email'}.`
        : "We'll send a 6-digit code to verify it's you.",
    },
    details: {
      kicker: 'Almost there',
      title: <>Tell us your <span className="italic text-rose">name</span>.</>,
      sub: `Verified ${otpSentTo || identifier.trim()}. Optionally add a password so you can sign in without a code later.`,
    },
  } as const;
  const copy = headerCopy[stage];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-[440px]"
    >
      <div className="bg-white border border-border-light rounded-3xl shadow-soft p-8 sm:p-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">
            {copy.kicker}
          </p>
          <h1 className="font-brand font-semibold text-[40px] leading-[1.05] text-text-primary mb-2">
            {copy.title}
          </h1>
          <p className="text-[15px] text-text-secondary">{copy.sub}</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-soft/40 border border-rose-main/20 text-text-primary text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose" />
            <span>{error}</span>
          </motion.div>
        )}

        {stage === 'identifier' && (
          <form onSubmit={submitIdentifier} className="space-y-4">
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              type="text"
              label="Email or phone"
              placeholder="you@example.com or +91 98…"
              icon={detected === 'phone' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              autoComplete="username"
              inputMode="email"
            />
            <Button type="submit" disabled={!detected || busy} className="w-full" size="lg">
              Continue
            </Button>

            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-text-muted">
              <span className="flex-1 h-px bg-border-light" />
              <span>or</span>
              <span className="flex-1 h-px bg-border-light" />
            </div>
            <AuthOptions />
          </form>
        )}

        {stage === 'method' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => { setPassword(''); setConfirm(''); setStage('password-signup'); }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border-light hover:border-rose-main/40 hover:bg-rose-soft/20 transition-colors text-left"
            >
              <span className="w-10 h-10 rounded-xl bg-rose-soft/60 text-rose flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-text-primary">Set a password</span>
                <span className="block text-[13px] text-text-secondary">Sign up with a password you can reuse to sign in.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={startOtpSignup}
              disabled={busy}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border-light hover:border-rose-main/40 hover:bg-rose-soft/20 transition-colors text-left disabled:opacity-60"
            >
              <span className="w-10 h-10 rounded-xl bg-rose-soft/60 text-rose flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-text-primary">
                  {busy ? 'Sending code…' : 'Verify with a one-time code'}
                </span>
                <span className="block text-[13px] text-text-secondary">
                  We&apos;ll send a 6-digit code to {detected === 'phone' ? 'your phone' : 'your email'}. You can add a password later.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={backToIdentifier}
              className="text-sm text-text-secondary hover:text-rose flex items-center gap-1 mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Change email or phone
            </button>
          </div>
        )}

        {stage === 'password-signup' && (
          <form onSubmit={completePasswordSignup} className="space-y-4">
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <Check className="w-4 h-4 text-rose" />
              Signing up:{' '}<span className="font-medium text-text-primary">{identifier.trim()}</span>
            </div>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              label="Display name"
              placeholder="How should we call you?"
              icon={<User className="w-4 h-4" />}
              autoComplete="name"
            />
            <div className="space-y-2">
              <div className="relative">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Create a strong password"
                  icon={<Lock className="w-4 h-4" />}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-[38px] text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                          i <= strength
                            ? strength <= 2
                              ? 'bg-rose-main/40'
                              : strength <= 3
                                ? 'bg-rose-main/70'
                                : 'bg-rose-main'
                            : 'bg-border-light'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-text-muted">{strengthLabel} password</p>
                </div>
              )}
            </div>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              label="Confirm password"
              placeholder="Confirm your password"
              icon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
            />
            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
            <button
              type="button"
              onClick={() => setStage('method')}
              className="text-sm text-text-secondary hover:text-rose flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Choose a different method
            </button>
          </form>
        )}

        {stage === 'otp-signup' && (
          <div className="space-y-4">
            <OtpInput value={otpCode} onChange={setOtpCode} onComplete={(c) => verifyOtp(c)} />
            {devCode && (
              <p className="text-[11px] text-text-muted text-center">
                Dev mode code: <span className="font-mono">{devCode}</span>
              </p>
            )}
            <Button
              onClick={() => verifyOtp()}
              disabled={busy || otpCode.length !== 6}
              className="w-full"
              size="lg"
            >
              {busy ? 'Verifying…' : 'Verify'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStage('method')}
                className="text-text-secondary hover:text-rose flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Choose a different method
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={busy || secondsLeft > 0}
                className="text-rose hover:underline disabled:no-underline disabled:text-text-muted disabled:cursor-not-allowed"
              >
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {stage === 'details' && (
          <form onSubmit={completeDetails} className="space-y-4">
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <Check className="w-4 h-4 text-rose" />
              Verified:{' '}<span className="font-medium text-text-primary">{otpSentTo || identifier.trim()}</span>
            </div>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              label="Display name"
              placeholder="How should we call you?"
              icon={<User className="w-4 h-4" />}
              autoComplete="name"
            />
            <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-border-light cursor-pointer hover:bg-rose-soft/10">
              <input
                type="checkbox"
                checked={alsoSetPassword}
                onChange={(e) => setAlsoSetPassword(e.target.checked)}
                className="mt-1 accent-rose"
              />
              <span className="text-sm text-text-secondary">
                <span className="block font-medium text-text-primary">Also set a password (recommended)</span>
                Sign in from any device without needing a code each time.
              </span>
            </label>
            {alsoSetPassword && (
              <>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      label="Password"
                      placeholder="Create a strong password"
                      icon={<Lock className="w-4 h-4" />}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-[38px] text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                              i <= strength
                                ? strength <= 2
                                  ? 'bg-rose-main/40'
                                  : strength <= 3
                                    ? 'bg-rose-main/70'
                                    : 'bg-rose-main'
                                : 'bg-border-light'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-text-muted">{strengthLabel} password</p>
                    </div>
                  )}
                </div>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  label="Confirm password"
                  placeholder="Confirm your password"
                  icon={<Lock className="w-4 h-4" />}
                  autoComplete="new-password"
                />
              </>
            )}
            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        )}

        <p className="text-[11px] text-text-muted text-center mt-5 leading-relaxed">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="text-text-secondary hover:text-rose">Terms</Link> and{' '}
          <Link href="/privacy" className="text-text-secondary hover:text-rose">Privacy Policy</Link>.
        </p>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-rose font-medium hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
