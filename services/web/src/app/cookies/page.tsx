import LegalShell from '@/components/legal/legal-shell';

export const metadata = { title: 'Cookie Policy — Miamo' };

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" updated="May 2026" draft>
      <p>
        Miamo uses a small number of cookies and similar local-storage keys to keep you signed in,
        remember your theme, and measure aggregate usage. We do not use third-party advertising
        cookies.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Essential</h2>
      <p>
        Session token, CSRF token, and persisted auth state. Without these you would be signed
        out on every page reload.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Preferences</h2>
      <p>
        Theme, sidebar state, and last-viewed tab. Stored on your device only.
      </p>
      <h2 className="text-lg font-semibold text-text-primary mt-6">Analytics</h2>
      <p>
        Anonymous, aggregated usage (e.g. how many people opened the discover feed today). No
        cross-site tracking.
      </p>
      <p className="text-xs text-text-muted pt-4">
        You can clear all Miamo cookies from your browser settings. Doing so signs you out.
      </p>
    </LegalShell>
  );
}
