'use client';

import { cn, getInitials } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  verified?: boolean;
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({ src, name, size = 'md', online, verified, className }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className={cn('relative shrink-0', className)}>
      <div className={cn(
        'rounded-full overflow-hidden bg-gradient-to-br from-lavender-400/30 to-violet-deep/30 flex items-center justify-center font-semibold text-lavender-300',
        sizes[size]
      )}>
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-miamo-bg rounded-full" />
      )}
      {verified && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-lavender-400 rounded-full flex items-center justify-center border border-miamo-bg">
          <Shield className="w-2.5 h-2.5 text-gray-900" />
        </div>
      )}
    </div>
  );
}
