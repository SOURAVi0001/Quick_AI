import { useState } from 'react';
import Markdown from 'react-markdown';
import { ChevronDown, ImageOff, Image as ImageIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

const CreationItem = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="min-w-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-4 p-4 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{item.prompt}</p>
          <p className="mt-0.5 text-xs text-subtle-foreground">
            {new Date(item.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="neutral">{item.type}</Badge>
          <ChevronDown
            className={cn(
              'size-4 text-subtle-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4">
          {item.type === 'image' ? (
            <div>
              {!imgLoaded && !imgError && (
                <Skeleton className="grid h-64 w-full max-w-md place-items-center">
                  <ImageIcon className="size-7 text-subtle-foreground" />
                </Skeleton>
              )}
              {imgError && (
                <div className="grid h-40 w-full max-w-md place-items-center rounded-md border border-border bg-surface-2 text-sm text-subtle-foreground">
                  <span className="flex items-center gap-2">
                    <ImageOff className="size-4" /> Failed to load image
                  </span>
                </div>
              )}
              <img
                src={item.content}
                alt={item.prompt || 'Generated image'}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={cn(
                  'w-full max-w-md rounded-md border border-border shadow-subtle transition-opacity duration-300',
                  imgLoaded ? 'opacity-100' : 'h-0 opacity-0',
                )}
              />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-h-96 max-w-none overflow-y-auto break-words text-muted-foreground">
              <Markdown>{item.content}</Markdown>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CreationItem;
