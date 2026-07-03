'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Check, AlertCircle, ArrowLeft, Phone, KeyRound, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { OtpInput } from '@/components/OtpInput';
import { AuthOptions } from '@/components/AuthOptions';
import { useCountdown } from '@/lib/useCountdown';

// v3.7 sign-in rewrite. Single-input identifier → method picker → password
// OR passwordless OTP. State machine below drives what the page renders.
type Stage = 'identifier' | 'method' | 'password' | 'otp';

// Lightweight predicates. Server-side validation is the source of truth;
// these are just enough to gate the "Continue" button and route the OTP
// resend copy ("SMS" vs "email").
function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function looksLikePhone(s: string) {
  const cleaned = s.trim();
  // Accept +E.164 (min 8 digits after +) OR a bare 10-digit number (we
  // default to +91 for India downstream).
  return /^\+\d{7,15}$/.test(cleaned) || /^\d{10}$/.test(cleaned);
}
function detectChannel(s: string): 'email' | 'phone' | null {
  const v = s.trim();
  if (!v) return null;
  if (looksLikeEmail(v)) return 'email';
  if (looksLikePhone(v)) return 'phone';
  // Fallback: something with an @ but not a valid email — treat as email
  // so the server can return a descriptive error.
  if (v.includes('@')) return 'email';
  return null;
}

