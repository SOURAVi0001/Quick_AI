import { cn } from '@/lib/utils';

/**
 * Single spinner used everywhere (inside buttons, panels, and page loaders).
 * Inherits currentColor so it works on any surface or button variant.
 */
export default function Spinner({ className = '', label }) {
  return (
    <span
      role="status"
      aria-label={label || 'Loading'}
      className={cn(
        'inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current',
        className,
      )}
    />
  );
}
