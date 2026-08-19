import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lightweight styled native select — keyboard/mobile friendly and matches the
 * Input primitive's surface treatment.
 */
const Select = React.forwardRef(({ className, containerClassName, children, ...props }, ref) => (
  <span className={cn('relative block w-full', containerClassName)}>
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full appearance-none rounded-md border border-input/70 bg-surface-2/60 px-3.5 py-2 pr-10 text-sm text-foreground transition-[border-color,box-shadow,background-color] duration-250 hover:border-border-strong hover:bg-surface-2 focus-visible:border-accent/60 focus-visible:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
      aria-hidden="true"
    />
  </span>
));
Select.displayName = 'Select';

export { Select };
