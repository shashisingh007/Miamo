import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div className={cn('card-premium', hover && 'card-hover', className)} {...props}>
      {children}
    </div>
  );
}
