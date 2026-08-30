import { ACTIVE_STATUSES, STATUSES } from './mockData';

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const formatLongDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export const relativeTime = (value) => {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

/** "Today" / "Tomorrow" / "Aug 20" grouping label for upcoming actions. */
export const dueLabel = (value) => {
  if (!value) return '—';
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return '—';
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Math.round((target.setHours(0, 0, 0, 0) - start.getTime()) / 86400000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return formatDate(value);
};

export const computeStats = (applications) => {
  const total = applications.length;
  const active = applications.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const interviews = applications.filter((a) =>
    ['Interview', 'Final Round'].includes(a.status),
  ).length;
  const offers = applications.filter((a) => a.status === 'Offer').length;
  const applied = applications.filter((a) => a.status !== 'Saved').length;
  const responded = applications.filter((a) =>
    ['Online Assessment', 'Interview', 'Final Round', 'Offer', 'Rejected'].includes(a.status),
  ).length;
  const responseRate = applied ? Math.round((responded / applied) * 100) : 0;
  return { total, active, interviews, offers, responseRate };
};

export const computePipeline = (applications) =>
  STATUSES.map((status) => ({
    status,
    count: applications.filter((a) => a.status === status).length,
  }));

export const filterApplications = (applications, { query, status, role, location, dateRange }) => {
  const q = query.trim().toLowerCase();
  return applications.filter((a) => {
    if (q) {
      const haystack = [a.company, a.role, a.location, a.recruiterName, a.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (status !== 'all' && a.status !== status) return false;
    if (role !== 'all' && a.role !== role) return false;
    if (location !== 'all' && a.location !== location) return false;
    if (dateRange !== 'all') {
      const days = Number(dateRange);
      const ref = a.appliedDate || a.updatedAt;
      if (!ref) return false;
      if (Date.now() - new Date(ref).getTime() > days * 86400000) return false;
    }
    return true;
  });
};

export const sortApplications = (applications, sort) => {
  const list = [...applications];
  const time = (v) => (v ? new Date(v).getTime() : 0);
  switch (sort) {
    case 'oldest':
      return list.sort((a, b) => time(a.appliedDate) - time(b.appliedDate));
    case 'updated':
      return list.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
    case 'nextAction':
      return list.sort(
        (a, b) => (time(a.nextActionDate) || Infinity) - (time(b.nextActionDate) || Infinity),
      );
    case 'newest':
    default:
      return list.sort(
        (a, b) => time(b.appliedDate || b.updatedAt) - time(a.appliedDate || a.updatedAt),
      );
  }
};

export const upcomingActions = (applications) =>
  applications
    .filter((a) => a.nextAction && a.nextActionDate)
    .sort((a, b) => new Date(a.nextActionDate) - new Date(b.nextActionDate))
    .slice(0, 6);
