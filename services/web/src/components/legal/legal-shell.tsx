'use client';

import Link from 'next/link';
import { MiamoWordmark } from '@/components/ui/miamo-logo';

// Shared chrome for public-marketing routes (terms, privacy, etc.) so they
// match the (auth) layout look without inheriting auth-form padding.
export default function PublicLegalShell({
  title,
  updated,
  draft,
  children,
}: {
  title: string;
  updated: string;
  draft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-hidden">
      <div
        aria-hidden
        className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-50 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,120,86,0.18) 0%, rgba(232,180,160,0.10) 40%, transparent 70%)' }}
      />
      <header className="relative z-20">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Miamo home" className="flex items-center">
            <MiamoWordmark height={24} animated={false} />
          </Link>
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Back to home
          </Link>
        </div>
      </header>
      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-6 pb-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-brand font-semibold text-3xl sm:text-4xl text-text-primary leading-tight">{title}</h1>
            {draft && (
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold px-2 py-0.5 rounded-full bg-rose-soft text-rose border border-rose-main/20">
                Draft
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">Last updated {updated}</p>
        </div>
        <article className="prose prose-sm sm:prose-base max-w-none text-text-secondary space-y-5 leading-relaxed">
          {children}
        </article>
      </main>
    </div>
  );
}
