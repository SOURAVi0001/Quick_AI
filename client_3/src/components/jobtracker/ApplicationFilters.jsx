import { Search, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { STATUSES } from '@/lib/jobTracker/mockData';

const dateOptions = [
  { value: 'all', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'nextAction', label: 'Next action' },
];

export default function ApplicationFilters({
  filters,
  onChange,
  sort,
  onSortChange,
  roles,
  locations,
  onClear,
  resultCount,
}) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const dirty =
    filters.query ||
    filters.status !== 'all' ||
    filters.role !== 'all' ||
    filters.location !== 'all' ||
    filters.dateRange !== 'all';

  return (
    <Card variant="panel" className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.query}
            onChange={set('query')}
            placeholder="Search applications..."
            aria-label="Search applications by company, role, location, recruiter or notes"
            className="pl-10"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="jt-status" className="mb-1.5 block text-xs text-subtle-foreground">
              Status
            </Label>
            <Select id="jt-status" value={filters.status} onChange={set('status')}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="jt-role" className="mb-1.5 block text-xs text-subtle-foreground">
              Role
            </Label>
            <Select id="jt-role" value={filters.role} onChange={set('role')}>
              <option value="all">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="jt-location" className="mb-1.5 block text-xs text-subtle-foreground">
              Location
            </Label>
            <Select id="jt-location" value={filters.location} onChange={set('location')}>
              <option value="all">All locations</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="jt-date" className="mb-1.5 block text-xs text-subtle-foreground">
              Date
            </Label>
            <Select id="jt-date" value={filters.dateRange} onChange={set('dateRange')}>
              {dateOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="jt-sort" className="mb-1.5 block text-xs text-subtle-foreground">
              Sort by
            </Label>
            <Select id="jt-sort" value={sort} onChange={(e) => onSortChange(e.target.value)}>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-subtle-foreground">
            {resultCount} application{resultCount === 1 ? '' : 's'} shown
          </p>
          {dirty && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="size-3.5" /> Clear filters
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
