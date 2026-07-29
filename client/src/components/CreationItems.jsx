import { useState } from 'react';
import Markdown from 'react-markdown';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

const CreationItem = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Card
      onClick={() => setExpanded(!expanded)}
      className="max-w-5xl text-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-medium text-foreground">{item.prompt}</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {item.type} &middot; {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">{item.type}</Badge>
        </div>
        {expanded && (
          <div className="mt-4 pt-4 border-t">
            {item.type === 'image' ? (
              <div>
                {!imgLoaded && !imgError && (
                  <Skeleton className="w-full max-w-md h-64 flex items-center justify-center rounded-lg">
                    <svg
                      className="w-8 h-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </Skeleton>
                )}
                {imgError && (
                  <div className="w-full max-w-md h-40 bg-muted border rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                    Failed to load image
                  </div>
                )}
                <img
                  src={item.content}
                  alt={item.prompt || 'Generated image'}
                  loading="lazy"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                  className={`w-full max-w-md rounded-lg shadow-sm transition-opacity duration-300 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0 h-0'
                  }`}
                />
              </div>
            ) : (
              <div className="h-full overflow-y-scroll text-sm text-foreground/80">
                <div className="reset-tw">
                  <Markdown>{item.content}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreationItem;
