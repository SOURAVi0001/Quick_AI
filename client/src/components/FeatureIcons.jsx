export const ArticleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 6h12a2 2 0 012 2v16a2 2 0 01-2 2H10a2 2 0 01-2-2V8a2 2 0 012-2z" />
    <path d="M13 12h6" opacity="0.5" />
    <path d="M13 16h6" opacity="0.5" />
    <path d="M13 20h4" opacity="0.5" />
    <path d="M22 8l-5 5" opacity="0.7" />
    <circle cx="24" cy="6" r="3" fill="currentColor" stroke="none" opacity="0.3" />
    <circle cx="24" cy="6" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const HashIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v22" />
    <path d="M20 5v22" />
    <path d="M5 12h22" />
    <path d="M5 20h22" />
    <circle cx="24" cy="24" r="4" fill="currentColor" stroke="none" opacity="0.15" />
    <path d="M23 24l1 1 2-2" fill="none" opacity="0" strokeWidth="1.5">
      <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
    </path>
  </svg>
);

export const ImageIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="26" height="22" rx="3" />
    <path d="M3 22l6-6 4 4 5-5 8 7" />
    <circle cx="10" cy="12" r="2.5" />
    <circle cx="27" cy="7" r="3" fill="currentColor" stroke="none" opacity="0.2" />
    <circle cx="28" cy="6" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const BackgroundIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="16" cy="16" r="11" />
    <circle cx="16" cy="16" r="7" opacity="0.3" strokeDasharray="2 2" />
    <circle cx="16" cy="13" r="3" />
    <path d="M12 22c0-2 1.8-4 4-4s4 2 4 4" />
    <path d="M4 16H2" opacity="0.4" />
    <path d="M30 16h-2" opacity="0.4" />
    <path d="M16 4V2" opacity="0.4" />
    <path d="M16 30v-2" opacity="0.4" />
  </svg>
);

export const EraserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 20l6 6 14-14a2 2 0 000-2.83l-3.17-3.17a2 2 0 00-2.83 0L6 20z" />
    <path d="M10 24l-4 4h12" opacity="0.6" />
    <circle cx="24" cy="8" r="1.5" fill="currentColor" stroke="none" opacity="0.15" />
    <circle cx="26" cy="6" r="1" fill="currentColor" stroke="none" opacity="0.3" />
    <circle cx="27" cy="9" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const ResumeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 4h10l6 6v18a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
    <path d="M18 4v6h6" opacity="0.5" />
    <path d="M12 16h8" opacity="0.5" />
    <path d="M12 20h6" opacity="0.5" />
    <path d="M12 24h4" opacity="0.5" />
    <path d="M25 22l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="28" cy="19" r="4" fill="none" opacity="0.15" />
  </svg>
);
