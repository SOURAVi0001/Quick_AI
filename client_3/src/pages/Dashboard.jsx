import { useUser } from '@clerk/clerk-react';
import { AiToolsData } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkles, Zap } from 'lucide-react';
import HistorySection from '../components/HistorySection';
import AnimatedBackground from '../components/AnimatedBackground';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { MetricLine } from '../components/ScoreDisplay';
import StatusBadge from '../components/StatusBadge';
import { SectionHeader } from '../components/PageHeader';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const primaryPaths = [
  '/ai/resume-tailor',
  '/ai/linkedin-optimizer',
  '/ai/interview-coach',
  '/ai/recruiter-outreach',
];

const snapshot = [
  { label: 'Resume strength', value: 88, hint: 'ATS-safe formatting' },
  { label: 'LinkedIn presence', value: 82, hint: 'Headline needs keywords' },
  { label: 'Interview readiness', value: 74, hint: 'Practise system design' },
  { label: 'Outreach response rate', value: 61, hint: 'Shorten your first line' },
];

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const featured = AiToolsData.filter((t) => primaryPaths.includes(t.path));
  const rest = AiToolsData.filter((t) => !primaryPaths.includes(t.path));

  return (
    <div className="animate-rise relative w-full pb-24">
      <AnimatedBackground stars={46} className="-inset-x-12 -top-24 bottom-auto h-[38rem]" />

      {/* ── Command hero ─────────────────────────────────────────── */}
      <section className="relative mb-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <StatusBadge tone="accent" dot>
                Workspace live
              </StatusBadge>
              <span className="hairline-glow hidden h-px w-24 sm:block" />
            </div>
            <h1 className="text-display-sm text-balance text-foreground">
              {greeting()}, {user?.firstName || 'there'}.
              <br />
              <span className="display-accent">What are you working on?</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Seven AI tools for the job search — tailor a resume, sharpen your profile, rehearse
              the interview, then send outreach that actually gets replies.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate('/ai/resume-tailor')}>
              <Zap className="size-4" />
              Tailor a resume
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/ai/career-score')}>
              View career score
            </Button>
          </div>
        </div>
      </section>

      {/* ── Featured tools: asymmetric editorial grid ─────────────── */}
      <section aria-label="Primary tools" className="relative">
        <SectionHeader eyebrow="Start here" title="Your next move" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((tool, i) => (
            <Card
              key={tool.path}
              variant="interactive"
              className={cnJoin(
                'animate-reveal group overflow-hidden p-0',
                i === 0 && 'md:col-span-2 xl:col-span-2',
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <button
                type="button"
                onClick={() => navigate(tool.path)}
                className="flex h-full w-full flex-col items-start rounded-lg p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:p-7"
              >
                <div className="mb-8 flex w-full items-center">
                  <span className="grid size-11 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary-soft transition-transform duration-300 group-hover:scale-110">
                    <tool.Icon className="size-5" />
                  </span>
                  <ArrowUpRight className="ml-auto size-4 shrink-0 text-subtle-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <h3
                  className={cnJoin(
                    'mb-2 font-display text-foreground',
                    i === 0 ? 'text-3xl' : 'text-2xl',
                  )}
                >
                  {tool.title}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              </button>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Career snapshot + remaining tools ────────────────────── */}
      <section className="relative mt-16 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card variant="panel" className="grain animate-reveal overflow-hidden lg:col-span-2">
          <div className="border-b border-border px-6 py-5">
            <p className="text-eyebrow mb-1.5 text-subtle-foreground">Career snapshot</p>
            <h2 className="font-display text-2xl text-foreground">Where you stand</h2>
          </div>
          <div className="space-y-6 px-6 py-6">
            {snapshot.map((row) => (
              <div key={row.label}>
                <MetricLine label={row.label} value={row.value} />
                <p className="mt-2 text-xs text-subtle-foreground">{row.hint}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => navigate('/ai/career-score')}
            >
              Full breakdown <ArrowRight className="size-4" />
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-3">
          <SectionHeader eyebrow="Quick actions" title="Everything else" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rest.map((tool, i) => (
              <Card
                key={tool.path}
                variant="interactive"
                className="animate-reveal p-0"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <button
                  type="button"
                  onClick={() => navigate(tool.path)}
                  className="group flex w-full items-center gap-4 rounded-lg p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-surface-2/80 text-subtle-foreground transition-colors group-hover:border-accent/30 group-hover:text-accent">
                    <tool.Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-h3 block truncate text-foreground">{tool.title}</span>
                    <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
                      {tool.description}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-subtle-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-accent" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <HistorySection
        title="Recent activity"
        renderItem={(item, { format }) => (
          <div className="flex min-w-0 items-start gap-4 p-5 sm:p-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2/80 text-subtle-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-h3 capitalize text-foreground">
                  {item.type.replace(/-/g, ' ')}
                </h3>
                <span className="text-meta whitespace-nowrap">{format(item.created_at)}</span>
              </div>
              <p className="line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
                {typeof item.content === 'string' ? item.content : JSON.stringify(item.content)}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
};

/* tiny local class joiner to avoid an extra import churn */
function cnJoin(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default Dashboard;
