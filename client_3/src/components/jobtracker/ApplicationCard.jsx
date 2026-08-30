import { ArrowUpRight, CalendarClock, FileText, MapPin } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import StatusBadge from '../StatusBadge';
import { STATUS_TONE } from '@/lib/jobTracker/mockData';
import { formatDate, relativeTime } from '@/lib/jobTracker/utils';

export default function ApplicationCard({ application, onOpen }) {
  const a = application;
  return (
    <Card variant="interactive" className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-xl text-foreground">{a.company}</h3>
            <StatusBadge tone={STATUS_TONE[a.status] || 'neutral'} dot>
              {a.status}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm font-medium text-foreground/90">{a.role}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle-foreground">
            {a.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3" aria-hidden="true" />
                {a.location}
              </span>
            )}
            {a.employmentType && <span aria-hidden="true">·</span>}
            {a.employmentType && <span>{a.employmentType}</span>}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>Applied {formatDate(a.appliedDate)}</span>
            {a.resumeUsed && (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-3" aria-hidden="true" />
                {a.resumeUsed}
              </span>
            )}
            <span className="text-subtle-foreground">Updated {relativeTime(a.updatedAt)}</span>
          </div>

          {a.nextAction && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-md border border-accent/20 bg-accent/[0.07] px-2.5 py-1.5 text-xs text-accent">
              <CalendarClock className="size-3" aria-hidden="true" />
              Next: {a.nextAction}
              {a.nextActionDate && (
                <span className="text-accent/70">— {formatDate(a.nextActionDate)}</span>
              )}
            </p>
          )}
        </div>

        <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOpen(a)}>
          View <ArrowUpRight className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}
