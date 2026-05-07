'use client';

import { AnimatedMiamoLogo } from '@/components/ui/miamo-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-miamo-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-rose-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Floating hearts */}
      <div className="floating-hearts">
        <span className="heart">💕</span>
        <span className="heart">💗</span>
        <span className="heart">💖</span>
        <span className="heart">💘</span>
        <span className="heart">💝</span>
        <span className="heart">💕</span>
        <span className="heart">💗</span>
        <span className="heart">💖</span>
      </div>

      <div className="relative z-10 mb-6">
        <AnimatedMiamoLogo size={48} showWordmark={false} animated={true} />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
