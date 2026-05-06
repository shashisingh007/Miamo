import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-lavender-400/10 text-lavender-400',
        success: 'bg-emerald-500/10 text-emerald-400',
        warning: 'bg-amber-500/10 text-amber-400',
        danger: 'bg-red-500/10 text-red-400',
        info: 'bg-sky-500/10 text-sky-400',
        muted: 'bg-miamo-elevated text-text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props}>{children}</span>;
}
