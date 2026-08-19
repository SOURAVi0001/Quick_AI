import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { relativeTime } from '@/lib/jobTracker/utils';

const PER_PAGE = 3;

/**
 * Paginated timeline of insight snapshots — same architecture as the tracker's
 * activity history (3 per page, local paging).
 */
export default function InsightHistory({ snapshots = [], loading = false }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(snapshots.length / PER_PAGE));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const items = snapshots.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Card variant="panel" className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <p className="text-h3 text-foreground">Insight history</p>
        <p className="mt-1 text-xs text-subtle-foreground">
          Every recalculation, newest first.
        </p>
      </div>

      {loading && snapshots.length === 0 ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: PER_PAGE }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Sparkles className="mx-auto mb-3 size-5 text-subtle-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No snapshots yet.</p>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-border">
            {items.map((snap, i) => (
              <li key={snap.id} className="animate-reveal px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {snap.applicationsAnalyzed} applications analyzed
                  </p>
                  <p className="text-xs text-subtle-foreground">
                    {relativeTime(snap.generatedAt)}
                    {page === 1 && i === 0 ? ' · current' : ''}
                  </p>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {snap.summary}
                </p>
                {!snap.insufficient && (
                  <p className="mt-1.5 text-xs tabular-nums text-subtle-foreground">
                    Interview {snap.interviewRate}% · Offer {snap.offerRate}% · Gaps{' '}
                    {snap.gaps.length}
                  </p>
                )}
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
