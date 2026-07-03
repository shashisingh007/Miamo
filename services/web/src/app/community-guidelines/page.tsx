import LegalShell from '@/components/legal/legal-shell';

export const metadata = { title: 'Community Guidelines — Miamo' };

export default function CommunityGuidelinesPage() {
  return (
    <LegalShell title="Community Guidelines" updated="May 2026" draft>
      <p>
        Miamo only works if every person on it feels safe to be themselves. These are the
        non-negotiables.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Be real</h2>
      <p>Use your own photos. Use your real age. Don&apos;t impersonate anyone.</p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Be kind</h2>
      <p>No harassment, hate speech, threats, or coordinated targeting. Disagreement is fine; cruelty is not.</p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Be safe</h2>
      <p>
        No nudity in public profile photos. No solicitation. No promotion of self-harm. We work
        with crisis-support providers if you reach out for help.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">If something is wrong</h2>
      <p>
        Use the Report button on any profile, message, or post. Reports are reviewed by humans
        and acted on within 24 hours for high-severity issues.
      </p>
    </LegalShell>
  );
}
