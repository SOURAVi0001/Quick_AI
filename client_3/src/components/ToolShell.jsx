import PageHeader from './PageHeader';
import AnimatedBackground from './AnimatedBackground';
import { cn } from '@/lib/utils';

const widths = {
  narrow: 'max-w-4xl',
  wide: 'max-w-6xl',
  full: 'max-w-7xl',
};

/**
 * Composed workspace shell for every tool page: page atmosphere, editorial
 * header, then the page's own interaction / result / history zones.
 */
export default function ToolShell({
  icon,
  eyebrow,
  title,
  description,
  action,
  width = 'wide',
  children,
  className = '',
}) {
  return (
    <div className="relative">
      <AnimatedBackground
        stars={34}
        variant="tool"
        className="-inset-x-8 -top-16 bottom-auto h-[32rem]"
      />
      <div
        className={cn(
          'animate-rise relative mx-auto w-full pb-24',
          widths[width] || widths.wide,
          className,
        )}
      >
        <PageHeader
          icon={icon}
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={action}
        />
        {children}
      </div>
    </div>
  );
}

export function ResultRegion({ label = 'Generated result', children, className = '' }) {
  return (
    <section aria-live="polite" aria-label={label} className={cn('w-full min-w-0', className)}>
      {children}
    </section>
  );
}

/** Zone separator with a small eyebrow, used between workspace bands. */
export function Zone({ eyebrow, children, className = '' }) {
  return (
    <section className={cn('mt-14 w-full min-w-0', className)}>
      {eyebrow && (
        <div className="mb-5 flex items-center gap-4">
          <p className="text-eyebrow text-subtle-foreground">{eyebrow}</p>
          <span className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
        </div>
      )}
      {children}
    </section>
  );
}
