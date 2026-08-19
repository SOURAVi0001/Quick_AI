import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../lib/api';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import toast from 'react-hot-toast';

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * Contextual, paginated history timeline (3 items per page, server-side).
 * Rendered below the live workspace on every generating tool page.
 */
export default function HistorySection({ type, title = 'History', renderItem }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { getToken } = useAuth();
  const limit = 3;

  const fetchHistory = async (pageNumber) => {
    setLoading(true);
    setError(false);
    try {
      const url = type
        ? `/api/user/history?type=${type}&page=${pageNumber}&limit=${limit}`
        : `/api/user/history?page=${pageNumber}&limit=${limit}`;
      
      const token = await getToken();
      const { data } = await api.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (data.success) {
        setItems(data.items);
        setTotalPages(data.totalPages || 1);
        setPage(data.page);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleNext = () => {
    if (page < totalPages) fetchHistory(page + 1);
  };

  const handlePrev = () => {
    if (page > 1) fetchHistory(page - 1);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const Heading = (
    <div className="mb-6 flex items-center gap-4">
      <div className="flex items-center gap-2.5">
        <History className="size-3.5 text-subtle-foreground" />
        <p className="text-eyebrow text-subtle-foreground">{title}</p>
      </div>
      <span className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
      {items.length > 0 && (
        <span className="text-meta whitespace-nowrap tabular-nums">
          Page {page} of {totalPages}
        </span>
      )}
    </div>
  );

  const wrap = (children) => (
    <section className="mt-16 w-full" aria-label={title}>
      {Heading}
      {children}
    </section>
  );

  if (loading && items.length === 0) {
    return wrap(
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>,
    );
  }

  if (error && items.length === 0) {
    return wrap(
      <ErrorState
        title="Couldn't load history"
        description="We couldn't reach your previous results. Check your connection and try again."
        onRetry={() => fetchHistory(page)}
        retrying={loading}
      />,
    );
  }

  if (items.length === 0) {
    return wrap(
      <EmptyState
        icon={History}
        title="Nothing here yet"
        description="Your generated results will appear in this timeline after your first run."
      />,
    );
  }

  return wrap(
    <>
      <ul className="relative space-y-3 pl-0 sm:pl-6">
        <span
          className="absolute inset-y-2 left-[3px] hidden w-px bg-linear-to-b from-primary/40 via-border to-transparent sm:block"
          aria-hidden="true"
        />
        {items.map((item, i) => (
          <li key={item.id} className="animate-reveal relative min-w-0" style={{ animationDelay: `${i * 70}ms` }}>
            <span
              className="absolute -left-6 top-7 hidden size-[7px] rounded-full border border-primary/50 bg-background sm:block"
              aria-hidden="true"
            />
            <Card variant="interactive" className="min-w-0">
              {renderItem(item, { handleCopy, format: formatDate })}
            </Card>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav
          aria-label="History pagination"
          className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-5"
        >
          <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1 || loading}>
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-meta tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={page === totalPages || loading}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}
    </>,
  );
}
