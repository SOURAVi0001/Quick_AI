import { mockProfile } from './mockData';

/**
 * Deterministic, evidence-only insight engine for the Job Application Tracker.
 *
 * Rules baked in here on purpose:
 * - Nothing is invented. Every list item traces back to a field on the user's
 *   own applications (job description text, status, notes, feedback fields).
 * - Employer-provided text (employerFeedback / rejectionMessage /
 *   interviewFeedback marked `employer`) is surfaced separately as EXPLICIT
 *   feedback. Everything else is labelled as an AI-inferred pattern.
 * - Correlation language only: "appears frequently in rejected applications",
 *   never "this is why you were rejected".
 * - Below MIN_APPLICATIONS closed outcomes we refuse to claim patterns.
 */

export const MIN_APPLICATIONS = 6;
export const MIN_CLOSED = 3;

const REJECTED = ['Rejected'];
const OFFERED = ['Offer'];
const INTERVIEWED = ['Interview', 'Final Round', 'Offer'];

/** Recognised requirement vocabulary — matched literally against JD text. */
const KEYWORDS = [
  'Kafka',
  'Kubernetes',
  'Distributed Systems',
  'System Design',
  'gRPC',
  'Go',
  'Java',
  'Node.js',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'REST APIs',
  'GraphQL',
  'React',
  'TypeScript',
  'JavaScript',
  'Electron',
  'Rails',
  'Docker',
  'Observability',
  'Micro-frontends',
  'Frontend Architecture',
  'Performance',
  'Design Systems',
  'DSA',
  'Low-latency',
  'Event Streaming',
  'Caching',
  'SQL',
];

const norm = (v) => (v || '').toLowerCase();

const hasKeyword = (text, keyword) => norm(text).includes(norm(keyword));

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

const reachedInterview = (app) =>
  INTERVIEWED.includes(app.status) ||
  (app.timeline || []).some((t) => INTERVIEWED.includes(t.label));

/** Coarse role family so per-role stats aren't split across 18 unique titles. */
export const roleCategory = (role = '') => {
  const r = norm(role);
  if (r.includes('front')) return 'Frontend roles';
  if (r.includes('back')) return 'Backend roles';
  if (r.includes('full stack') || r.includes('fullstack')) return 'Full-stack roles';
  if (r.includes('platform') || r.includes('infra')) return 'Platform / infra roles';
  if (r.includes('sde') || r.includes('software engineer')) return 'SDE / generalist roles';
  if (r.includes('product')) return 'Product engineering roles';
  if (r.includes('design')) return 'Design engineering roles';
  return 'Other roles';
};

function keywordStats(applications) {
  const considered = applications.filter((a) => a.jobDescription);
  const rejected = considered.filter((a) => REJECTED.includes(a.status));
  return KEYWORDS.map((keyword) => {
    const jds = considered.filter((a) => hasKeyword(a.jobDescription, keyword));
    const inRejected = rejected.filter((a) => hasKeyword(a.jobDescription, keyword));
    return { keyword, jdCount: jds.length, rejectedCount: inRejected.length };
  }).filter((k) => k.jdCount > 0);
}

function categoryStats(applications) {
  const map = new Map();
  applications.forEach((app) => {
    const key = roleCategory(app.role);
    const entry = map.get(key) || { category: key, total: 0, interviews: 0, offers: 0, rejected: 0 };
    entry.total += 1;
    if (reachedInterview(app)) entry.interviews += 1;
    if (OFFERED.includes(app.status)) entry.offers += 1;
    if (REJECTED.includes(app.status)) entry.rejected += 1;
    map.set(key, entry);
  });
  return [...map.values()].map((e) => ({
    ...e,
    interviewRate: pct(e.interviews, e.total),
    offerRate: pct(e.offers, e.total),
    rejectionRate: pct(e.rejected, e.total),
  }));
}

