import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Single source of truth for the wordmark (previously hand-rolled three times
 * in Navbar, Footer and Layout).
 */
export default function Logo({ size = 'md', className = '', iconClassName = '' }) {
  const isSm = size === 'sm';
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'grid place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary',
          isSm ? 'size-6' : 'size-7',
          iconClassName,
        )}
      >
        <Sparkles className={isSm ? 'size-3' : 'size-3.5'} />
      </span>
      <span
        className={cn(
          'font-semibold tracking-tight text-foreground',
          isSm ? 'text-sm' : 'text-[17px]',
        )}
      >
        Quick<span className="text-primary">AI</span>
      </span>
    </span>
  );
}
