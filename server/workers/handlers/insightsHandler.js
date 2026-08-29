import sql from '../../configs/db.js';
import { generateChatResponse } from '../../configs/openrouter.js';

export async function handleInsightsTask(job) {
  const { type, userId } = job.data;

  // 1. Fetch user applications
  const apps = await sql`
    SELECT * FROM job_applications WHERE user_id = ${userId}
  `;

  // 2. Fetch user's skills from past creations
  const creations = await sql`
    SELECT content, type FROM creations 
    WHERE user_id = ${userId} 
      AND type IN ('resume-tailor', 'linkedin-optimizer', 'resume-review') 
    ORDER BY created_at DESC 
    LIMIT 10
  `;

  const userSkillsSet = new Set();
  creations.forEach((c) => {
    try {
      const parsed = typeof c.content === 'string' ? JSON.parse(c.content) : c.content;
      if (!parsed) return;
      if (c.type === 'resume-tailor') {
        const current = parsed.skills?.current || [];
        current.forEach((s) => userSkillsSet.add(s));
      } else if (c.type === 'linkedin-optimizer') {
        const order = parsed.skills?.recommendedOrder || [];
        order.forEach((s) => userSkillsSet.add(s));
      }
    } catch (e) {
      // ignore parsing error
    }
  });
  const profileSkills = Array.from(userSkillsSet);

  // --- DETERMINISTIC STATS SYNTHESIS (matching client buildInsights) ---
  const REJECTED = ['Rejected'];
  const OFFERED = ['Offer'];
  const INTERVIEWED = ['Interview', 'Final Round', 'Offer'];

  const norm = (v) => (v || '').toLowerCase();
  const hasKeyword = (text, keyword) => norm(text).includes(norm(keyword));
  const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

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

  const considered = apps.filter((a) => a.status !== 'Saved');
  const closed = considered.filter(
    (a) => REJECTED.includes(a.status) || OFFERED.includes(a.status),
  );

  const isInsufficient = considered.length < 6 || closed.length < 3;

  let parsedContent;
  let demo = false;

  if (isInsufficient) {
    parsedContent = {
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
  } else {
    // Compute keywordStats
    const keywords = KEYWORDS.map((keyword) => {
      const jds = considered.filter(
        (a) => a.job_description && hasKeyword(a.job_description, keyword),
      );
      const inRejected = considered.filter(
        (a) =>
          REJECTED.includes(a.status) &&
          a.job_description &&
          hasKeyword(a.job_description, keyword),
      );
      return { keyword, jdCount: jds.length, rejectedCount: inRejected.length };
    }).filter((k) => k.jdCount > 0);

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

    // Compute categories
    const roleCategory = (role = '') => {
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

    const map = new Map();
    considered.forEach((app) => {
      const key = roleCategory(app.role);
      const entry = map.get(key) || {
        category: key,
        total: 0,
        interviews: 0,
        offers: 0,
        rejected: 0,
      };
      entry.total += 1;
      const reachedInterview = INTERVIEWED.includes(app.status);
      if (reachedInterview) entry.interviews += 1;
      if (OFFERED.includes(app.status)) entry.offers += 1;
      if (REJECTED.includes(app.status)) entry.rejected += 1;
      map.set(key, entry);
    });

    const categories = [...map.values()]
      .map((e) => ({
        ...e,
        interviewRate: pct(e.interviews, e.total),
        offerRate: pct(e.offers, e.total),
        rejectionRate: pct(e.rejected, e.total),
      }))
      .sort((a, b) => b.total - a.total);

    const winning = categories
      .filter(
        (c) =>
          c.total >= 2 && (c.offers > 0 || (c.interviewRate >= 50 && c.rejectionRate < 50)),
      )
      .sort((a, b) => b.offerRate - a.offerRate || b.interviewRate - a.interviewRate);

    const struggling = categories
      .filter((c) => c.total >= 2 && c.rejectionRate >= 50 && c.offers === 0)
      .sort((a, b) => b.rejectionRate - a.rejectionRate);

    const interviewsCount = considered.filter((a) => INTERVIEWED.includes(a.status)).length;
    const offersCount = considered.filter((a) => OFFERED.includes(a.status)).length;

    // Explicit feedback
    const explicit = [];
    considered.forEach((app) => {
      if (
        app.notes &&
        (app.notes.toLowerCase().includes('feedback') ||
          app.notes.toLowerCase().includes('recruiter said'))
      ) {
        explicit.push({
          id: `${app.id}-employer`,
          company: app.company,
          role: app.role,
          label: 'Employer feedback',
          text: app.notes,
        });
      }
    });

    // Recommendations
    const recommendations = [];
    const topStruggling = [...categories]
      .filter((c) => c.total >= 2)
      .sort((a, b) => b.rejectionRate - a.rejectionRate)[0];

    gaps.slice(0, 3).forEach((gap) => {
      recommendations.push({
        id: `gap-${gap.keyword}`,
        title: `Strengthen ${gap.keyword} fundamentals`,
        detail: `${gap.keyword} appears in ${gap.jdCount} of your job descriptions but isn't represented in your profile skills.`,
        tool: gap.keyword.match(/Design|Architecture|Distributed|System/i)
          ? { label: 'Practice with AI Interview Coach', to: '/ai/interview-coach' }
          : null,
      });
    });

    if (gaps.length) {
      recommendations.push({
        id: 'rec-resume',
        title: 'Re-tailor your resume for the requirements you keep meeting',
        detail: `Your applications repeatedly mention ${gaps
          .slice(0, 3)
          .map((g) => g.keyword)
          .join(', ')}. Surface any real exposure you have to these.`,
        tool: { label: 'Open Resume Tailor', to: '/ai/resume-tailor' },
      });
    }

    if (topStruggling && topStruggling.rejectionRate >= 50) {
      recommendations.push({
        id: 'rec-interview',
        title: `Run mock rounds for ${topStruggling.category.toLowerCase()}`,
        detail: `${topStruggling.rejectionRate}% of your ${topStruggling.category.toLowerCase()} closed out as rejections. Interview reps are the cheapest lever here.`,
        tool: { label: 'Open AI Interview Coach', to: '/ai/interview-coach' },
      });
    }

    recommendations.push({
      id: 'rec-outreach',
      title: 'Add a recruiter touchpoint to applications that have gone quiet',
      detail: 'Applications without a recruiter contact tend to stall at the screen stage.',
      tool: { label: 'Open Recruiter Outreach', to: '/ai/recruiter-outreach' },
    });

    recommendations.push({
      id: 'rec-linkedin',
      title: 'Align your LinkedIn headline with your strongest track record',
      detail: `Your profile currently leads with ${profileSkills.slice(0, 3).join(', ')}. Make the strongest-performing role family obvious to recruiters.`,
      tool: { label: 'Open LinkedIn Optimizer', to: '/ai/linkedin-optimizer' },
    });

    // Let Gemini write the summary based on the calculated stats
    const dataContext = JSON.stringify({
      applicationsAnalyzed: considered.length,
      closedOutcomes: closed.length,
      interviewRate: pct(interviewsCount, considered.length),
      offerRate: pct(offersCount, considered.length),
      winningCategory: winning[0]?.category || 'None',
      strugglingCategory: struggling[0]?.category || 'None',
      gaps: gaps.map((g) => g.keyword),
      explicitFeedback: explicit.map((e) => e.text),
    });

    const systemPrompt = `You are an expert Recruitment Analyst. Write a high-impact, professional 2-sentence summary of the candidate's job search status.
Do not invent facts, refer only to the metrics provided:
${dataContext}

Your output must be plain text. Do not use code blocks or JSON fences.`;

    let summary;
    try {
      const { content: rawText } = await generateChatResponse([
        { role: 'user', content: systemPrompt },
      ]);
      summary = rawText.trim();
    } catch (aiError) {
      summary = `Analyzed ${considered.length} applications. Overall interview rate is ${pct(interviewsCount, considered.length)}% and offer rate is ${pct(offersCount, considered.length)}%.`;
      demo = true;
    }

    parsedContent = {
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
      interviewRate: pct(interviewsCount, considered.length),
      offerRate: pct(offersCount, considered.length),
      recommendations,
    };
  }

  // Save insight in database
  const [insertedInsight] = await sql`
    INSERT INTO job_search_insights (
      user_id, summary, analysis_json, data_quality
    ) VALUES (
      ${userId}, ${parsedContent.summary}, ${JSON.stringify(parsedContent)}, ${JSON.stringify({ applicationCount: considered.length })}
    ) RETURNING id
  `;

  return {
    type: 'job-search-insights',
    resultId: insertedInsight.id,
    content: parsedContent,
    demo,
  };
}
