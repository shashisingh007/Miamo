import LegalShell from '@/components/legal/legal-shell';

export const metadata = { title: 'Terms of Service — Miamo' };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="May 2026" draft>
      <p>
        These Terms govern your use of Miamo. By creating an account you agree to behave kindly,
        keep your profile authentic, and respect every other person on the platform. We may suspend
        accounts that harass, impersonate, or otherwise harm the community.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Your account</h2>
      <p>
        You must be 18 or older. Keep your credentials private. You are responsible for activity
        under your account.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Content</h2>
      <p>
        You own what you post. You grant Miamo a limited licence to display it within the product
        so others can see your profile, matches, and stories. We may remove content that violates
        our Community Guidelines.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Subscriptions</h2>
      <p>
        Premium plans renew automatically until cancelled. You can cancel any time from Settings →
        Billing. Refunds follow your local consumer-protection laws.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Termination</h2>
      <p>
        You can delete your account at any time. We may terminate accounts that breach these Terms
        or applicable law.
      </p>
      <p className="text-xs text-text-muted pt-4">
        Questions? Reach the team at <a href="mailto:hello@miamo.app" className="text-rose">hello@miamo.app</a>.
      </p>
    </LegalShell>
  );
}
