/**
 * Phase 5 nudge formatter — turns a `DiscoverPolicy` into UI props the
 * web layer can render without knowing the policy internals.
 *
 * Three nudge templates: 'easy_reply' (recover from ghostedSelf),
 * 'who_liked_you' (recover from zeroAction streak), and null (no nudge).
 */
import type { DiscoverPolicy } from './discoverPolicy';

export type NudgeUIProps = {
  show: boolean;
  variant: 'easy_reply' | 'who_liked_you' | null;
  headline: string;
  body: string;
  cta: { label: string; href: string };
  /** Telemetry tag so the impression can be attributed back. */
  source: 'discover_policy';
};

const TEMPLATES: Record<NonNullable<NudgeUIProps['variant']>, Omit<NudgeUIProps, 'show' | 'variant' | 'source'>> = {
  easy_reply: {
    headline: 'Pick up where you left off',
    body: 'You have unread messages — a quick reply keeps a conversation alive.',
    cta: { label: 'Open inbox', href: '/messages' },
  },
  who_liked_you: {
    headline: 'See who already liked you',
    body: 'A reciprocal swipe is twice as likely to become a match.',
    cta: { label: 'View likes', href: '/likes' },
  },
};

export function formatNudge(policy: DiscoverPolicy): NudgeUIProps {
  const variant = policy.injectGentleNudge;
  if (!variant) {
    return {
      show: false, variant: null, headline: '', body: '',
      cta: { label: '', href: '' }, source: 'discover_policy',
    };
  }
  const tpl = TEMPLATES[variant];
  return { show: true, variant, ...tpl, source: 'discover_policy' };
}
