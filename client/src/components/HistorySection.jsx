import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from './ui/Card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Copy, CheckCircle2, History } from 'lucide-react';
import toast from 'react-hot-toast';

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

export default function HistorySection({ type, title = "History", renderItem }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const limit = 3;

  const fetchHistory = async (pageNumber) => {
    setLoading(true);
    setError(false);
    try {
      const url = type 
        ? `/api/user/history?type=${type}&page=${pageNumber}&limit=${limit}`
        : `/api/user/history?page=${pageNumber}&limit=${limit}`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${window.localStorage.getItem('clerk-db-jwt')}` },
        withCredentials: true
      });
      if (data.success) {
        setItems(data.items);
        setTotalPages(data.totalPages || 1);
        setPage(data.page);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
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

  if (loading && items.length === 0) {
    return (
      <div className="mt-12 w-full max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-muted/50 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse border border-border/30"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="mt-12 w-full max-w-4xl mx-auto text-center p-12 rounded-xl border border-destructive/20 bg-destructive/5">
        <History className="w-12 h-12 text-destructive/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
        <p className="text-muted-foreground mb-4">We couldn't load your previous results.</p>
        <Button variant="outline" onClick={() => fetchHistory(page)}>Try Again</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-12 w-full max-w-4xl mx-auto text-center p-12 rounded-xl border border-border/50 bg-card">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
          <History className="w-8 h-8 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No history yet</h3>
        <p className="text-muted-foreground">Your generated results will appear here after your first analysis.</p>
      </div>
    );
  }

  return (
    <div className="mt-16 w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <History className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="space-y-4 relative">
        <div className="absolute left-8 top-8 bottom-8 w-px bg-border/40 -z-10 hidden sm:block"></div>
        {items.map((item, idx) => (
          <div key={item.id} className="relative flex gap-6">
            <div className="hidden sm:flex flex-col items-center pt-6">
              <div className="w-4 h-4 rounded-full bg-accent/20 border-2 border-accent ring-4 ring-background z-10"></div>
            </div>
            <Card className="flex-1 transition-all duration-200 hover:shadow-md hover:border-accent/30 group">
              {renderItem(item, { handleCopy, format: formatDate })}
            </Card>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 border-t border-border/50 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={page === 1 || loading}
            className="hover:bg-accent/10 hover:text-accent"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={page === totalPages || loading}
            className="hover:bg-accent/10 hover:text-accent"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
