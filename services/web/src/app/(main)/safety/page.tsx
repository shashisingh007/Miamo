'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Phone, FileText, Heart, Lock, Eye, Users, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Portal } from '@/components/ui/portal';

// Phase F — canonical 12-reason list. Kept in sync with
// services/shared/src/schemas.ts REPORT_REASON_IDS. Order here is the
// order shown to the user (surface most-severe upstream; "Other" always last).
type ReasonId =
 | 'harassment' | 'spam' | 'inappropriate_content' | 'nudity' | 'scam'
 | 'underage' | 'impersonation' | 'hate_speech' | 'threat'
 | 'off_platform_solicitation' | 'self_harm' | 'other';

const REPORT_REASONS: Array<{ id: ReasonId; label: string; hint?: string }> = [
 { id: 'harassment',                 label: 'Harassment or bullying' },
 { id: 'threat',                     label: 'Threat of violence',            hint: 'Report to police in immediate danger' },
 { id: 'nudity',                     label: 'Nudity or sexual content' },
 { id: 'inappropriate_content',      label: 'Inappropriate content' },
 { id: 'hate_speech',                label: 'Hate speech or discrimination' },
 { id: 'scam',                       label: 'Scam or fraud' },
 { id: 'spam',                       label: 'Spam or fake profile' },
 { id: 'impersonation',              label: "Pretending to be someone they're not" },
 { id: 'underage',                   label: 'Under 18' },
 { id: 'off_platform_solicitation',  label: 'Soliciting money or off-platform contact' },
 { id: 'self_harm',                  label: 'Self-harm or suicide concern' },
 { id: 'other',                      label: 'Other' },
];

