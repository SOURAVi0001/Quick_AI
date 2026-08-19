import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Contextual loading surface: a titled progress line plus a skeleton
 * that mirrors the shape of the result it replaces. Never a bare spinner.
 */
export default function LoadingState({
  title = 'Working…',
  description,
  lines = 4,
  className = '',
}) {
  return (
    <Card
      variant="panel"
      aria-busy="true"
      className={cn('overflow-hidden', className)}
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <p className="text-h3 text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-subtle-foreground">{description}</p>
        )}
        <div className="mt-3.5 h-[3px] w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-1/3 rounded-full bg-linear-to-r from-transparent via-primary to-transparent motion-safe:animate-[sweep_1.6s_ease-in-out_infinite]" />
        </div>
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3.5"
            style={{ width: `${100 - (i % 3) * 14}%` }}
          />
        ))}
      </div>
      <style>{`@keyframes sweep{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}`}</style>
    </Card>
  );
}
