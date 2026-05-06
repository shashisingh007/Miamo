'use client';

import { AnimatedMiamoLogo } from '@/components/ui/miamo-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-miamo-bg flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-lavender-400/5 via-transparent to-lavender-600/5" />
      <div className="relative z-10 mb-8">
        <AnimatedMiamoLogo size={44} showWordmark={true} animated={true} />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
