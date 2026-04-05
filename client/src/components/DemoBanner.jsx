import React from 'react';
import { Info } from 'lucide-react';

/**
 * Subtle banner shown when content was generated using demo fallback,
 * e.g. when API keys are exhausted. Transparent and professional.
 */
const DemoBanner = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 mt-2 mb-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
      <Info className="w-4 h-4 shrink-0" />
      <span>
        <strong>Demo Mode</strong> — API quota reached. Showing sample content to demonstrate the
        full workflow.
      </span>
    </div>
  );
};

export default DemoBanner;