export default function SafetyPage() {
 const router = useRouter();
 const [showReport, setShowReport] = useState(false);

 useTrackPageView('safety');
 useTrackScrollDepth('safety');
 const [reportData, setReportData] = useState<{ userId: string; reasonId: ReasonId | ''; details: string; evidence: string }>({ userId: '', reasonId: '', details: '', evidence: '' });
 const [submitting, setSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [reportError, setReportError] = useState('');
 const [showTips, setShowTips] = useState(false);
 const [tips, setTips] = useState<any[]>([]);
 const [showDialerConfirm, setShowDialerConfirm] = useState(false);

 const handleReport = async () => {
 if (!reportData.reasonId) return;
 setReportError('');
 setSubmitting(true);
 const chosen = REPORT_REASONS.find((r) => r.id === reportData.reasonId);
 try {
 await api.reportUser({
  reportedId: reportData.userId || undefined,
  reason: chosen?.label || String(reportData.reasonId),
  reasonId: reportData.reasonId,
  details: reportData.details || undefined,
  evidence: reportData.evidence || undefined,
  targetType: 'user',
 });
 // Phase F — funnel signal. Never sends free-text back through tracking,
 // just the canonical reasonId + a boolean for whether evidence was
 // attached; details stay server-side.
 try {
  const track = (await import('@/lib/track')).track;
  track('safety.report_submitted', {
   reasonId: reportData.reasonId,
   targetType: 'user',
   hasEvidence: reportData.evidence.trim().length > 0,
  });
 } catch { /* tracking best-effort */ }
 setSubmitted(true);
 setShowReport(false);
 setReportData({ userId: '', reasonId: '', details: '', evidence: '' });
 setTimeout(() => setSubmitted(false), 3000);
 } catch (e) {
 logError('safety.reportUser', e);
 setReportError('Could not submit report. Please try again.');
 }
 setSubmitting(false);
 };

 const loadTips = async () => {
 try { const res = await api.getSafetyTips(); setTips(res.data || []); setShowTips(true); } catch (e) { logError('safety.getSafetyTips', e); }
 };

 const safetyCards = [
 { icon: Shield, title: 'Report a User', desc: 'Report inappropriate behavior, harassment, or suspicious accounts.', color: 'text-red-400', action: () => setShowReport(true) },
 { icon: Lock, title: 'Block & Privacy', desc: 'Block users, manage visibility, and control who can contact you.', color: 'text-rose-alt', action: () => router.push('/settings') },
 { icon: Eye, title: 'Verification', desc: 'Verify your identity to build trust and get the verified badge.', color: 'text-rose-main', action: () => router.push('/profile') },
 { icon: AlertTriangle, title: 'Scam Prevention', desc: 'Learn to recognize red flags and protect yourself from scams.', color: 'text-rose-alt', action: loadTips },
 { icon: Phone, title: 'Emergency Resources', desc: 'Quick access to local emergency contacts and helplines.', color: 'text-rose-alt', action: () => setShowDialerConfirm(true) },
 { icon: FileText, title: 'Community Guidelines', desc: 'Read our rules for respectful and safe interactions.', color: 'text-rose-alt', action: loadTips },
 { icon: Heart, title: 'Consent & Boundaries', desc: 'Understand consent-first design in messaging and media.', color: 'text-rose-light', action: loadTips },
 { icon: Users, title: 'Meeting Safely', desc: 'Tips for first dates and meeting matches in person.', color: 'text-rose-alt', action: loadTips },
 ];
 return (
 <ErrorBoundary>
 <div className="max-w-3xl mx-auto p-6 space-y-6">
 <div>
 <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-rose-alt" /> Safety Center</h1>
 <p className="text-sm text-text-muted mt-1">Your safety is our top priority. Learn how to stay safe on Miamo.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {safetyCards.map((item) => (
 <Card key={item.title} hover className="p-5 cursor-pointer" onClick={item.action}>
 <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
 <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
 <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
 </Card>
 ))}
 </div>

 {submitted && (
 <Card className="p-4 border-rose-main/20">
 <p className="text-sm text-rose-alt">Report submitted successfully. Our team will review it.</p>
 </Card>
 )}

 {showReport && (
 <Card className="p-5 border-red-500/20">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold">Report a User</h3>
 <button onClick={() => { setShowReport(false); setReportError(''); }} aria-label="Close report form"><X className="w-4 h-4 text-text-muted" /></button>
 </div>
 <div className="space-y-3">
 {/* Phase F — 12 canonical reasons rendered as an accessible radio-group so
     screen readers announce the count + selected state. */}
 <div role="radiogroup" aria-label="Report reason" className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
 {REPORT_REASONS.map((r) => {
  const active = reportData.reasonId === r.id;
  return (
   <label
    key={r.id}
    className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${
     active
      ? 'border-red-400/50 bg-red-500/5 text-text-primary'
      : 'border-border bg-miamo-surface text-text-secondary hover:border-red-400/30'
    }`}
   >
    <input
     type="radio"
     name="report-reason"
     value={r.id}
     checked={active}
     onChange={() => setReportData((d) => ({ ...d, reasonId: r.id }))}
     className="mt-0.5 accent-red-500"
    />
    <span className="text-xs leading-tight">
     {r.label}
     {r.hint && <span className="block text-[10px] text-text-muted mt-0.5">{r.hint}</span>}
    </span>
   </label>
  );
 })}
 </div>
 <input
  type="text"
  value={reportData.userId}
  onChange={(e) => setReportData((d) => ({ ...d, userId: e.target.value }))}
  placeholder="User ID or username (optional)"
  className="input-premium w-full text-sm"
  aria-label="Reported user identifier"
 />
 <textarea value={reportData.details} onChange={e => setReportData(d => ({...d, details: e.target.value}))} placeholder="Additional details (optional)…"
 className="input-premium w-full text-sm resize-none" rows={3} maxLength={2000} aria-label="Report details" />
 <input
  type="text"
  value={reportData.evidence}
  onChange={(e) => setReportData((d) => ({ ...d, evidence: e.target.value }))}
  placeholder="Evidence link or screenshot URL (optional)"
  className="input-premium w-full text-sm"
  maxLength={2000}
  aria-label="Evidence link"
 />
 {reportError && <p className="text-xs text-red-400" role="alert">{reportError}</p>}
 <Button size="sm" onClick={handleReport} loading={submitting} disabled={submitting || !reportData.reasonId} aria-label="Submit safety report" aria-busy={submitting}><Send className="w-3 h-3" /> {submitting ? 'Submitting…' : 'Submit Report'}</Button>
 </div>
 </Card>
 )}

 {showTips && tips.length > 0 && (
 <Card className="p-5">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold">Safety Tips</h3>
 <button onClick={() => setShowTips(false)}><X className="w-4 h-4 text-text-muted" /></button>
 </div>
 <div className="space-y-2">
 {tips.map((tip: any, i: number) => (
 <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
 <span className="text-rose-main mt-0.5">•</span>
 <span>{tip.title || tip.content || tip}</span>
 </div>
 ))}
 </div>
 </Card>
 )}

 <Card className="p-5 border-rose-main/20">
 <div className="flex items-start gap-3">
 <Shield className="w-5 h-5 text-rose-alt shrink-0 mt-0.5" />
 <div>
 <h3 className="text-sm font-semibold">In immediate danger?</h3>
 <p className="text-xs text-text-muted mt-1">If you're in immediate danger, contact your local emergency services. In the US, call 911.</p>
 </div>
 </div>
 </Card>

 {showDialerConfirm && (
 <Portal>
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowDialerConfirm(false)} />
 <div className="fixed inset-x-4 top-[30%] max-w-sm mx-auto bg-miamo-card border border-border rounded-2xl shadow-2xl z-50 p-6 text-center">
 <Phone className="w-8 h-8 text-rose-alt mx-auto mb-3" />
 <h3 className="text-sm font-bold mb-1">Open Phone Dialer?</h3>
 <p className="text-xs text-text-muted mb-4">This will open the phone dialer to call emergency services (112).</p>
 <div className="flex gap-2">
 <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowDialerConfirm(false)}>Cancel</Button>
 <Button size="sm" className="flex-1" onClick={() => { setShowDialerConfirm(false); window.open('tel:112'); }}>Call 112</Button>
 </div>
 </div>
 </Portal>
 )}
 </div>
 </ErrorBoundary>
 );
}
