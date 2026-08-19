import { Briefcase, Plus, SearchX } from 'lucide-react';
import ApplicationCard from './ApplicationCard';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import LoadingState from '../LoadingState';
import { Button } from '../ui/button';

export default function ApplicationList({
  applications,
  loading,
  error,
  onRetry,
  onOpen,
  onAdd,
  filtered = false,
  onClearFilters,
}) {
  if (loading) {
    return (
      <LoadingState
        title="Loading your applications…"
        description="Fetching companies, stages and next actions."
        lines={5}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Applications failed to load"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (!applications.length) {
    return filtered ? (
      <EmptyState
        icon={SearchX}
        title="No matching applications"
        description="Try a different search term, or clear the filters to see everything you're tracking."
        action={
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Briefcase}
        title="No applications yet"
        description="Start tracking the roles you care about — stages, recruiters, resumes and next actions all in one place."
        action={
          <Button onClick={onAdd}>
            <Plus className="size-4" /> Add application
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((a) => (
        <ApplicationCard key={a.id} application={a} onOpen={onOpen} />
      ))}
    </div>
  );
}
