import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200',
        active
          ? 'bg-lavender-400/15 text-lavender-400 border border-lavender-400/30'
          : 'bg-miamo-elevated text-text-muted border border-transparent hover:text-text-secondary hover:border-border'
      )}
    >
      {label}
    </button>
  );
}
