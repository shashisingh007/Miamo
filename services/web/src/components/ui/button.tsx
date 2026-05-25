import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
 'inline-flex items-center justify-center font-semibold transition-all duration-300 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none',
 {
 variants: {
 variant: {
 default: 'btn-primary shimmer-glass',
 secondary: 'btn-glass',
 ghost: 'btn-ghost',
 outline: 'btn-outline',
 danger: 'bg-red-500 text-white rounded-2xl shadow-[0_4px_16px_rgba(239,68,68,0.22)] hover:bg-red-600 hover:shadow-[0_8px_24px_rgba(239,68,68,0.32)] hover:-translate-y-0.5',
    link: 'text-rose hover:text-rose-dark underline-offset-4 hover:underline p-0 h-auto font-medium',
 },
 size: {
 sm: 'h-9 px-4 text-[12px] rounded-xl',
 default: 'h-11 px-6 text-sm rounded-2xl',
 lg: 'h-12 px-8 text-sm rounded-2xl',
 xl: 'h-14 px-10 text-base rounded-2xl',
 icon: 'h-10 w-10 rounded-xl',
 'icon-sm': 'h-8 w-8 rounded-lg text-xs',
 },
 },
 defaultVariants: {
 variant: 'default',
 size: 'default',
 },
 }
);

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 loading?: boolean;
}

/**
 * CVA-based button with 6 variants (default/secondary/ghost/outline/danger/link)
 * and 6 size presets (sm/default/lg/xl/icon/icon-sm).
 *
 * Supports a `loading` prop that shows a spinner and disables interaction.
 * Uses `active:scale-[0.97]` for tactile press feedback.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
 return (
 <button
 className={cn(buttonVariants({ variant, size }), className)}
 ref={ref}
 disabled={disabled || loading}
 {...props}
 >
 {loading && (
 <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
 </svg>
 )}
 {children}
 </button>
 );
 }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
