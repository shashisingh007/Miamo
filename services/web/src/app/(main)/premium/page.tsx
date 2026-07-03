'use client';

import { Check, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// v1 launch policy: every feature is free for everyone. There is no paid tier
// during launch, so the historical Free / Premium / Platinum grid is replaced
// by a single "You have full access" card. When we introduce billing later,
// re-instate the plan grid + Razorpay flow from the git history.
const ALL_FEATURES: string[] = [
  'Unlimited likes',
  'See who liked you',
  'Advanced filters (age, distance, intent)',
  'Priority in Discover',
  'Unlimited Beats',
  'Read receipts',
  'AI Match insights + Why-this-match',
  'Undo pass',
  'Miamo Move v2 (behaviour-based openers)',
  'Family Brief (DTM parent-shareable bio)',
  'Voice Fingerprint reveal',
  'Weekly Top 10',
];

export default function PremiumPage() {
  useTrackPageView('premium');
  useTrackScrollDepth('premium');

  return (
    <ErrorBoundary>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4">
            <Image
              src="/assets/logo.svg"
              alt="Miamo"
              width={56}
              height={56}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold">Everything's on us — for launch</h1>
          <p className="text-sm text-text-muted mt-2 max-w-lg mx-auto">
            Every Miamo feature is unlocked and free during our launch window.
            No paywall, no upsells, no limits. Just meet people.
          </p>
        </div>

        <Card className="p-6 border-rose-main/40 shadow-glow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-soft flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-rose-main" />
            </div>
            <div>
              <h2 className="text-lg font-bold">You have full access</h2>
              <p className="text-xs text-text-muted">
                Included on every account — no upgrade needed.
              </p>
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-4">
            {ALL_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 text-sm text-text-secondary"
              >
                <Check className="w-4 h-4 text-rose-main shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-center text-xs text-text-muted">
          We&apos;ll add paid plans later. When we do, we&apos;ll tell you clearly —
          and your existing access won&apos;t suddenly disappear.
        </p>
      </div>
    </ErrorBoundary>
  );
}
