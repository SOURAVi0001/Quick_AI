/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Layered surface system: each variant is a different depth in the
 * environment rather than "a white rectangle on black".
 */
const cardVariants = cva('relative rounded-lg text-card-foreground', {
  variants: {
    variant: {
      default: 'border border-border bg-card/70 shadow-card backdrop-blur-xl',
      panel: 'border border-border bg-surface-1/60 shadow-card backdrop-blur-xl',
      inset: 'border border-border/60 bg-surface-2/70',
      result: 'border border-primary/20 bg-surface-1/70 shadow-lift backdrop-blur-xl',
      interactive:
        'tactile border border-border bg-card/70 shadow-card backdrop-blur-xl hover:border-primary/35 hover:shadow-glow',
      glass: 'border border-border/70 bg-surface-1/40 backdrop-blur-2xl',
      dashed: 'border border-dashed border-border-strong bg-surface-1/25',
      ghost: 'border border-transparent bg-transparent',
    },
  },
  defaultVariants: { variant: 'default' },
});

const Card = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-h3 text-foreground', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm leading-relaxed text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 sm:p-6', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-3 border-t border-border px-5 py-4 sm:px-6', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
