'use client';

import Link from 'next/link';
import { MiamoWordmark } from '@/components/ui/miamo-logo';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Generic placeholder for marketing pages that exist as nav targets but
// haven't been built out yet (e.g., Careers, Press, Blog). Keeps the
// footer honest by routing to a real page instead of href="#".
export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-hidden flex flex-col">
      <div
        aria-hidden
        className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-50 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,120,86,0.18) 0%, rgba(232,180,160,0.10) 40%, transparent 70%)' }}
      />
      <header className="relative z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Miamo home" className="flex items-center">
            <MiamoWordmark height={24} animated={false} />
          </Link>
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Back to home
          </Link>
        </div>
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pt-6 pb-20">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-soft border border-rose-main/20 mb-6">
            <Sparkles className="w-6 h-6 text-rose" />
          </div>
          <h1 className="font-brand font-semibold text-3xl sm:text-4xl text-text-primary leading-tight mb-3">
            We&apos;re working on this.
          </h1>
          <p className="text-text-secondary mb-8 leading-relaxed">
            This page is on the way. In the meantime, the app itself is alive and well — sign in
            or create an account to start meeting people.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Create an account <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