function explicitFeedback(applications) {
  const out = [];
  applications.forEach((app) => {
    if (app.employerFeedback)
      out.push({
        id: `${app.id}-employer`,
        company: app.company,
        role: app.role,
        label: 'Employer feedback',
        text: app.employerFeedback,
      });
    if (app.rejectionMessage)
      out.push({
        id: `${app.id}-rejection`,
        company: app.company,
        role: app.role,
        label: 'Rejection message',
        text: app.rejectionMessage,
      });
    if (app.interviewFeedback && app.interviewFeedbackSource === 'employer')
      out.push({
        id: `${app.id}-interview`,
        company: app.company,
        role: app.role,
        label: 'Interview feedback',
        text: app.interviewFeedback,
      });
  });
  return out;
}

function recommendations({ gaps, categories, profileSkills, hasExplicit }) {
  const recs = [];
  const struggling = [...categories]
    .filter((c) => c.total >= 2)
    .sort((a, b) => b.rejectionRate - a.rejectionRate)[0];

  gaps.slice(0, 3).forEach((gap) => {
    recs.push({
      id: `gap-${gap.keyword}`,
      title: `Strengthen ${gap.keyword} fundamentals`,
      detail: `${gap.keyword} appears in ${gap.jdCount} of your job descriptions but isn't represented in your profile skills.`,
      tool: gap.keyword.match(/Design|Architecture|Distributed|System/i)
        ? { label: 'Practice with AI Interview Coach', to: '/ai/interview-coach' }
        : null,
    });
  });

  if (gaps.length) {
    recs.push({
      id: 'rec-resume',
      title: 'Re-tailor your resume for the requirements you keep meeting',
      detail: `Your applications repeatedly mention ${gaps
        .slice(0, 3)
        .map((g) => g.keyword)
        .join(', ')}. Surface any real exposure you have to these.`,
      tool: { label: 'Open Resume Tailor', to: '/ai/resume-tailor' },
    });
  }

  if (struggling && struggling.rejectionRate >= 50) {
    recs.push({
      id: 'rec-interview',
      title: `Run mock rounds for ${struggling.category.toLowerCase()}`,
      detail: `${struggling.rejectionRate}% of your ${struggling.category.toLowerCase()} closed out as rejections. Interview reps are the cheapest lever here.`,
      tool: { label: 'Open AI Interview Coach', to: '/ai/interview-coach' },
    });
  }

  const noRecruiterContact = 'Applications without a recruiter contact tend to stall at the screen stage.';
  recs.push({
    id: 'rec-outreach',
    title: 'Add a recruiter touchpoint to applications that have gone quiet',
    detail: noRecruiterContact,
    tool: { label: 'Open Recruiter Outreach', to: '/ai/recruiter-outreach' },
  });

  recs.push({
    id: 'rec-linkedin',
    title: 'Align your LinkedIn headline with your strongest track record',
    detail: `Your profile currently leads with ${profileSkills.slice(0, 3).join(', ')}. Make the strongest-performing role family obvious to recruiters.`,
    tool: { label: 'Open LinkedIn Optimizer', to: '/ai/linkedin-optimizer' },
  });

  if (!hasExplicit) {
    recs.push({
      id: 'rec-feedback',
      title: 'Ask for feedback after each closed application',
      detail:
        'You have little explicit employer feedback on record, so these insights rest on patterns rather than stated reasons.',
      tool: { label: 'Draft the ask in Recruiter Outreach', to: '/ai/recruiter-outreach' },
    });
  }

  return recs;
}

/**
 * Builds the insight snapshot from the user's own applications only.
 * Returns `{ insufficient: true }` shape when the dataset is too thin.
 */
