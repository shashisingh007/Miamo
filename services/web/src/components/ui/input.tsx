import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'glass';
}

/**
 * Form input with optional label, error message, leading icon, and glass variant.
 * Focus ring uses pink-200 accent. Error state changes border to red.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type, variant = 'default', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-700 tracking-wide">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-400 transition-colors duration-200">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'w-full rounded-xl px-4 py-3 text-gray-800 text-sm',
              'placeholder:text-gray-400',
              'transition-all duration-300 ease-out',
              'focus:outline-none',
              variant === 'glass'
                ? 'bg-white/60 backdrop-blur-md border border-pink-100/60 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/30 shadow-[0_2px_12px_rgba(236,64,122,0.04)]'
                : 'bg-white/80 border border-gray-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/30 hover:border-pink-200/60 shadow-sm',
              icon && 'pl-11',
              error && 'border-red-300 focus:border-red-400 focus:ring-red-200/30',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 font-medium flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
