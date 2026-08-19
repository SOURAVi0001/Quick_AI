import { AlertCircle } from 'lucide-react';

const DemoBanner = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
      <AlertCircle className="size-4 shrink-0 text-warning" />
      <span>
        <strong className="text-foreground">Demo mode</strong> &mdash; API credits exhausted.
        Showing sample output to illustrate the full workflow.
      </span>
    </div>
  );
};

export default DemoBanner;