export function buildInsights(applications = [], profile = mockProfile) {
  const generatedAt = new Date().toISOString();
  const profileSkills = profile?.skills || [];
  const considered = applications.filter((a) => a.status !== 'Saved');
  const closed = considered.filter(
    (a) => REJECTED.includes(a.status) || OFFERED.includes(a.status),
  );

  if (considered.length < MIN_APPLICATIONS || closed.length < MIN_CLOSED) {
    return {
      id: `ins-${Date.now()}`,
      generatedAt,
      insufficient: true,
      applicationsAnalyzed: considered.length,
      closedOutcomes: closed.length,
      summary:
        'There is not enough application history yet to determine reliable patterns. Add more applications and record their outcomes, then refresh.',
      requirements: [],
      rejectedKeywords: [],
      profileSkills,
      gaps: [],
      categories: [],
      winning: [],
      struggling: [],
      explicit: [],
      recommendations: [],
      interviewRate: 0,
      offerRate: 0,
    };
  }

  const keywords = keywordStats(considered);
  const requirements = [...keywords].sort((a, b) => b.jdCount - a.jdCount).slice(0, 8);
  const rejectedKeywords = keywords
    .filter((k) => k.rejectedCount >= 2)
    .sort((a, b) => b.rejectedCount - a.rejectedCount)
    .slice(0, 6);

  const inProfile = (keyword) =>
    profileSkills.some(
      (s) =>
        norm(s) === norm(keyword) ||
        norm(keyword).includes(norm(s)) ||
        norm(s).includes(norm(keyword)),
    );

  const gaps = keywords
    .filter((k) => k.jdCount >= 2 && !inProfile(k.keyword))
    .sort((a, b) => b.jdCount - a.jdCount)
    .slice(0, 6);

  const categories = categoryStats(considered).sort((a, b) => b.total - a.total);
  const winning = categories
    .filter((c) => c.total >= 2 && (c.offers > 0 || (c.interviewRate >= 50 && c.rejectionRate < 50)))
    .sort((a, b) => b.offerRate - a.offerRate || b.interviewRate - a.interviewRate);
  const struggling = categories
    .filter((c) => c.total >= 2 && c.rejectionRate >= 50 && c.offers === 0)
    .sort((a, b) => b.rejectionRate - a.rejectionRate);

  const interviews = considered.filter(reachedInterview).length;
  const offers = considered.filter((a) => OFFERED.includes(a.status)).length;
  const explicit = explicitFeedback(considered);

  const strongSkills = profileSkills.filter((s) =>
    winning.length
      ? considered.some(
          (a) =>
            OFFERED.includes(a.status) && a.jobDescription && hasKeyword(a.jobDescription, s),
        )
      : false,
  );

  const summary = [
    `Based on your last ${considered.length} applications, you convert best in ${
      winning[0]?.category.toLowerCase() || 'no clearly dominant role family yet'
    }${strongSkills.length ? ` involving ${strongSkills.slice(0, 3).join(', ')}` : ''}.`,
    `Overall, ${interviews} of ${considered.length} applications reached an interview stage (${pct(
      interviews,
      considered.length,
    )}%) and ${offers} reached an offer (${pct(offers, considered.length)}%).`,
    rejectedKeywords.length
      ? `Requirements such as ${rejectedKeywords
          .slice(0, 3)
          .map((k) => k.keyword)
          .join(', ')} appear frequently in applications that ended in rejection — a correlation in your history, not a stated reason.`
      : 'No requirement appears often enough across rejected applications to call it a pattern.',
  ].join(' ');

  return {
    id: `ins-${Date.now()}`,
    generatedAt,
    insufficient: false,
    applicationsAnalyzed: considered.length,
    closedOutcomes: closed.length,
    summary,
    requirements,
    rejectedKeywords,
    profileSkills,
    gaps,
    categories,
    winning,
    struggling,
    explicit,
    interviewRate: pct(interviews, considered.length),
    offerRate: pct(offers, considered.length),
    recommendations: recommendations({
      gaps,
      categories,
      profileSkills,
      hasExplicit: explicit.length > 0,
    }),
  };
}
