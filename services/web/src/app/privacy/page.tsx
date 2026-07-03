import LegalShell from '@/components/legal/legal-shell';

export const metadata = { title: 'Privacy Policy — Miamo' };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="May 2026" draft>
      <p>
        Miamo is built around the idea that meeting someone should feel safe. This page explains
        what we collect, why, and how to control it.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">What we collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Account info you give us (email, name, age, photos, preferences)</li>
        <li>Activity on Miamo (matches, messages, likes — encrypted at rest)</li>
        <li>Device and session data needed to keep the service secure</li>
      </ul>
      <h2 className="text-lg font-semibold text-text-primary mt-6">How we use it</h2>
      <p>
        To match you with compatible people, deliver messages, prevent abuse, and improve the
        product. We never sell personal data to advertisers.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Your controls</h2>
      <p>
        Export, edit, or delete your data anytime from Settings → Privacy. Deletion removes your
        profile, messages, and matches within 30 days.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Contact</h2>
      <p>
        Privacy questions: <a href="mailto:privacy@miamo.app" className="text-rose">privacy@miamo.app</a>.
      </p>
    </LegalShell>
  );
}
