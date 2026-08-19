import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Label } from '../ui/label';
import { EMPLOYMENT_TYPES, STATUSES } from '@/lib/jobTracker/mockData';

const empty = {
  company: '',
  role: '',
  status: 'Saved',
  jobUrl: '',
  jobDescription: '',
  location: '',
  employmentType: '',
  appliedDate: '',
  recruiterName: '',
  recruiterEmail: '',
  recruiterLinkedin: '',
  resumeUsed: '',
  notes: '',
  nextAction: '',
  nextActionDate: '',
};

function Field({ id, label, children, error, required = false, className = '' }) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block text-xs text-subtle-foreground">
        {label}
        {required && <span className="ml-1 text-ember">*</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-ember">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="mb-4 flex items-center gap-4">
        <p className="text-eyebrow text-subtle-foreground">{title}</p>
        <span className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
      </div>
      {children}
    </section>
  );
}

export default function AddApplicationForm({ open, onOpenChange, onSubmit }) {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const close = (next) => {
    onOpenChange(next);
    if (!next) {
      setValues(empty);
      setErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!values.company.trim()) next.company = 'Company is required';
    if (!values.role.trim()) next.role = 'Role is required';
    if (!values.status) next.status = 'Status is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      setSaving(true);
      await onSubmit({
        ...values,
        company: values.company.trim(),
        role: values.role.trim(),
        appliedDate: values.appliedDate ? new Date(values.appliedDate).toISOString() : '',
        nextActionDate: values.nextActionDate
          ? new Date(values.nextActionDate).toISOString()
          : '',
      });
      close(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl">
        <form onSubmit={handleSubmit} className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
          <DialogHeader>
            <DialogTitle>Add application</DialogTitle>
            <DialogDescription>
              Track a role you have saved or applied to. Only company, role and status are required.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <Section title="Job details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="company" label="Company" required error={errors.company}>
                  <Input
                    id="company"
                    value={values.company}
                    onChange={set('company')}
                    placeholder="Google"
                    aria-invalid={!!errors.company}
                    aria-describedby={errors.company ? 'company-error' : undefined}
                  />
                </Field>
                <Field id="role" label="Role" required error={errors.role}>
                  <Input
                    id="role"
                    value={values.role}
                    onChange={set('role')}
                    placeholder="Software Engineer"
                    aria-invalid={!!errors.role}
                    aria-describedby={errors.role ? 'role-error' : undefined}
                  />
                </Field>
                <Field id="location" label="Location">
                  <Input
                    id="location"
                    value={values.location}
                    onChange={set('location')}
                    placeholder="Bangalore"
                  />
                </Field>
                <Field id="employmentType" label="Employment type">
                  <Select
                    id="employmentType"
                    value={values.employmentType}
                    onChange={set('employmentType')}
                  >
                    <option value="">Not specified</option>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="jobUrl" label="Job URL" className="sm:col-span-2">
                  <Input
                    id="jobUrl"
                    type="url"
                    value={values.jobUrl}
                    onChange={set('jobUrl')}
                    placeholder="https://"
                  />
                </Field>
                <Field id="jobDescription" label="Job description" className="sm:col-span-2">
                  <Textarea
                    id="jobDescription"
                    value={values.jobDescription}
                    onChange={set('jobDescription')}
                    placeholder="Paste the responsibilities and requirements…"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Application">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field id="status" label="Status" required error={errors.status}>
                  <Select id="status" value={values.status} onChange={set('status')}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="appliedDate" label="Applied date">
                  <Input
                    id="appliedDate"
                    type="date"
                    value={values.appliedDate}
                    onChange={set('appliedDate')}
                  />
                </Field>
                <Field id="resumeUsed" label="Resume used">
                  <Input
                    id="resumeUsed"
                    value={values.resumeUsed}
                    onChange={set('resumeUsed')}
                    placeholder="Backend_SDE_v4.pdf"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Recruiter">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field id="recruiterName" label="Name">
                  <Input
                    id="recruiterName"
                    value={values.recruiterName}
                    onChange={set('recruiterName')}
                    placeholder="Ananya Rao"
                  />
                </Field>
                <Field id="recruiterEmail" label="Email">
                  <Input
                    id="recruiterEmail"
                    type="email"
                    value={values.recruiterEmail}
                    onChange={set('recruiterEmail')}
                    placeholder="name@company.com"
                  />
                </Field>
                <Field id="recruiterLinkedin" label="LinkedIn">
                  <Input
                    id="recruiterLinkedin"
                    value={values.recruiterLinkedin}
                    onChange={set('recruiterLinkedin')}
                    placeholder="https://linkedin.com/in/…"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Next action & notes">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="nextAction" label="Next action">
                  <Input
                    id="nextAction"
                    value={values.nextAction}
                    onChange={set('nextAction')}
                    placeholder="Technical interview"
                  />
                </Field>
                <Field id="nextActionDate" label="Next action date">
                  <Input
                    id="nextActionDate"
                    type="date"
                    value={values.nextActionDate}
                    onChange={set('nextActionDate')}
                  />
                </Field>
                <Field id="notes" label="Notes" className="sm:col-span-2">
                  <Textarea
                    id="notes"
                    value={values.notes}
                    onChange={set('notes')}
                    placeholder="Referrals, comp expectations, interview format…"
                  />
                </Field>
              </div>
            </Section>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {!saving && <Plus className="size-4" />} Add application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
