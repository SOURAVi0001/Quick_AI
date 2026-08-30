import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { STATUS_TONE } from '@/lib/jobTracker/mockData';
import { cn } from '@/lib/utils';

const barTone = {
  neutral: 'bg-muted-foreground/40',
  primary: 'bg-primary',
  accent: 'bg-accent',
  warning: 'bg-warning',
  success: 'bg-success',
  ember: 'bg-ember',
};

export default function ApplicationPipeline({ pipeline, loading = false, activeStatus, onSelect }) {
  const max = Math.max(1, ...pipeline.map((p) => p.count));

  return (
    <Card variant="panel" className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <p className="text-h3 text-foreground">Pipeline</p>
        <p className="mt-1 text-xs text-subtle-foreground">
          Where every application currently stands — select a stage to filter the list.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4 sm:p-5 xl:grid-cols-8">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : pipeline.map(({ status, count }) => {
              const tone = STATUS_TONE[status] || 'neutral';
              const selected = activeStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect?.(selected ? 'all' : status)}
                  className={cn(
                    'group flex flex-col justify-between gap-3 rounded-md border p-3 text-left outline-none transition-[transform,border-color,background-color] duration-250 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98]',
                    selected
                      ? 'border-primary/50 bg-primary/[0.09]'
                      : 'border-border bg-surface-2/50 hover:-translate-y-0.5 hover:border-border-strong',
                  )}
                >
                  <span className="text-eyebrow block leading-snug text-subtle-foreground">
                    {status}
                  </span>
                  <span className="font-display text-2xl leading-none text-foreground">
                    {count}
                  </span>
                  <span className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
                    <span
                      className={cn('block h-full rounded-full', barTone[tone])}
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </span>
                </button>
              );
            })}
      </div>
    </Card>
  );
}
