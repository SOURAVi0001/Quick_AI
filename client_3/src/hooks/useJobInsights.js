import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/clerk-react';
import * as jobTrackerApi from '../lib/jobTracker/api';
import { mockProfile } from '../lib/jobTracker/mockData';

/**
 * Job Search Insights state. Mirrors useJobTracker's shape (loading / error /
 * reload) and keeps a local snapshot history so the insight timeline can be
 * paginated exactly like the tracker's activity history.
 */
export default function useJobInsights(applications, { ready = true } = {}) {
  const [insight, setInsight] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getToken } = useAuth();
  const appsRef = useRef(applications);
  appsRef.current = applications;

  const loadHistory = useCallback(async () => {
    try {
      const token = await getToken();
      const past = await jobTrackerApi.fetchInsightHistory(token);
      setHistory(past);
    } catch (err) {
      // Fail silently for history loading
    }
  }, [getToken]);

  const run = useCallback(
    async ({ announce = false } = {}) => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const next = await jobTrackerApi.generateInsights(appsRef.current, mockProfile, token);
        setInsight(next);
        setHistory((prev) => [next, ...prev].slice(0, 24));
        if (announce) toast.success('Insights recalculated from your latest history');
      } catch (err) {
        setError(err.message || 'Failed to generate insights');
      } finally {
        setLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    if (!ready) return;
    loadHistory();
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return {
    insight,
    history,
    loading,
    error,
    refresh: () => run({ announce: true }),
    retry: () => run(),
  };
}
