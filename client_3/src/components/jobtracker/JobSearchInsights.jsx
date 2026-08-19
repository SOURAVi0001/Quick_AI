import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Info,
  Quote,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import ErrorState from '../ErrorState';
import EmptyState from '../EmptyState';
import { formatLongDate } from '@/lib/jobTracker/utils';

function Panel({ title, icon: Icon, hint, children, className = '' }) {
  return (
    <Card variant="panel" className={`overflow-hidden ${className}`}>
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-h3 text-foreground">{title}</p>
          {hint && <p className="mt-1 text-xs text-subtle-foreground">{hint}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

const NoSignal = ({ children }) => (
  <p className="text-sm text-subtle-foreground">{children}</p>
);

function CountRow({ label, count, unit }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="min-w-0 truncate text-sm text-foreground/90">{label}</span>
      <span className="text-meta shrink-0 tabular-nums text-subtle-foreground">
        {count} {unit}
      </span>
    </li>
  );
}

export default function JobSearchInsights({ insight, loading, error, onRefresh, onRetry }) {
  if (error) {
    return (
      <ErrorState
        title="Couldn't generate insights"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (loading && !insight) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No insights yet"
        description="Generate insights from your application history to see where you're converting."
      />
    );
  }

  const refreshBar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-subtle-foreground">
        {insight.applicationsAnalyzed} applications analyzed · {insight.closedOutcomes} closed
        outcomes · generated {formatLongDate(insight.generatedAt)}
      </p>
      <Button variant="outline" size="sm" onClick={onRefresh} loading={loading}>
        <RefreshCw className="size-4" aria-hidden="true" /> Refresh insights
      </Button>
    </div>
  );

  if (insight.insufficient) {
    return (
      <div className="space-y-4">
        {refreshBar}
        <Card variant="result" className="p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <p className="text-h3 text-foreground">Not enough history yet</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {insight.summary}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {refreshBar}

      <Card variant="result" className="p-6 sm:p-7">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-accent" aria-hidden="true" />
          <p className="text-eyebrow text-subtle-foreground">Overall job-search summary</p>
        </div>
        <p className="mt-4 text-lg leading-relaxed text-foreground/90">{insight.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>Interview conversion {insight.interviewRate}%</Badge>
          <Badge>Offer conversion {insight.offerRate}%</Badge>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
          Patterns below are inferred from your own application history. Where an employer gave
          explicit feedback it is quoted separately — a requirement appearing in rejected
          applications is a correlation, not a stated reason for any rejection.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel
          title="Where you're winning"
          icon={TrendingUp}
          hint="Role families with offers or 50%+ interview conversion."
        >
          {insight.winning.length === 0 ? (
            <NoSignal>No role family has converted often enough to call it a strength yet.</NoSignal>
          ) : (
            <ul>
              {insight.winning.map((c) => (
                <CountRow
                  key={c.category}
                  label={c.category}
                  count={`${c.interviewRate}% interview · ${c.offerRate}% offer`}
                  unit={`(${c.total})`}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Where you're struggling"
          icon={TrendingDown}
          hint="Role families where most closed applications ended in rejection."
        >
          {insight.struggling.length === 0 ? (
            <NoSignal>No role family shows a consistent rejection pattern.</NoSignal>
          ) : (
            <ul>
              {insight.struggling.map((c) => (
                <CountRow
                  key={c.category}
                  label={c.category}
                  count={`${c.rejectionRate}% rejected`}
                  unit={`(${c.total})`}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Conversion by role category"
          icon={Target}
          hint="Interview and offer conversion across your own applications."
        >
          <ul>
            {insight.categories.map((c) => (
              <li
                key={c.category}
                className="border-b border-border/60 py-2.5 last:border-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-foreground/90">{c.category}</span>
                  <span className="text-meta shrink-0 tabular-nums text-subtle-foreground">
                    {c.total} apps
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle-foreground tabular-nums">
                  <span>Interview {c.interviewRate}%</span>
                  <span>Offer {c.offerRate}%</span>
                  <span>Rejected {c.rejectionRate}%</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Repeated job requirements"
          hint="Keywords appearing across your saved job descriptions."
        >
          {insight.requirements.length === 0 ? (
            <NoSignal>Add job descriptions to your applications to see requirement patterns.</NoSignal>
          ) : (
            <ul>
              {insight.requirements.map((k) => (
                <CountRow key={k.keyword} label={k.keyword} count={k.jdCount} unit="JDs" />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Frequent in rejected applications"
          hint="Correlation only — this does not mean these requirements caused a rejection."
        >
          {insight.rejectedKeywords.length === 0 ? (
            <NoSignal>
              No requirement appears often enough across rejected applications to report.
            </NoSignal>
          ) : (
            <ul>
              {insight.rejectedKeywords.map((k) => (
                <CountRow
                  key={k.keyword}
                  label={k.keyword}
                  count={k.rejectedCount}
                  unit="rejected apps"
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Skills in your profile" hint="Taken from your resume/profile context.">
          <div className="flex flex-wrap gap-2">
            {insight.profileSkills.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel
          title="Skill & experience gaps"
          hint="Requested in 2+ of your job descriptions, not present in your profile skills."
        >
          {insight.gaps.length === 0 ? (
            <NoSignal>Your profile skills cover the requirements repeated in your applications.</NoSignal>
          ) : (
            <ul>
              {insight.gaps.map((g) => (
                <CountRow key={g.keyword} label={g.keyword} count={g.jdCount} unit="JDs" />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Explicit employer feedback"
          icon={Quote}
          hint="Quoted verbatim from recruiters and interviewers on your applications."
        >
          {insight.explicit.length === 0 ? (
            <NoSignal>
              No explicit employer feedback on record — everything above is AI-inferred from
              patterns.
            </NoSignal>
          ) : (
            <ul className="space-y-3.5">
              {insight.explicit.map((f) => (
                <li key={f.id} className="border-l border-accent/40 pl-3.5">
                  <p className="text-eyebrow text-subtle-foreground">
                    {f.label} · {f.company} — {f.role}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">“{f.text}”</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Recommended next steps"
        icon={ArrowUpRight}
        hint="Each step links to the QuickAI tool that already handles it."
      >
        <ol className="space-y-4">
          {insight.recommendations.map((r, i) => (
            <li key={r.id} className="flex gap-4">
              <span className="text-meta mt-0.5 shrink-0 tabular-nums text-subtle-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.detail}</p>
                {r.tool && (
                  <Button asChild variant="ghost" size="sm" className="mt-2 -ml-3">
                    <Link to={r.tool.to}>
                      {r.tool.label}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
