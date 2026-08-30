import { useMemo, useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import ToolShell, { Zone } from '../components/ToolShell';
import { Button } from '../components/ui/button';
import JobStats from '../components/jobtracker/JobStats';
import ApplicationPipeline from '../components/jobtracker/ApplicationPipeline';
import ApplicationFilters from '../components/jobtracker/ApplicationFilters';
import ApplicationList from '../components/jobtracker/ApplicationList';
import AddApplicationForm from '../components/jobtracker/AddApplicationForm';
import ApplicationDetail from '../components/jobtracker/ApplicationDetail';
import UpcomingActions from '../components/jobtracker/UpcomingActions';
import ActivityHistory from '../components/jobtracker/ActivityHistory';
import JobSearchInsights from '../components/jobtracker/JobSearchInsights';
import InsightHistory from '../components/jobtracker/InsightHistory';
import useJobTracker from '../hooks/useJobTracker';
import useJobInsights from '../hooks/useJobInsights';

import {
  computePipeline,
  computeStats,
  filterApplications,
  sortApplications,
  upcomingActions,
} from '../lib/jobTracker/utils';

const emptyFilters = { query: '', status: 'all', role: 'all', location: 'all', dateRange: 'all' };

const JobTracker = () => {
  const {
    applications,
    activity,
    loading,
    activityLoading,
    error,
    activityError,
    reload,
    reloadActivity,
    addApplication,
    updateStatus,
    roles,
    locations,
  } = useJobTracker();

  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState('newest');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const insights = useJobInsights(applications, { ready: !loading });

  const stats = useMemo(() => computeStats(applications), [applications]);
  const pipeline = useMemo(() => computePipeline(applications), [applications]);
  const upcoming = useMemo(() => upcomingActions(applications), [applications]);

  const visible = useMemo(
    () => sortApplications(filterApplications(applications, filters), sort),
    [applications, filters, sort],
  );

  const selected = applications.find((a) => a.id === selectedId) || null;
  const isFiltered =
    filters.query !== '' ||
    filters.status !== 'all' ||
    filters.role !== 'all' ||
    filters.location !== 'all' ||
    filters.dateRange !== 'all';

  const headerAction = (
    <Button onClick={() => setAddOpen(true)}>
      <Plus className="size-4" /> Add Application
    </Button>
  );

  return (
    <ToolShell
      icon={Briefcase}
      eyebrow="Career Tools"
      title="Job Application Tracker"
      description="Every role you're chasing in one workspace — stages, recruiters, resumes, next actions and the full history of each application."
      action={headerAction}
      width="full"
    >
      <JobStats stats={stats} loading={loading} />

      <Zone eyebrow="Pipeline">
        <ApplicationPipeline
          pipeline={pipeline}
          loading={loading}
          activeStatus={filters.status}
          onSelect={(status) => setFilters((f) => ({ ...f, status }))}
        />
      </Zone>

      <Zone eyebrow="Applications">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <ApplicationFilters
              filters={filters}
              onChange={setFilters}
              sort={sort}
              onSortChange={setSort}
              roles={roles}
              locations={locations}
              onClear={() => setFilters(emptyFilters)}
              resultCount={visible.length}
            />
            <ApplicationList
              applications={visible}
              loading={loading}
              error={error}
              onRetry={reload}
              onOpen={(a) => setSelectedId(a.id)}
              onAdd={() => setAddOpen(true)}
              filtered={isFiltered}
              onClearFilters={() => setFilters(emptyFilters)}
            />
          </div>

          <div className="min-w-0 space-y-6">
            <UpcomingActions
              items={upcoming}
              loading={loading}
              onOpen={(a) => setSelectedId(a.id)}
            />
            <ActivityHistory
              activity={activity}
              loading={activityLoading}
              error={activityError}
              onRetry={reloadActivity}
            />
          </div>
        </div>
      </Zone>

      <Zone eyebrow="AI Job Search Insights">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <JobSearchInsights
              insight={insights.insight}
              loading={insights.loading}
              error={insights.error}
              onRefresh={insights.refresh}
              onRetry={insights.retry}
            />
          </div>
          <div className="min-w-0">
            <InsightHistory snapshots={insights.history} loading={insights.loading} />
          </div>
        </div>
      </Zone>

      <AddApplicationForm open={addOpen} onOpenChange={setAddOpen} onSubmit={addApplication} />
      <ApplicationDetail
        application={selected}
        open={!!selected}
        onOpenChange={(next) => !next && setSelectedId(null)}
        onStatusChange={updateStatus}
      />
    </ToolShell>
  );
};

export default JobTracker;
