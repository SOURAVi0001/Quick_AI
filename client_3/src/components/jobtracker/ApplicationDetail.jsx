import { useNavigate } from 'react-router-dom';
import { Brain, ExternalLink, Linkedin, Send, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import StatusBadge from '../StatusBadge';
import ApplicationTimeline from './ApplicationTimeline';
import { STATUSES, STATUS_TONE } from '@/lib/jobTracker/mockData';
import { formatLongDate } from '@/lib/jobTracker/utils';

/**
 * Quick actions reuse existing QuickAI routes. `state` carries the job context
 * so those tools can consume it once they support prefilled input.
 */
const quickActions = [
  { label: 'Tailor Resume', to: '/ai/resume-tailor', Icon: Wand2 },
  { label: 'Optimize LinkedIn', to: '/ai/linkedin-optimizer', Icon: Linkedin },
  { label: 'Prepare Interview', to: '/ai/interview-coach', Icon: Brain },
  { label: 'Recruiter Outreach', to: '/ai/recruiter-outreach', Icon: Send },
];

function Row({ label, value, href }) {
  const empty = !value;
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="text-eyebrow w-40 shrink-0 text-subtle-foreground">{label}</span>
      {empty ? (
        <span className="text-sm text-subtle-foreground">—</span>
      ) : href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 break-all text-sm text-accent underline-offset-4 hover:underline"
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
        </a>
      ) : (
        <span className="min-w-0 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {value}
        </span>
      )}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-2 flex items-center gap-4">
        <p className="text-eyebrow text-subtle-foreground">{title}</p>
        <span className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
      </div>
      {children}
    </section>
  );
}

export default function ApplicationDetail({ application, open, onOpenChange, onStatusChange }) {
  const navigate = useNavigate();
  if (!application) return null;
  const a = application;

  const goTo = (to) =>
    navigate(to, {
      state: {
        jobContext: {
          company: a.company,
          role: a.role,
          location: a.location,
          jobUrl: a.jobUrl,
          jobDescription: a.jobDescription,
          recruiterName: a.recruiterName,
        },
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>{a.company}</DialogTitle>
            <StatusBadge tone={STATUS_TONE[a.status] || 'neutral'} dot>
              {a.status}
            </StatusBadge>
          </div>
          <DialogDescription>
            {a.role}
            {a.location ? ` · ${a.location}` : ''}
            {a.employmentType ? ` · ${a.employmentType}` : ''}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Card variant="inset" className="mb-6 p-4">
            <Label htmlFor="detail-status" className="mb-1.5 block text-xs text-subtle-foreground">
              Update status
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                id="detail-status"
                value={a.status}
                onChange={(e) => onStatusChange(a.id, e.target.value)}
                containerClassName="sm:max-w-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-subtle-foreground">
                Changing the status adds an entry to the timeline below.
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <Group title="Job details">
                <Row label="Company" value={a.company} />
                <Row label="Role" value={a.role} />
                <Row label="Job URL" value={a.jobUrl} href={a.jobUrl || undefined} />
                <Row label="Location" value={a.location} />
                <Row label="Employment type" value={a.employmentType} />
                <Row label="Job description" value={a.jobDescription} />
              </Group>

              <Group title="Application">
                <Row label="Status" value={a.status} />
                <Row label="Applied date" value={formatLongDate(a.appliedDate)} />
                <Row label="Resume used" value={a.resumeUsed} />
              </Group>

              <Group title="Recruiter">
                <Row label="Name" value={a.recruiterName} />
                <Row
                  label="Email"
                  value={a.recruiterEmail}
                  href={a.recruiterEmail ? `mailto:${a.recruiterEmail}` : undefined}
                />
                <Row
                  label="LinkedIn"
                  value={a.recruiterLinkedin}
                  href={a.recruiterLinkedin || undefined}
                />
              </Group>

              <Group title="Next action">
                <Row label="Action" value={a.nextAction} />
                <Row label="Date" value={a.nextActionDate ? formatLongDate(a.nextActionDate) : ''} />
              </Group>

              <Group title="Notes">
                <Row label="Your notes" value={a.notes} />
              </Group>
            </div>

            <div className="min-w-0">
              <Group title="Application history">
                <ApplicationTimeline timeline={a.timeline} />
              </Group>

              <Group title="Quick actions">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                  {quickActions.map(({ label, to, Icon }) => (
                    <Button key={to} variant="outline" className="justify-start" onClick={() => goTo(to)}>
                      <Icon className="size-4 text-accent" /> {label}
                    </Button>
                  ))}
                </div>
              </Group>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
