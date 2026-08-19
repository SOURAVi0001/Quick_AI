import { Card } from './ui/card';
import { cn } from '@/lib/utils';

/**
 * Intentional "awaiting result" surface — a lit plinth rather than an
 * empty white panel. Used by every tool page.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'dashed',
  className = '',
}) {
  return (
    <Card
      variant={variant}
      className={cn(
        'grain flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      {Icon && (
        <div className="relative mb-6 grid size-14 place-items-center rounded-full border border-border bg-surface-2/80 text-subtle-foreground">
          <span
            className="absolute inset-0 rounded-full ring-1 ring-inset ring-foreground/5"
            aria-hidden="true"
          />
          <Icon className="size-5" />
        </div>
      )}
      <h3 className="relative font-display text-2xl text-foreground">{title}</h3>
      {description && (
        <p className="relative mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="relative mt-7">{action}</div>}
    </Card>
  );
}
