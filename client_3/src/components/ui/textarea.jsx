import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[110px] w-full rounded-md border border-input/70 bg-surface-2/60 px-3.5 py-3 text-sm leading-relaxed text-foreground transition-[border-color,box-shadow,background-color] duration-250 placeholder:text-subtle-foreground hover:border-border-strong hover:bg-surface-2 focus-visible:border-accent/60 focus-visible:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
