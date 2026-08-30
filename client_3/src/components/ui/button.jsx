/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Spinner from '../Spinner';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-[-0.01em] outline-none transition-[transform,box-shadow,background-color,border-color,color] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-linear-to-br from-accent to-primary text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:brightness-110',
        ivory: 'bg-foreground text-background hover:-translate-y-0.5 hover:bg-foreground/90',
        destructive: 'bg-destructive/90 text-destructive-foreground hover:brightness-110',
        outline:
          'border border-border-strong/70 bg-surface-1/40 text-foreground backdrop-blur-md hover:border-primary/40 hover:bg-surface-2/70',
        secondary: 'bg-surface-2 text-foreground hover:bg-surface-3',
        ghost: 'text-muted-foreground hover:bg-surface-2/80 hover:text-foreground',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-[13px]',
        lg: 'h-12 rounded-lg px-7 text-[15px]',
        pill: 'h-12 rounded-full px-8 text-[15px]',
        icon: 'h-9 w-9 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = React.forwardRef(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Spinner className="size-4" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
