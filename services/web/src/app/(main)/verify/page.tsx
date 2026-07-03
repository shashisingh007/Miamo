'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { OtpInput } from '@/components/OtpInput';
import { PhoneInput } from '@/components/PhoneInput';

type Step = 'email-send' | 'email-verify' | 'phone-input' | 'phone-verify' | 'selfie' | 'done';

interface Status {
  user: { verified: boolean; emailVerified: boolean; phoneVerified: boolean };
  badges: { email: boolean; phone: boolean; selfie: boolean; id: boolean; fullyVerified: boolean };
  submissions: Array<{ id: string; kind: string; status: string; submittedAt: string }>;
}

// Single-page verification flow: email OTP → phone OTP → selfie upload.
// Auto-skips steps that are already complete based on /verify/status.
export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [step, setStep] = useState<Step>('email-send');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // Email
  const [emailCode, setEmailCode] = useState('');
  const [emailDevCode, setEmailDevCode] = useState<string | null>(null);

  // Phone
  const [phone, setPhone] = useState('+91');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneDevCode, setPhoneDevCode] = useState<string | null>(null);

  // Selfie
  const [selfieUrl, setSelfieUrl] = useState('https://example.com/selfie.jpg');

  const refresh = async () => {
    try {
      const r = await api.getVerificationStatus();
      setStatus(r.data);
      // Pick next pending step.
      if (!r.data.badges.email) setStep('email-send');
      else if (!r.data.badges.phone) setStep('phone-input');
      else if (!r.data.badges.selfie) setStep('selfie');
      else setStep('done');
    } catch (e: any) { setError(e.message || 'Could not load status'); }
  };
  useEffect(() => { refresh(); }, []);

  const wrap = async (fn: () => Promise<void>) => {
    setError(''); setInfo(''); setBusy(true);
    try { await fn(); } catch (e: any) { setError(e.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const sendEmail = () => wrap(async () => {
    const r = await api.sendEmailOtp();
    setEmailDevCode(r.data?._devCode || null);
    setInfo(`Code sent to ${r.data.sentTo}`);
    setStep('email-verify');
  });
  const verifyEmail = (code: string) => wrap(async () => {
    await api.verifyEmailOtp(code);
    setInfo('Email verified ✓');
    await refresh();
  });
  const sendPhone = () => wrap(async () => {
    if (!/^\+\d{8,15}$/.test(phone)) throw new Error('Enter a valid phone number including country code');
    const r = await api.sendPhoneOtp(phone);
    setPhoneDevCode(r.data?._devCode || null);
    setInfo(`Code sent to ${r.data.sentTo}`);
    setStep('phone-verify');
  });
  const verifyPhone = (code: string) => wrap(async () => {
    await api.verifyPhoneOtp(code);
    setInfo('Phone verified ✓');
    await refresh();
  });
  const submitSelfie = () => wrap(async () => {
    await api.submitVerification({ kind: 'selfie', photoUrl: selfieUrl });
    setInfo('Selfie submitted — review pending');
    // Poll for auto-approve in dev.
    setTimeout(refresh, 4000);
  });

  return (
    <div className="max-w-xl mx-auto px-5 py-8">
      <h1 className="text-2xl font-semibold mb-2">Verify your account</h1>
      <p className="text-sm text-neutral-500 mb-6">
        A verified profile gets a blue badge, ranks higher in Discover, and unlocks DTM.
      </p>

      {status && (
        <div className="mb-6 grid grid-cols-3 gap-3 text-center text-xs">
          <Badge label="Email" on={status.badges.email} />
          <Badge label="Phone" on={status.badges.phone} />
          <Badge label="Selfie" on={status.badges.selfie} />
        </div>
      )}

      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}
      {info && <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{info}</div>}

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 bg-white dark:bg-neutral-900">
        {/* click-matrix.md §5 rank 26: show a "Sending…" label while the OTP
            request is in flight so users don't re-tap and 429 themselves. */}
        {step === 'email-send' && (
          <Section title="Step 1: Verify your email" desc="We'll send a 6-digit code to your registered email.">
            <button onClick={sendEmail} disabled={busy} aria-label="Send email verification code" aria-busy={busy} className="px-4 py-2 rounded-lg bg-rose-500 text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send code'}</button>
          </Section>
        )}
        {step === 'email-verify' && (
          <Section title="Enter the email code" desc={emailDevCode ? `Dev code: ${emailDevCode}` : 'Check your inbox'}>
            <OtpInput value={emailCode} onChange={setEmailCode} onComplete={(c) => verifyEmail(c)} />
            <button onClick={() => verifyEmail(emailCode)} disabled={busy || emailCode.length !== 6} aria-label="Verify email code" aria-busy={busy} className="mt-4 w-full px-4 py-2 rounded-lg bg-rose-500 text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Verify'}</button>
            <button onClick={sendEmail} disabled={busy} aria-label="Resend email verification code" className="mt-2 text-xs text-neutral-500 underline">{busy ? 'Sending…' : 'Resend code'}</button>
          </Section>
        )}
        {step === 'phone-input' && (
          <Section title="Step 2: Verify your phone" desc="We'll text you a 6-digit code.">
            <PhoneInput value={phone} onChange={setPhone} />
            <button onClick={sendPhone} disabled={busy} aria-label="Send phone verification code" aria-busy={busy} className="mt-4 w-full px-4 py-2 rounded-lg bg-rose-500 text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send code'}</button>
          </Section>
        )}
        {step === 'phone-verify' && (
          <Section title="Enter the SMS code" desc={phoneDevCode ? `Dev code: ${phoneDevCode}` : 'Check your messages'}>
            <OtpInput value={phoneCode} onChange={setPhoneCode} onComplete={(c) => verifyPhone(c)} />
            <button onClick={() => verifyPhone(phoneCode)} disabled={busy || phoneCode.length !== 6} aria-label="Verify phone code" aria-busy={busy} className="mt-4 w-full px-4 py-2 rounded-lg bg-rose-500 text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Verify'}</button>
            <button onClick={() => setStep('phone-input')} aria-label="Change phone number" className="mt-2 text-xs text-neutral-500 underline">Change phone</button>
          </Section>
        )}
        {step === 'selfie' && (
          <Section title="Step 3: Selfie verification" desc="Upload a clear selfie (matched against your profile photos by our review team).">
            <input
              type="text"
              value={selfieUrl}
              onChange={(e) => setSelfieUrl(e.target.value)}
              placeholder="Selfie URL (use the upload field once integrated)"
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            />
            <button onClick={submitSelfie} disabled={busy || !selfieUrl} className="mt-4 w-full px-4 py-2 rounded-lg bg-rose-500 text-white disabled:opacity-50">Submit</button>
          </Section>
        )}
        {step === 'done' && (
          <Section title="You're verified ✓" desc="Email, phone and selfie all confirmed. Your profile shows a verified badge.">
            <button onClick={() => router.push('/discover')} className="px-4 py-2 rounded-lg bg-rose-500 text-white">Back to Discover</button>
          </Section>
        )}
      </div>
    </div>
  );
}

function Badge({ label, on }: { label: string; on: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${on ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-neutral-50 border-neutral-200 text-neutral-500'}`}>
      <div className="text-lg">{on ? '✓' : '○'}</div>
      <div>{label}</div>
    </div>
  );
}
function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-neutral-500">{desc}</p>
      </div>
      {children}
    </div>
  );
}
