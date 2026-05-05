import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400/50',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-lavender-400 to-violet-deep text-white shadow-glow-sm hover:shadow-glow-md',
        secondary: 'bg-miamo-elevated text-text-primary border border-border hover:border-lavender-400/30 hover:bg-miamo-soft',
        ghost: 'text-text-secondary hover:text-text-primary hover:bg-lavender-400/10',
        outline: 'border border-border text-text-secondary hover:border-lavender-400/50 hover:text-lavender-400',
        danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
        success: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-lg',
        md: 'h-10 px-5 text-sm rounded-xl',
        lg: 'h-12 px-8 text-base rounded-xl',
        icon: 'h-10 w-10 rounded-xl',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