const RESEND_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();

  const [stage, setStage] = useState<Stage>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  // OTP-mode challenge state (covers BOTH passwordless-login OTP AND the
  // 2FA challenge that /auth/login can return after a password check).
  const [otpToken, setOtpToken] = useState('');
  const [otpMode, setOtpMode] = useState<'login-otp' | '2fa'>('login-otp');
  const [otpChannel, setOtpChannel] = useState<'email' | 'phone'>('email');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const { secondsLeft, reset: resetCountdown } = useCountdown(0);

  // Skip the whole flow if the user is already signed in (e.g. hit the
  // login page from a link but has a valid session cookie).
  useEffect(() => {
    if (isAuthenticated) router.replace('/discover');
  }, [isAuthenticated, router]);

  const goToApp = async () => {
    let dest = '/discover';
    try {
      const c = await api.getCompletion();
      if (c?.data && c.data.score < c.data.threshold) dest = '/onboarding';
    } catch {}
    router.push(dest);
  };

  const detected = detectChannel(identifier);
  const continueDisabled = !detected || busy;

  function backToIdentifier() {
    setStage('identifier');
    setError('');
    setPassword('');
    setOtpCode('');
    setOtpToken('');
    setDevCode('');
  }

  async function submitIdentifier(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!detected) {
      setError('Enter a valid email or phone number.');
      return;
    }
    setStage('method');
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!password) { setError('Password is required.'); return; }
    setBusy(true);
    try {
      const response = await api.login({ identifier: identifier.trim(), password });
      // 2FA challenge: server didn't issue a session token.
      if (response?.data?.requiresOtp) {
        setOtpMode('2fa');
        setOtpToken(response.data.challengeToken);
        setOtpChannel(response.data.channel || 'email');
        setOtpSentTo(response.data.sentTo || '');
        setDevCode(response.data._devCode || '');
        setOtpCode('');
        resetCountdown(RESEND_SECONDS);
        setStage('otp');
        return;
      }
      setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
      setSuccess(true);
      await goToApp();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setBusy(false);
    }
  }

  async function requestLoginOtp() {
    setError('');
    setBusy(true);
    try {
      const r = await api.loginOtpStart({ identifier: identifier.trim() });
      setOtpMode('login-otp');
      setOtpToken(r.data.otpToken);
      setOtpChannel(r.data.channel || (detected as 'email' | 'phone') || 'email');
      setOtpSentTo(r.data.sentTo || identifier.trim());
      setDevCode(r.data._devCode || '');
      setOtpCode('');
      resetCountdown(RESEND_SECONDS);
      setStage('otp');
    } catch (err: any) {
      // Surface actionable messages instead of leaving the user stuck on the
      // "Please wait Ns" banner with no way forward.
      const raw = String(err?.code || err?.message || '');
      if (raw.includes('OTP_COOLDOWN')) {
        setError('A code was recently sent to your inbox. Check spam, or use password below.');
      } else if (raw.includes('OTP_SEND_FAILED') || raw.includes('502')) {
        setError('We could not deliver a code to that ' + (detected === 'phone' ? 'number' : 'inbox') + '. Use password, or try a different address.');
      } else if (raw.includes('DAILY_CAP')) {
        setError('Too many codes requested today. Use password, or try again tomorrow.');
      } else {
        setError(err?.message || 'Could not send code. Try password below.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(codeOverride?: string) {
    const code = (codeOverride ?? otpCode).trim();
    if (code.length !== 6 || !otpToken) return;
    setBusy(true);
    setError('');
    try {
      const r = otpMode === '2fa'
        ? await api.login2fa({ challengeToken: otpToken, code })
        : await api.loginOtpVerify({ otpToken, code });
      setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
      setSuccess(true);
      await goToApp();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (secondsLeft > 0) return;
    setError('');
    setBusy(true);
    try {
      if (otpMode === '2fa') {
        // Re-run the password login to get a fresh 2FA challenge. The
        // server will just re-issue the OTP with a new challengeToken.
        const response = await api.login({ identifier: identifier.trim(), password });
        if (response?.data?.requiresOtp) {
          setOtpToken(response.data.challengeToken);
          setOtpSentTo(response.data.sentTo || otpSentTo);
          setDevCode(response.data._devCode || '');
        }
      } else {
        const r = await api.loginOtpStart({ identifier: identifier.trim() });
        setOtpToken(r.data.otpToken);
        setOtpSentTo(r.data.sentTo || otpSentTo);
        setDevCode(r.data._devCode || '');
      }
      setOtpCode('');
      resetCountdown(RESEND_SECONDS);
    } catch (err: any) {
      setError(err.message || 'Could not resend. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const headerCopy = {
    identifier: {
      kicker: 'Sign in',
      title: <>Welcome <span className="italic text-rose">back</span>.</>,
      sub: 'Continue where you left off.',
    },
    method: {
      kicker: 'Choose how',
      title: <>How would you like to <span className="italic text-rose">sign in</span>?</>,
      sub: `Signing in as ${identifier.trim()}`,
    },
    password: {
      kicker: 'Sign in',
      title: <>Enter your <span className="italic text-rose">password</span>.</>,
      sub: `Signing in as ${identifier.trim()}`,
    },
    otp: {
      kicker: 'Verify',
      title: <>Enter the <span className="italic text-rose">6-digit code</span>.</>,
      sub: otpSentTo
        ? `We sent a code to ${otpSentTo}${otpChannel === 'phone' ? ' via SMS' : ' by email'}.`
        : "We'll send a 6-digit code to verify it's you.",
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
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">
            {copy.kicker}
          </p>
          <h1 className="font-brand font-semibold text-[40px] leading-[1.05] text-text-primary mb-2">
            {copy.title}
          </h1>
          <p className="text-[15px] text-text-secondary">{copy.sub}</p>
        </div>

        {/* Alerts */}
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
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3.5 rounded-xl bg-rose-soft/40 border border-rose-main/20 text-text-primary text-sm flex items-center gap-2.5"
          >
            <Check className="w-4 h-4 text-rose" />
            <span>Signed in. Taking you in…</span>
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
            <Button type="submit" disabled={continueDisabled} className="w-full" size="lg">
              {busy ? 'Continuing…' : 'Continue'}
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
              onClick={() => setStage('password')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border-light hover:border-rose-main/40 hover:bg-rose-soft/20 transition-colors text-left"
            >
              <span className="w-10 h-10 rounded-xl bg-rose-soft/60 text-rose flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-text-primary">Use password</span>
                <span className="block text-[13px] text-text-secondary">Sign in with your Miamo password.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={requestLoginOtp}
              disabled={busy}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border-light hover:border-rose-main/40 hover:bg-rose-soft/20 transition-colors text-left disabled:opacity-60"
            >
              <span className="w-10 h-10 rounded-xl bg-rose-soft/60 text-rose flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-text-primary">
                  {busy ? 'Sending code…' : 'Get a one-time code'}
                </span>
                <span className="block text-[13px] text-text-secondary">
                  We&apos;ll send a 6-digit code to {detected === 'phone' ? 'your phone' : 'your email'}.
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

        {stage === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <Check className="w-4 h-4 text-rose" />
              <span className="font-medium text-text-primary">{identifier.trim()}</span>
            </div>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                icon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
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
            <Button type="submit" disabled={busy || !password} className="w-full" size="lg">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={backToIdentifier}
                className="text-text-secondary hover:text-rose flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change email or phone
              </button>
              <Link href="/forgot-password" className="text-rose hover:underline">
                Forgot password?
              </Link>
            </div>
          </form>
        )}

        {stage === 'otp' && (
          <div className="space-y-4">
            <OtpInput value={otpCode} onChange={setOtpCode} onComplete={(c) => submitOtp(c)} />
            {devCode && (
              <p className="text-[11px] text-text-muted text-center">
                Dev mode code: <span className="font-mono">{devCode}</span>
              </p>
            )}
            <Button
              onClick={() => submitOtp()}
              disabled={busy || otpCode.length !== 6}
              className="w-full"
              size="lg"
            >
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={backToIdentifier}
                className="text-text-secondary hover:text-rose flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different account
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

        {/* Footer */}
        <p className="text-center text-sm text-text-secondary mt-6">
          New to Miamo?{' '}
          <Link href="/register" className="text-rose font-medium hover:underline underline-offset-4">
            Create an account
          </Link>
        </p>

        {process.env.NODE_ENV === 'development' && (
          <p className="text-center text-[11px] text-text-muted mt-5">
            Demo: miamo1@miamo.test / miamo1
          </p>
        )}
      </div>
    </motion.div>
  );
}
