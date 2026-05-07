import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-300 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/40 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'btn-primary text-white shadow-[0_4px_20px_rgba(236,64,122,0.3)] hover:shadow-[0_8px_30px_rgba(236,64,122,0.4)] hover:-translate-y-0.5',
        secondary: 'bg-white/80 backdrop-blur-md text-gray-700 border border-pink-100 shadow-sm hover:border-pink-300 hover:shadow-md hover:-translate-y-0.5',
        ghost: 'text-gray-600 hover:text-pink-600 hover:bg-pink-50/80 backdrop-blur-sm',
        outline: 'border-2 border-pink-200 text-pink-600 hover:border-pink-400 hover:bg-pink-50 hover:shadow-[0_4px_15px_rgba(236,64,122,0.1)] hover:-translate-y-0.5',
        danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200',
        success: 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs rounded-xl',
        md: 'h-10 px-5 text-sm rounded-xl',
        lg: 'h-12 px-8 text-base rounded-2xl',
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
