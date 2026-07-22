'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/OtpInput';
import { PhoneInput } from '@/components/PhoneInput';
import { AuthOptions } from '@/components/AuthOptions';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';

type Stage = 'identifier' | 'verify' | 'details' | 'done' | 'password-details';
type SignupMode = 'otp' | 'password';

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function isPhone(s: string) {
  return /^\+[1-9]\d{6,14}$/.test(s.trim());
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [stage, setStage] = useState<Stage>('identifier');
  const [signupMode, setSignupMode] = useState<SignupMode>('otp');
  const [idMode, setIdMode] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('+91');
  const [signupToken, setSignupToken] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function startSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const id = identifier.trim();
    // Password-mode: requires email (not phone), and jumps straight to the
    // details form. Skips the OTP round-trip until we have a real SMS/email
    // provider wired.
    if (signupMode === 'password') {
      if (!isEmail(id)) {
        setError('Password sign-up needs an email address');
        return;
      }
      setSentTo(id);
      setStage('password-details');
      return;
    }
    if (!isEmail(id) && !isPhone(id)) {
      setError('Enter a valid email or phone in +E.164 format (e.g. +919876543210)');
      return;
    }
    setBusy(true);
    try {
      const r = await api.signupStart({ identifier: id });
      setSignupToken(r.data.signupToken);
      setChannel(r.data.channel);
      setSentTo(r.data.sentTo || id);
      if (r.data._devCode) setDevCode(r.data._devCode);
      setStage('verify');
    } catch (err: any) {
      setError(err.message || 'Could not send code');
    } finally {
      setBusy(false);
    }
  }

  async function completePasswordSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (displayName.trim().length < 2) { setError('Display name too short'); return; }
    if (strength < 4) { setError('Choose a stronger password (8+ chars, mix of upper/lower/number/special)'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    try {
      const r = await api.register({ email: identifier.trim(), password, displayName });
      setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
      setStage('done');
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Could not create account');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(code?: string) {
    const c = (code ?? otp).trim();
    if (c.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError('');
    setBusy(true);
    try {
      const r = await api.signupVerify({ signupToken, code: c });
      setVerifiedToken(r.data.verifiedToken);
      setStage('details');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function completeSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (displayName.trim().length < 2) { setError('Display name too short'); return; }
    if (strength < 4) { setError('Choose a stronger password (8+ chars, mix of upper/lower/number/special)'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    try {
      const r = await api.signupComplete({ verifiedToken, password, displayName });
      setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
      setStage('done');
      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Could not create account');
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError('');
    setBusy(true);
    try {
      const r = await api.signupStart({ identifier });
      setSignupToken(r.data.signupToken);
      if (r.data._devCode) setDevCode(r.data._devCode);
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Could not resend');
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">
            {stage === 'identifier' && 'Create account'}
            {stage === 'verify' && 'Verify it’s you'}
            {stage === 'details' && 'Almost there'}
            {stage === 'password-details' && 'Almost there'}
            {stage === 'done' && 'Welcome'}
          </p>
          <h1 className="font-brand font-semibold text-[40px] leading-[1.05] text-text-primary mb-2">
            {stage === 'identifier' && (<>Begin <span className="italic text-rose">something real</span>.</>)}
            {stage === 'verify' && (<>Enter the <span className="italic text-rose">6-digit code</span>.</>)}
            {stage === 'details' && (<>Set your <span className="italic text-rose">password</span>.</>)}
            {stage === 'password-details' && (<>Set your <span className="italic text-rose">password</span>.</>)}
            {stage === 'done' && (<>Welcome.</>)}
          </h1>
          <p className="text-[15px] text-text-secondary">
            {stage === 'identifier' && (signupMode === 'password'
              ? 'Sign up with email and a password. No code needed.'
              : 'We’ll send a one-time code to verify it’s really you.')}
            {stage === 'verify' && `We sent a code to ${sentTo}.`}
            {stage === 'details' && 'Choose a name and a strong password.'}
            {stage === 'password-details' && `Creating an account for ${sentTo}.`}
          </p>
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
          <form onSubmit={startSignup} className="space-y-4">
            <div className="flex gap-2 p-1 bg-bg-soft rounded-xl">
              <button
                type="button"
                onClick={() => setSignupMode('otp')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${signupMode === 'otp' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                With OTP
              </button>
              <button
                type="button"
                onClick={() => { setSignupMode('password'); setIdMode('email'); setIdentifier(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${signupMode === 'password' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Email + password
              </button>
            </div>
            {signupMode === 'otp' && (
            <div className="flex gap-2 p-1 bg-bg-soft rounded-xl">
              <button
                type="button"
                onClick={() => { setIdMode('phone'); setIdentifier('+91'); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${idMode === 'phone' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Phone
              </button>
              <button
                type="button"
                onClick={() => { setIdMode('email'); setIdentifier(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${idMode === 'email' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Email
              </button>
            </div>
            )}
            {signupMode === 'otp' && idMode === 'phone' ? (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Phone number</label>
                <PhoneInput value={identifier} onChange={setIdentifier} />
              </div>
            ) : (
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                type="email"
                label="Email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                autoComplete="email"
              />
            )}
            <Button type="submit" disabled={busy} className="w-full" size="lg">
              {busy
                ? (signupMode === 'password' ? 'Continuing…' : 'Sending code…')
                : (signupMode === 'password' ? 'Continue' : 'Send code')}
            </Button>
          </form>
        )}

        {stage === 'verify' && (
          <div className="space-y-4">
            <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
            {devCode && (
              <p className="text-[11px] text-text-muted text-center">
                Dev mode code: <span className="font-mono">{devCode}</span>
              </p>
            )}
            <Button onClick={() => verifyOtp()} disabled={busy || otp.length !== 6} className="w-full" size="lg">
              {busy ? 'Verifying…' : 'Verify'}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setStage('identifier'); setOtp(''); setDevCode(''); }} className="text-text-secondary hover:text-rose flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Change {channel}
              </button>
              <button type="button" onClick={resendCode} disabled={busy} className="text-rose hover:underline">
                Resend code
              </button>
            </div>
          </div>
        )}

        {(stage === 'details' || stage === 'password-details') && (
          <form onSubmit={stage === 'password-details' ? completePasswordSignup : completeSignup} className="space-y-4">
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <Check className="w-4 h-4 text-rose" />
              {stage === 'password-details' ? 'Signing up:' : 'Verified:'}{' '}
              <span className="font-medium text-text-primary">{sentTo}</span>
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
                  onClick={() => setShowPassword(!showPassword)}
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
          </form>
        )}

        {stage === 'identifier' && (
          <>
            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-text-muted">
              <span className="flex-1 h-px bg-border-light" />
              <span>or</span>
              <span className="flex-1 h-px bg-border-light" />
            </div>
            <AuthOptions />
          </>
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
