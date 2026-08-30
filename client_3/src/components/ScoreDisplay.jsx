import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Animated count-up numeral, reduced-motion aware. */
export function CountUp({ value = 0, duration = 900, className = '' }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(target);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <span className={cn('font-numeral tabular-nums', className)}>{display}</span>;
}

const toneFor = (pct) => {
  if (pct >= 80) return 'text-success';
  if (pct >= 60) return 'text-accent';
  if (pct >= 40) return 'text-warning';
  return 'text-ember';
};

const barFor = (pct) => {
  if (pct >= 80) return 'bg-success';
  if (pct >= 60) return 'bg-accent';
  if (pct >= 40) return 'bg-warning';
  return 'bg-ember';
};

/**
 * Editorial score presentation — oversized serif numeral plus a progress
 * rule. Deliberately not a neon gauge.
 */
export default function ScoreDisplay({
  value = 0,
  max = 100,
  label,
  verdict,
  size = 'lg',
  className = '',
}) {
  const safe = Math.max(0, Math.min(max, Number(value) || 0));
  const pct = (safe / max) * 100;
  const numeral = size === 'sm' ? 'text-4xl' : size === 'md' ? 'text-6xl' : 'text-7xl sm:text-8xl';

  return (
    <div className={cn('min-w-0', className)}>
      {label && <p className="text-eyebrow mb-3 text-subtle-foreground">{label}</p>}
      <div className="flex items-end gap-3">
        <CountUp value={safe} className={cn(numeral, 'leading-none', toneFor(pct))} />
        <span className="mb-2 text-sm text-subtle-foreground">/ {max}</span>
      </div>
      <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]',
            barFor(pct),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {verdict && (
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{verdict}</p>
      )}
    </div>
  );
}

/** Compact labelled metric line used in breakdown lists. */
export function MetricLine({ label, value, max = 100, className = '' }) {
  const safe = Math.max(0, Math.min(max, Number(value) || 0));
  const pct = (safe / max) * 100;
  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-muted-foreground">{label}</span>
        <CountUp value={safe} className={cn('text-sm font-medium', toneFor(pct))} />
      </div>
      <div className="h-px w-full bg-border">
        <div
          className={cn('h-px transition-[width] duration-1000', barFor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
