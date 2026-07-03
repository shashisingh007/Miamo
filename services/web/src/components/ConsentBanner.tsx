'use client';

import { useEffect, useState } from 'react';
import { detectRegion, readConsent } from '@/lib/track/consent';
import { setConsent } from '@/lib/track';

/**
 * Opt-in consent banner. Default state: all OFF. Shown until the user makes
 * any choice (Accept/Reject/Customize). DPDPA-friendly: India visitors get
 * the full opt-in flavor; EU gets the GDPR phrasing.
 *
 * Hidden entirely when NEXT_PUBLIC_TRACKING_ENABLED !== '1'.
 */
export function ConsentBanner() {
  const enabled = process.env.NEXT_PUBLIC_TRACKING_ENABLED === '1';
  const [region, setRegion] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setRegion(detectRegion());
    const c = readConsent();
    setAnalytics(c.analytics);
    setPersonalization(c.personalization);
    setMarketing(c.marketing);
    setVisible(!c.ts); // never decided
  }, [enabled]);

  if (!enabled || !visible) return null;

  const acceptAll = () => {
    setConsent({ analytics: true, personalization: true, marketing: false });
    setVisible(false);
  };
  const rejectAll = () => {
    setConsent({ analytics: false, personalization: false, marketing: false });
    setVisible(false);
  };
  const saveCustom = () => {
    setConsent({ analytics, personalization, marketing });
    setVisible(false);
  };

  const isIN = region === 'IN';
  const isEU = region === 'EU';

  return (
    <div
      role="dialog"
      aria-label="Privacy preferences"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-2xl bg-white p-4 shadow-2xl ring-1 ring-rose-100 sm:m-4 sm:rounded-2xl dark:bg-neutral-900 dark:ring-neutral-800"
    >
      <p className="text-sm text-neutral-800 dark:text-neutral-200">
        {isIN
          ? 'Miamo uses essential cookies to keep you signed in. With your consent we also collect anonymous usage analytics to improve matches. You can change this any time in Settings → Privacy.'
          : isEU
            ? 'We use a small set of cookies. Essential cookies are required for the app to work. Analytics and personalization are off until you opt in. You can withdraw consent at any time.'
            : 'Help us improve Miamo by allowing anonymous usage analytics and personalization. Everything is opt-in and you can change it any time.'}
      </p>
      {expanded && (
        <div className="mt-3 grid gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <label className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 dark:bg-neutral-800">
            <span>Analytics (anonymous usage)</span>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 dark:bg-neutral-800">
            <span>Personalization (smarter matches)</span>
            <input
              type="checkbox"
              checked={personalization}
              onChange={(e) => setPersonalization(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 dark:bg-neutral-800">
            <span>Marketing (currently unused)</span>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={acceptAll}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={rejectAll}
          className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100"
        >
          Reject non-essential
        </button>
        {expanded ? (
          <button
            type="button"
            onClick={saveCustom}
            className="rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200 dark:bg-neutral-800 dark:text-rose-300"
          >
            Save choices
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full bg-transparent px-3 py-2 text-sm text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-400"
          >
            Customize
          </button>
        )}
      </div>
    </div>
  );
}
