'use client';

import Link from 'next/link';
import { MiamoWordmark } from '@/components/ui/miamo-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-hidden">
      {/* Single soft copper bloom — no orbs, no floating hearts */}
      <div
        aria-hidden
        className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-50 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(201,120,86,0.18) 0%, rgba(232,180,160,0.10) 40%, transparent 70%)',
        }}
      />

      {/* Minimal top bar */}
      <header className="relative z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Miamo home" className="flex items-center">
            <MiamoWordmark height={24} animated={true} />
          </Link>
          <Link
            href="/"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Back to home
          </Link>
        </div>
      </header>

      {/* Centered content */}
      <main className="relative z-10 flex items-center justify-center px-6 pt-6 pb-20 min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
