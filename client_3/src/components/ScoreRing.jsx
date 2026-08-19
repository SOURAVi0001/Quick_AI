import { cn } from '@/lib/utils';

const sizes = {
  sm: { box: 112, stroke: 8, text: 'text-2xl' },
  md: { box: 144, stroke: 9, text: 'text-3xl' },
  lg: { box: 176, stroke: 10, text: 'text-4xl' },
};

const toneFor = (value) => {
  if (value >= 80) return 'text-success';
  if (value >= 55) return 'text-primary';
  if (value >= 35) return 'text-warning';
  return 'text-destructive';
};

/**
 * Shared circular score indicator (replaces the duplicated hand-drawn SVG
 * rings in ResumeTailor and CareerScore).
 */
export default function ScoreRing({ value = 0, max = 100, size = 'md', label, className = '' }) {
  const { box, stroke, text } = sizes[size] || sizes.md;
  const safe = Math.max(0, Math.min(max, Number(value) || 0));
  const pct = safe / max;
  const r = (box - stroke) / 2 - 2;
  const c = box / 2;
  const circumference = 2 * Math.PI * r;
  const tone = toneFor((safe / max) * 100);

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: box, height: box }}
      role="img"
      aria-label={`${label ? label + ': ' : ''}${safe} out of ${max}`}
    >
      <svg width={box} height={box} className="-rotate-90">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-3"
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', tone)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-semibold tabular-nums tracking-tight', text, tone)}>{safe}</span>
        {label && (
          <span className="text-eyebrow mt-1 text-subtle-foreground">{label}</span>
        )}
      </div>
    </div>
  );
}
