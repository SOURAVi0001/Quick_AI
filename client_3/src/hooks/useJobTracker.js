import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/clerk-react';
import * as jobTrackerApi from '../lib/jobTracker/api';

/**
 * All Job Tracker data access + local mutations live here, so presentation
 * components stay dumb and the mock API can be swapped for the real one later.
 */
export default function useJobTracker() {
  const [applications, setApplications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityError, setActivityError] = useState(null);
  const { getToken } = useAuth();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const data = await jobTrackerApi.fetchApplications(token);
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const loadActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      setActivityError(null);
      const token = await getToken();
      const data = await jobTrackerApi.fetchActivity(token);
      setActivity(data);
    } catch (err) {
      setActivityError(err.message || 'Failed to load activity');
    } finally {
      setActivityLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
    loadActivity();
  }, [load, loadActivity]);

  const pushActivity = useCallback((company, message) => {
    setActivity((prev) => [
      { id: `act-${Date.now()}`, company, message, at: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const addApplication = useCallback(
    async (values) => {
      const now = new Date().toISOString();
      const application = {
        ...values,
        id: `app-${Date.now()}`,
        updatedAt: now,
        timeline: [{ id: `t-${Date.now()}`, label: values.status, at: now }],
      };
      const token = await getToken();
      await jobTrackerApi.createApplication(application, token);
      setApplications((prev) => [application, ...prev]);
      pushActivity(application.company, 'Application added');
      toast.success(`${application.company} added to your tracker`);
      return application;
    },
    [pushActivity, getToken],
  );

  const updateStatus = useCallback(
    async (id, status) => {
      const now = new Date().toISOString();
      let company = '';
      setApplications((prev) =>
        prev.map((a) => {
          if (a.id !== id || a.status === status) return a;
          company = a.company;
          return {
            ...a,
            status,
            updatedAt: now,
            timeline: [...a.timeline, { id: `t-${Date.now()}`, label: status, at: now }],
          };
        }),
      );
      if (!company) return;
      const token = await getToken();
      await jobTrackerApi.updateApplicationStatus(id, status, token);
      pushActivity(company, `Status changed → ${status}`);
      toast.success(`${company} moved to ${status}`);
    },
    [pushActivity, getToken],
  );

  const roles = useMemo(
    () => [...new Set(applications.map((a) => a.role))].sort(),
    [applications],
  );
  const locations = useMemo(
    () => [...new Set(applications.map((a) => a.location).filter(Boolean))].sort(),
    [applications],
  );

  return {
    applications,
    activity,
    loading,
    activityLoading,
    error,
    activityError,
    reload: load,
    reloadActivity: loadActivity,
    addApplication,
    updateStatus,
    roles,
    locations,
  };
}
