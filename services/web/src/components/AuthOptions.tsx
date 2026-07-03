'use client';

// Drop-in widget that renders Google + Apple buttons and a
// passwordless phone/email OTP option. Intended to be embedded on both
// the login and register pages so users see the same set of choices
// either way. On success it stores tokens via useAuthStore and calls
// onSuccess so the host page can route appropriately.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/OtpInput';
import { PhoneInput } from '@/components/PhoneInput';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';

interface Props {
  onSuccess?: (created: boolean) => void;
}

type Stage = 'idle' | 'otp_id' | 'otp_verify';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';
const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin + '/login' : '');
const APPLE_JS_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (resp: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }) => void;
          prompt: (cb?: (notif: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason?: () => string; getSkippedReason?: () => string }) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (cfg: { clientId: string; scope: string; redirectURI: string; state?: string; usePopup?: boolean }) => void;
        signIn: () => Promise<{ authorization: { id_token: string; code: string; state?: string }; user?: { name?: { firstName?: string; lastName?: string }; email?: string } }>;
      };
    };
  }
}

export function AuthOptions({ onSuccess }: Props) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [stage, setStage] = useState<Stage>('idle');
  const [idMode, setIdMode] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('+91');
  const [otpToken, setOtpToken] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const inDev = process.env.NODE_ENV !== 'production';
  const hasGoogle = !!GOOGLE_CLIENT_ID;
  const hasApple = !!APPLE_CLIENT_ID;

  function handleAuthSuccess(data: any) {
    setAuth(data.user, data.accessToken, data.refreshToken);
    onSuccess?.(!!data.created);
    if (data.created || data.user?.profileScore < 60) router.push('/onboarding');
    else router.push('/discover');
  }

  // ─── Load Google Identity Services script when a Client ID is set ──
  useEffect(() => {
    if (!hasGoogle || typeof window === 'undefined') return;
    if (window.google?.accounts?.id) { setGisReady(true); return; }
    const existing = document.querySelector(`script[src="${GOOGLE_GSI_SRC}"]`);
    const onLoad = () => setGisReady(true);
    if (existing) {
      existing.addEventListener('load', onLoad);
      return () => existing.removeEventListener('load', onLoad);
    }
    const s = document.createElement('script');
    s.src = GOOGLE_GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = onLoad;
    document.head.appendChild(s);
  }, [hasGoogle]);

  // ─── Load Apple JS + initialize when a Service ID is set ───────────
  useEffect(() => {
    if (!hasApple || typeof window === 'undefined') return;
    const init = () => {
      if (!window.AppleID) return;
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: APPLE_REDIRECT_URI,
        usePopup: true,
      });
    };
    if (window.AppleID) { init(); return; }
    const existing = document.querySelector(`script[src="${APPLE_JS_SRC}"]`);
    if (existing) { existing.addEventListener('load', init); return () => existing.removeEventListener('load', init); }
    const s = document.createElement('script');
    s.src = APPLE_JS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [hasApple]);

  // ─── Initialize GIS + render the official button ────────────────────
  useEffect(() => {
    if (!gisReady || !googleBtnRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        if (!resp?.credential) return;
        setBusy(true); setError('');
        try {
          const r = await api.loginGoogle(resp.credential);
          handleAuthSuccess(r.data);
        } catch (e: any) {
          setError(e.message || 'Google sign-in failed');
        } finally { setBusy(false); }
      },
      auto_select: false,
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: googleBtnRef.current.clientWidth || 320,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gisReady]);

  async function googleSignInDev() {
    setBusy(true); setError('');
    try {
      const idToken = `dev:google.${Date.now()}@gmail.test:google_${Date.now()}:Google Tester`;
      const r = await api.loginGoogle(idToken);
      handleAuthSuccess(r.data);
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    } finally { setBusy(false); }
  }

  async function appleSignIn() {
    setBusy(true); setError('');
    try {
      if (hasApple) {
        if (!window.AppleID) throw new Error('Apple sign-in not ready, please try again');
        const resp = await window.AppleID.auth.signIn();
        const idToken = resp?.authorization?.id_token;
        if (!idToken) throw new Error('Apple sign-in cancelled');
        const r = await api.loginApple(idToken, resp.user);
        handleAuthSuccess(r.data);
        return;
      }
      // Dev fallback only when no Apple Service ID is configured.
      if (!inDev) throw new Error('Apple sign-in not configured');
      const idToken = `dev:apple.${Date.now()}@privaterelay.test:apple_${Date.now()}:Apple Tester`;
      const r = await api.loginApple(idToken);
      handleAuthSuccess(r.data);
    } catch (e: any) {
      // Apple throws { error: 'popup_closed_by_user' } when the user dismisses; don't show an error for that.
      if (e?.error === 'popup_closed_by_user') return;
      setError(e?.message || e?.error || 'Apple sign-in failed');
    } finally { setBusy(false); }
  }

  async function startOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const id = identifier.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id) && !/^\+[1-9]\d{6,14}$/.test(id)) {
      setError('Enter an email or phone in +E.164 format');
      return;
    }
    setBusy(true);
    try {
      const r = await api.otpStart(id);
      setOtpToken(r.data.otpToken);
      setSentTo(r.data.sentTo);
      if (r.data._devCode) setDevCode(r.data._devCode);
      setStage('otp_verify');
    } catch (e: any) {
      setError(e.message || 'Could not send code');
    } finally { setBusy(false); }
  }

  async function verifyOtp(code?: string) {
    const c = (code ?? otp).trim();
    if (c.length !== 6) { setError('Enter the 6-digit code'); return; }
    setBusy(true); setError('');
    try {
      const r = await api.otpVerify({ otpToken, code: c });
      handleAuthSuccess(r.data);
    } catch (e: any) {
      setError(e.message || 'Invalid code');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-soft/40 border border-rose-main/20 text-text-primary text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose" />
          <span>{error}</span>
        </div>
      )}

      {stage === 'idle' && (
        <>
          {hasGoogle ? (
            <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" aria-label="Continue with Google" />
          ) : inDev ? (
            <button
              type="button"
              disabled={busy}
              onClick={googleSignInDev}
              title="Dev mode — set NEXT_PUBLIC_GOOGLE_CLIENT_ID for real Google sign-in"
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border-light bg-white text-text-primary hover:bg-bg-soft transition-colors text-sm font-medium disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92A8.78 8.78 0 0 0 17.64 9.2z" />
                <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26a5.4 5.4 0 0 1-3.04.84A5.36 5.36 0 0 1 3.96 10.7H.96v2.34A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.96 10.7a5.4 5.4 0 0 1 0-3.4V4.96H.96a9 9 0 0 0 0 8.08l3-2.34z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.6 8.6 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.34A5.36 5.36 0 0 1 9 3.58z" />
              </svg>
              Continue with Google <span className="text-[10px] text-text-muted">(dev)</span>
            </button>
          ) : null}
          {(hasApple || inDev) && (
            <button
              type="button"
              disabled={busy}
              onClick={appleSignIn}
              title={!hasApple ? 'Dev mode — set NEXT_PUBLIC_APPLE_CLIENT_ID for real Apple sign-in' : undefined}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border-light bg-black text-white hover:bg-zinc-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.05 20.28c-.98.95-2.05.86-3.08.43-1.09-.45-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.43C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple {!hasApple && <span className="text-[10px] text-zinc-400">(dev)</span>}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setStage('otp_id')}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border-light bg-white text-text-primary hover:bg-bg-soft transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Phone className="w-4 h-4" />
            Continue with phone or email
          </button>
        </>
      )}

      {stage === 'otp_id' && (
        <form onSubmit={startOtp} className="space-y-3">
          <div className="flex gap-2 p-1 bg-bg-soft rounded-xl">
            <button
              type="button"
              onClick={() => { setIdMode('phone'); setIdentifier('+91'); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${idMode === 'phone' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => { setIdMode('email'); setIdentifier(''); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${idMode === 'email' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Email
            </button>
          </div>
          {idMode === 'phone' ? (
            <PhoneInput value={identifier} onChange={setIdentifier} />
          ) : (
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />
          )}
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy ? 'Sending code…' : 'Send code'}
          </Button>
          <button
            type="button"
            onClick={() => setStage('idle')}
            className="w-full text-sm text-text-secondary hover:text-rose"
          >
            Back to options
          </button>
        </form>
      )}

      {stage === 'otp_verify' && (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary text-center">We sent a code to {sentTo}.</p>
          <OtpInput value={otp} onChange={setOtp} onComplete={verifyOtp} />
          {devCode && (
            <p className="text-[11px] text-text-muted text-center">
              Dev mode code: <span className="font-mono">{devCode}</span>
            </p>
          )}
          <Button onClick={() => verifyOtp()} disabled={busy || otp.length !== 6} className="w-full" size="lg">
            {busy ? 'Verifying…' : 'Verify & continue'}
          </Button>
          <button
            type="button"
            onClick={() => { setStage('otp_id'); setOtp(''); setDevCode(''); }}
            className="w-full text-sm text-text-secondary hover:text-rose"
          >
            Change number
          </button>
        </div>
      )}
    </div>
  );
}
