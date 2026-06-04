'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { OtpInput } from '@/components/OtpInput';
import { AuthOptions } from '@/components/AuthOptions';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // 2FA challenge state — populated when login response says requiresOtp
  const [challenge, setChallenge] = useState<{ token: string; channel: string; sentTo: string; devCode?: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) router.replace('/discover');
  }, [isAuthenticated, router]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const goToApp = async () => {
    let dest = '/discover';
    try {
      const c = await api.getCompletion();
      if (c?.data && c.data.score < c.data.threshold) dest = '/onboarding';
    } catch {}
    router.push(dest);
  };

  const onSubmit = async (data: LoginData) => {
    try {
      setError('');
      const response = await api.login(data);
      // 2FA challenge: server didn't issue a session token.
      if (response?.data?.requiresOtp) {
        setChallenge({
          token: response.data.challengeToken,
          channel: response.data.channel,
          sentTo: response.data.sentTo,
          devCode: response.data._devCode,
        });
        return;
      }
      setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
      setSuccess(true);
      await goToApp();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  const submitOtp = async (codeOverride?: string) => {
    if (!challenge) return;
    const code = (codeOverride ?? otpCode).trim();
    if (code.length !== 6) return;
    try {
      setOtpSubmitting(true);
      setOtpError('');
      const r = await api.login2fa({ challengeToken: challenge.token, code });
      setAuth(r.data.user, r.data.accessToken, r.data.refreshToken);
      setSuccess(true);
      await goToApp();
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired code');
    } finally {
      setOtpSubmitting(false);
    }
  };

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
            Sign in
          </p>
          <h1 className="font-brand font-semibold text-[40px] leading-[1.05] text-text-primary mb-2">
            Welcome <span className="italic text-rose">back</span>.
          </h1>
          <p className="text-[15px] text-text-secondary">
            Continue where you left off.
          </p>
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

        {/* Form */}
        {challenge ? (
          <div className="space-y-4">
            <div className="text-sm text-text-secondary">
              We sent a 6-digit code to <span className="font-medium text-text-primary">{challenge.sentTo}</span>
              {' '}({challenge.channel === 'phone' ? 'SMS' : 'email'}). Enter it to finish signing in.
            </div>
            {challenge.devCode && (
              <div className="text-xs text-rose">Dev code: {challenge.devCode}</div>
            )}
            <OtpInput value={otpCode} onChange={setOtpCode} onComplete={(c) => submitOtp(c)} />
            {otpError && (
              <div className="text-sm text-rose flex items-center gap-2"><AlertCircle className="w-4 h-4" />{otpError}</div>
            )}
            <Button onClick={() => submitOtp()} disabled={otpSubmitting || otpCode.length !== 6} className="w-full" size="lg">
              {otpSubmitting ? 'Verifying…' : 'Verify & sign in'}
            </Button>
            <button type="button" className="text-xs text-text-muted underline" onClick={() => { setChallenge(null); setOtpCode(''); setOtpError(''); }}>
              Use a different account
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('email')}
            type="email"
            label="Email"
            placeholder="you@example.com"
            icon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            autoComplete="email"
          />
          <div className="relative">
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Enter your password"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              autoComplete="current-password"
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

          <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : 'Sign in'}
          </Button>
        </form>
        )}

        {!challenge && (
          <>
            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-text-muted">
              <span className="flex-1 h-px bg-border-light" />
              <span>or</span>
              <span className="flex-1 h-px bg-border-light" />
            </div>
            <AuthOptions />
          </>
        )}

        {/* Footer link */}
        <p className="text-center text-sm text-text-secondary mt-7">
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
