import { useEffect, useState } from 'react';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import ErrorState from '../ErrorState';
import { relativeTime } from '@/lib/jobTracker/utils';

const PER_PAGE = 3;

export default function ActivityHistory({ activity = [], loading = false, error, onRetry }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(activity.length / PER_PAGE));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  if (error) {
    return (
      <ErrorState
        title="Activity failed to load"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  const items = activity.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Card variant="panel" className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <p className="text-h3 text-foreground">Recent activity</p>
        <p className="mt-1 text-xs text-subtle-foreground">
          Everything that changed across your applications.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <History className="mx-auto mb-3 size-5 text-subtle-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </div>
      ) : (
        <>
          <ol className="relative divide-y divide-border">
            {items.map((entry) => (
              <li key={entry.id} className="animate-reveal flex items-start gap-4 px-5 py-4">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-linear-to-b from-accent to-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{entry.company}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{entry.message}</p>
                  <p className="mt-1 text-xs text-subtle-foreground">{relativeTime(entry.at)}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <p className="text-xs text-subtle-foreground" aria-live="polite">
              Page {page} of {totalPages}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
