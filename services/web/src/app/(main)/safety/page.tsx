'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Phone, FileText, Heart, Lock, Eye, Users, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackScrollDepth, trackClick } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';

export default function SafetyPage() {
  const router = useRouter();
  const [showReport, setShowReport] = useState(false);

  useTrackPageView('safety');
  useTrackScrollDepth('safety');
  const [reportData, setReportData] = useState({ userId: '', reason: '', details: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [tips, setTips] = useState<any[]>([]);
  const [showDialerConfirm, setShowDialerConfirm] = useState(false);

  const handleReport = async () => {
    if (!reportData.reason.trim()) return;
    setSubmitting(true);
    try { await api.reportUser({ reason: reportData.reason, details: reportData.details }); setSubmitted(true); setShowReport(false); setReportData({ userId: '', reason: '', details: '' }); setTimeout(() => setSubmitted(false), 3000); } catch (e) {}
    setSubmitting(false);
  };

  const loadTips = async () => {
    try { const res = await api.getSafetyTips(); setTips(res.data || []); setShowTips(true); } catch (e) {}
  };

  const safetyCards = [
    { icon: Shield, title: 'Report a User', desc: 'Report inappropriate behavior, harassment, or suspicious accounts.', color: 'text-red-400', action: () => setShowReport(true) },
    { icon: Lock, title: 'Block & Privacy', desc: 'Block users, manage visibility, and control who can contact you.', color: 'text-amber-400', action: () => router.push('/settings') },
    { icon: Eye, title: 'Verification', desc: 'Verify your identity to build trust and get the verified badge.', color: 'text-lavender-400', action: () => router.push('/profile') },
    { icon: AlertTriangle, title: 'Scam Prevention', desc: 'Learn to recognize red flags and protect yourself from scams.', color: 'text-orange-400', action: loadTips },
    { icon: Phone, title: 'Emergency Resources', desc: 'Quick access to local emergency contacts and helplines.', color: 'text-emerald-400', action: () => setShowDialerConfirm(true) },
    { icon: FileText, title: 'Community Guidelines', desc: 'Read our rules for respectful and safe interactions.', color: 'text-sky-400', action: loadTips },
    { icon: Heart, title: 'Consent & Boundaries', desc: 'Understand consent-first design in messaging and media.', color: 'text-pink-400', action: loadTips },
    { icon: Users, title: 'Meeting Safely', desc: 'Tips for first dates and meeting matches in person.', color: 'text-violet-400', action: loadTips },
  ];
  return (
    <ErrorBoundary>
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2 dark:text-white"><Shield className="w-5 h-5 text-emerald-400" /> Safety Center</h1>
        <p className="text-sm text-text-muted mt-1 dark:text-gray-400">Your safety is our top priority. Learn how to stay safe on Miamo.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {safetyCards.map((item) => (
          <Card key={item.title} hover className="p-5 cursor-pointer" onClick={item.action}>
            <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
            <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
            <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
          </Card>
        ))}
      </div>

      {submitted && (
        <Card className="p-4 border-emerald-500/20">
          <p className="text-sm text-emerald-400">Report submitted successfully. Our team will review it.</p>
        </Card>
      )}

      {showReport && (
        <Card className="p-5 border-red-500/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Report a User</h3>
            <button onClick={() => setShowReport(false)}><X className="w-4 h-4 text-text-muted" /></button>
          </div>
          <div className="space-y-3">
            <select value={reportData.reason} onChange={e => setReportData(d => ({...d, reason: e.target.value}))} className="input-premium w-full text-sm">
              <option value="">Select reason…</option>
              <option value="harassment">Harassment</option>
              <option value="spam">Spam or fake profile</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="scam">Scam or fraud</option>
              <option value="other">Other</option>
            </select>
            <textarea value={reportData.details} onChange={e => setReportData(d => ({...d, details: e.target.value}))} placeholder="Additional details (optional)…"
              className="input-premium w-full text-sm resize-none" rows={3} />
            <Button size="sm" onClick={handleReport} disabled={submitting || !reportData.reason}><Send className="w-3 h-3" /> {submitting ? 'Submitting…' : 'Submit Report'}</Button>
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
                <span className="text-lavender-400 mt-0.5">•</span>
                <span>{tip.title || tip.content || tip}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5 border-emerald-500/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">In immediate danger?</h3>
            <p className="text-xs text-text-muted mt-1">If you're in immediate danger, contact your local emergency services. In the US, call 911.</p>
          </div>
        </div>
      </Card>

      {showDialerConfirm && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowDialerConfirm(false)} />
          <div className="fixed inset-x-4 top-[30%] max-w-sm mx-auto bg-miamo-card border border-border rounded-2xl shadow-2xl z-50 p-6 text-center">
            <Phone className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold mb-1">Open Phone Dialer?</h3>
            <p className="text-xs text-text-muted mb-4">This will open the phone dialer to call emergency services (112).</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowDialerConfirm(false)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={() => { setShowDialerConfirm(false); window.open('tel:112'); }}>Call 112</Button>
            </div>
          </div>
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}
