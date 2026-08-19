import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

/**
 * Warm, non-alarming failure surface. Uses muted ember rather than
 * a harsh red so errors stay inside the design language.
 */
export default function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't complete that request. Please try again.",
  onRetry,
  retrying = false,
  className = '',
}) {
  return (
    <Card
      variant="panel"
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center overflow-hidden border-ember/25 px-6 py-14 text-center',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{
          background:
            'radial-gradient(60% 100% at 50% 0%, hsl(var(--ember) / 0.14) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="relative mb-5 grid size-12 place-items-center rounded-full border border-ember/30 bg-ember/10 text-ember">
        <AlertTriangle className="size-5" />
      </div>
      <h3 className="relative font-display text-2xl text-foreground">{title}</h3>
      <p className="relative mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" className="relative mt-6" onClick={onRetry} loading={retrying}>
          {!retrying && <RotateCcw className="size-4" />}
          {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      )}
    </Card>
  );
}
