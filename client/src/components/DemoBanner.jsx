import { AlertCircle } from 'lucide-react';

const DemoBanner = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 mt-2 mb-1 rounded-lg bg-muted border text-muted-foreground text-xs">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>
        <strong>Demo Mode</strong> &mdash; API quota reached. Showing sample content to demonstrate
        the full workflow.
      </span>
    </div>
  );
};

export default DemoBanner;
