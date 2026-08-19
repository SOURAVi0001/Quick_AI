import { CalendarClock } from 'lucide-react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import StatusBadge from '../StatusBadge';
import { dueLabel, formatDate } from '@/lib/jobTracker/utils';

export default function UpcomingActions({ items = [], loading = false, onOpen }) {
  return (
    <Card variant="panel" className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <p className="text-h3 text-foreground">Upcoming</p>
        <p className="mt-1 text-xs text-subtle-foreground">
          Interviews, assessments and follow-ups on deck.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CalendarClock
            className="mx-auto mb-3 size-5 text-subtle-foreground"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          <p className="mt-1 text-xs text-subtle-foreground">
            Add a next action to an application to see it here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpen?.(a)}
                className="flex w-full items-start justify-between gap-3 px-5 py-3.5 text-left outline-none transition-colors hover:bg-surface-2/50 focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {a.company} — {a.nextAction}
                  </span>
                  <span className="mt-0.5 block text-xs text-subtle-foreground">
                    {formatDate(a.nextActionDate)} · {a.role}
                  </span>
                </span>
                <StatusBadge tone={dueLabel(a.nextActionDate) === 'Overdue' ? 'ember' : 'accent'}>
                  {dueLabel(a.nextActionDate)}
                </StatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
