import { Briefcase, Activity, CalendarCheck, Trophy, Percent } from 'lucide-react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const items = [
  { key: 'total', label: 'Total Applications', Icon: Briefcase, tone: 'text-foreground' },
  { key: 'active', label: 'Active', Icon: Activity, tone: 'text-primary-soft' },
  { key: 'interviews', label: 'Interviews', Icon: CalendarCheck, tone: 'text-accent' },
  { key: 'offers', label: 'Offers', Icon: Trophy, tone: 'text-success' },
  {
    key: 'responseRate',
    label: 'Response Rate',
    Icon: Percent,
    tone: 'text-foreground',
    suffix: '%',
  },
];

export default function JobStats({ stats, loading = false }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ key, label, Icon, tone, suffix }) => (
        <Card key={key} variant="panel" className="overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-subtle-foreground" aria-hidden="true" />
            <p className="text-eyebrow truncate text-subtle-foreground">{label}</p>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-16" />
          ) : (
            <p className={`mt-2 font-display text-3xl leading-none ${tone}`}>
              {stats[key] ?? 0}
              {suffix && <span className="ml-0.5 text-lg text-muted-foreground">{suffix}</span>}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
