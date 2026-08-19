import { cn } from '@/lib/utils';

/**
 * Editorial page header: eyebrow rule, serif display title, optional
 * icon plate and action slot. Deliberately asymmetric on wide screens.
 */
export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <header className={cn('animate-reveal relative mb-10', className)}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {(eyebrow || Icon) && (
            <div className="mb-4 flex items-center gap-3">
              {Icon && (
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary)/0.6)]">
                  <Icon className="size-4" />
                </span>
              )}
              {eyebrow && (
                <span className="text-eyebrow flex items-center gap-3 text-accent/90">
                  {eyebrow}
                  <span className="hairline-glow hidden h-px w-16 sm:block" />
                </span>
              )}
            </div>
          )}
          <h1 className="text-h1 text-balance text-foreground">{title}</h1>
          {description && (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      <div className="mt-8 h-px w-full bg-linear-to-r from-border-strong/80 via-border/60 to-transparent" />
    </header>
  );
}

/** Smaller in-page section marker used between workspace zones. */
export function SectionHeader({ eyebrow, title, description, action, className = '' }) {
  return (
    <div className={cn('mb-5 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-eyebrow mb-2 text-subtle-foreground">{eyebrow}</p>}
        <h2 className="text-h2 text-foreground">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
