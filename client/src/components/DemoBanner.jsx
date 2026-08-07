import { AlertCircle } from 'lucide-react';

const DemoBanner = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>
        <strong>Demo mode</strong> &mdash; API credits exhausted. Showing sample output to
        illustrate the full workflow.
      </span>
    </div>
  );
};

export default DemoBanner;
