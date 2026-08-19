import Markdown from 'react-markdown';
import { Card } from './ui/card';
import CopyButton from './CopyButton';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

/**
 * The signature output surface: a labelled, copyable premium writing
 * plane. The clipboard always receives the raw content only.
 */
export default function CopyBlock({
  label,
  eyebrow,
  badge,
  badgeTone = 'accent',
  content = '',
  markdown = true,
  variant = 'result',
  footer,
  className = '',
  bodyClassName = '',
}) {
  return (
    <Card variant={variant} className={cn('animate-reveal overflow-hidden', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6">
        <div className="min-w-0">
          {eyebrow && <p className="text-eyebrow mb-1 text-subtle-foreground">{eyebrow}</p>}
          <div className="flex items-center gap-2.5">
            <h3 className="text-h3 truncate text-foreground">{label}</h3>
            {badge && <StatusBadge tone={badgeTone}>{badge}</StatusBadge>}
          </div>
        </div>
        <CopyButton text={content} />
      </div>
      <div className={cn('px-5 py-5 sm:px-6', bodyClassName)}>
        {markdown ? (
          <div className="prose prose-invert prose-sm max-w-none break-words prose-headings:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-a:text-accent">
            <Markdown>{content}</Markdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
            {content}
          </p>
        )}
      </div>
      {footer && (
        <div className="border-t border-border px-5 py-3 text-xs text-subtle-foreground sm:px-6">
          {footer}
        </div>
      )}
    </Card>
  );
}

/**
 * Current → Recommended comparison, one of QuickAI's signature patterns.
 */
export function ComparePanel({
  title,
  currentLabel = 'Current',
  recommendedLabel = 'Recommended',
  current,
  recommended,
  className = '',
}) {
  return (
    <Card variant="panel" className={cn('animate-reveal overflow-hidden', className)}>
      {title && (
        <div className="border-b border-border px-5 py-3.5 sm:px-6">
          <h3 className="text-h3 text-foreground">{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="min-w-0 p-5 sm:p-6">
          <p className="text-eyebrow mb-3 text-subtle-foreground">{currentLabel}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground/80">
            {current || '—'}
          </p>
        </div>
        <div className="relative min-w-0 bg-primary/[0.04] p-5 sm:p-6">
          <span
            className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-primary/50 to-transparent"
            aria-hidden="true"
          />
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-eyebrow text-accent">{recommendedLabel}</p>
            <CopyButton text={recommended || ''} variant="ghost" size="sm" />
          </div>
          <div className="prose prose-invert prose-sm max-w-none break-words prose-p:leading-relaxed prose-strong:text-foreground">
            <Markdown>{recommended || '—'}</Markdown>
          </div>
        </div>
      </div>
    </Card>
  );
}
