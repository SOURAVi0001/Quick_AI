import { cn } from '@/lib/utils';

const tones = {
  neutral: 'border-border bg-surface-2/70 text-muted-foreground',
  accent: 'border-accent/25 bg-accent/10 text-accent',
  primary: 'border-primary/25 bg-primary/10 text-primary-soft',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  ember: 'border-ember/25 bg-ember/10 text-ember',
};

/**
 * Small metadata / state chip used for tones, scores, counters and labels.
 */
export default function StatusBadge({
  children,
  tone = 'neutral',
  icon: Icon,
  dot = false,
  className = '',
}) {
  return (
    <span
      className={cn(
        'text-eyebrow inline-flex items-center gap-2 rounded-full border px-2.5 py-1',
        tones[tone] || tones.neutral,
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}
