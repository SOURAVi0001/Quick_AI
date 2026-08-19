import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/* Deterministic-enough star field generated once per mount. */
function useStars(count) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const r1 = seed / 233280;
        const r2 = ((i * 4721 + 7919) % 10007) / 10007;
        const r3 = ((i * 104729 + 1543) % 9973) / 9973;
        return {
          left: `${(r1 * 100).toFixed(2)}%`,
          top: `${(r2 * 100).toFixed(2)}%`,
          size: r3 > 0.9 ? 2 : 1,
          delay: `${(r3 * 6).toFixed(2)}s`,
          duration: `${(4 + r1 * 5).toFixed(2)}s`,
          hue: r3 > 0.66 ? 'hsl(38 90% 78%)' : r3 > 0.33 ? 'hsl(36 30% 96%)' : 'hsl(33 88% 60%)',
        };
      }),
    [count],
  );
}

/**
 * Atmospheric environment: warm radial lighting, slow ambient drift,
 * a low-opacity warm star field, and film grain. Purely decorative —
 * all motion is motion-safe gated so reduced-motion users get a still scene.
 */
export default function AnimatedBackground({ stars = 70, className = '', variant = 'page' }) {
  const field = useStars(stars);

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* base warm wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(22 62% 20% / 0.55) 0%, transparent 62%), radial-gradient(80% 60% at 85% 20%, hsl(8 55% 22% / 0.28) 0%, transparent 70%)',
        }}
      />

      {/* drifting ember light */}
      <div
        className="absolute left-1/2 top-[-18%] h-[52rem] w-[64rem] -translate-x-1/2 rounded-full opacity-60 blur-[130px] motion-safe:animate-drift"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--primary) / 0.22) 0%, hsl(var(--copper) / 0.12) 45%, transparent 72%)',
        }}
      />
      {variant === 'page' && (
        <div
          className="absolute bottom-[-25%] right-[-10%] h-[40rem] w-[40rem] rounded-full opacity-50 blur-[120px] motion-safe:animate-drift"
          style={{
            animationDirection: 'alternate-reverse',
            background:
              'radial-gradient(circle, hsl(var(--accent) / 0.13) 0%, transparent 70%)',
          }}
        />
      )}

      {/* star field */}
      <div className="absolute inset-0">
        {field.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full opacity-25 motion-safe:animate-twinkle"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              backgroundColor: s.hue,
              boxShadow: `0 0 ${s.size * 3}px ${s.hue}`,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>

      {/* hairline grid, masked */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '88px 88px',
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 0%, black, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 0%, black, transparent 78%)',
        }}
      />

      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
