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
      className="cursor-pointer bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-200 shadow-dark"
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-white/80 truncate">{item.prompt}</p>
            <p className="text-xs text-white/30 mt-0.5">
              {item.type} &middot; {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 text-xs px-2.5 py-0.5 bg-white/5 text-white/40 border-white/10"
          >
            {item.type}
          </Badge>
        </div>
        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/5">
            {item.type === 'image' ? (
              <div>
                {!imgLoaded && !imgError && (
                  <Skeleton className="w-full max-w-md h-64 rounded-lg bg-white/5 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white/20"
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
                  <div className="w-full max-w-md h-40 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/30 text-sm">
                    Failed to load image
                  </div>
                )}
                <img
                  src={item.content}
                  alt={item.prompt || 'Generated image'}
                  loading="lazy"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                  className={`w-full max-w-md rounded-lg shadow-subtle transition-opacity duration-300 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0 h-0'
                  }`}
                />
              </div>
            ) : (
              <div className="h-full max-h-96 overflow-y-scroll text-sm text-white/60 leading-relaxed">
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
