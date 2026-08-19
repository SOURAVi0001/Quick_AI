import { cn } from '@/lib/utils';

/**
 * Accessible tactile selector rendered as a radio group: arrow keys / tab
 * reach it, Space+Enter select it, selection announced via aria-checked.
 */
export default function OptionGroup({
  label,
  options,
  value,
  onChange,
  getKey = (o) => (typeof o === 'string' ? o : o.value ?? o.text ?? o.label),
  getLabel = (o) => (typeof o === 'string' ? o : o.text ?? o.label ?? o.value),
  getDescription,
  columns = false,
  className = '',
}) {
  const selectedKey = value === undefined || value === null ? null : getKey(value);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        columns ? 'grid grid-cols-1 gap-2.5 sm:grid-cols-2' : 'flex flex-wrap gap-2.5',
        className,
      )}
    >
      {options.map((option) => {
        const key = getKey(option);
        const selected = key === selectedKey;
        const description = getDescription?.(option);
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              'group relative overflow-hidden rounded-md border px-3.5 py-2.5 text-left text-sm outline-none transition-[transform,border-color,background-color,box-shadow] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
              selected
                ? 'border-primary/50 bg-primary/[0.09] text-foreground shadow-[0_0_24px_-14px_hsl(var(--primary)/0.9)]'
                : 'border-border bg-surface-2/50 text-muted-foreground hover:-translate-y-0.5 hover:border-border-strong hover:text-foreground',
            )}
          >
            {selected && (
              <span
                className="absolute inset-y-0 left-0 w-[2px] bg-linear-to-b from-accent to-primary"
                aria-hidden="true"
              />
            )}
            <span className="block font-medium">{getLabel(option)}</span>
            {description && (
              <span
                className={cn(
                  'mt-0.5 block text-xs',
                  selected ? 'text-accent/80' : 'text-subtle-foreground',
                )}
              >
                {description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
