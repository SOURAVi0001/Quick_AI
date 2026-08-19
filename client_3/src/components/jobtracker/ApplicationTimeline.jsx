import { STATUS_TONE } from '@/lib/jobTracker/mockData';
import { formatLongDate } from '@/lib/jobTracker/utils';
import { cn } from '@/lib/utils';

const dotTone = {
  neutral: 'bg-muted-foreground/50',
  primary: 'bg-primary',
  accent: 'bg-accent',
  warning: 'bg-warning',
  success: 'bg-success',
  ember: 'bg-ember',
};

export default function ApplicationTimeline({ timeline = [] }) {
  if (!timeline.length) {
    return <p className="text-sm text-subtle-foreground">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative ml-1 border-l border-border pl-6">
      {timeline.map((entry, i) => (
        <li key={entry.id || `${entry.label}-${i}`} className="relative pb-6 last:pb-0">
          <span
            className={cn(
              'absolute -left-[1.9rem] top-1 size-2.5 rounded-full ring-4 ring-background',
              dotTone[STATUS_TONE[entry.label] || 'neutral'],
            )}
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">{entry.label}</p>
          <p className="mt-0.5 text-xs text-subtle-foreground">{formatLongDate(entry.at)}</p>
        </li>
      ))}
    </ol>
  );
}
