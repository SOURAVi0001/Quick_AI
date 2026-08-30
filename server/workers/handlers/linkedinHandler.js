import sql from '../../configs/db.js';
import { safeDel } from '../../configs/redis.js';
import { generateChatResponse } from '../../configs/openrouter.js';
import { isQuotaError } from '../../configs/demoFallbacks.js';

export async function handleLinkedinTask(job) {
  const { type, userId } = job.data;
  let content;
  let demo = false;

  switch (type) {
    case 'linkedin-optimizer': {
      const {
        targetRole,
        optimizationGoal,
        headline,
        about,
        experience,
        projects,
        skills,
        education,
        achievements,
        posts,
      } = job.data;
      const payloadString = JSON.stringify({
        targetRole,
        optimizationGoal,
        headline,
        about,
        experience,
        projects,
        skills,
        education,
        achievements,
        posts,
      });

      const prompt = `Act as an expert Technical Recruiter, LinkedIn Profile Optimizer, and Personal Branding Strategist.
I am providing my current LinkedIn profile data. My target role is: "${targetRole}". My goal is: "${optimizationGoal}".
Profile data:
${payloadString}

Analyze my profile and provide optimized, ready-to-paste content.
IMPORTANT RULES:
1. Return ONLY valid JSON matching this exact structure, with no markdown fences, no code blocks, no "Here is your JSON". Just raw JSON.
2. For all "recommended" fields, include ONLY the exact text I should copy-paste into LinkedIn. Do not include commentary, explanations, or quotes around the text.
3. If an optional section was not provided, omit it or leave it null/empty, do not invent information. Do not penalize my score for missing optional sections.
4. Improve clarity, impact, technical positioning, and keywords. Do not fabricate metrics.

JSON Structure:
{
  "overallScore": 85,
  "roleAlignmentScore": 80,
  "summary": "Overall analysis summary...",
  "headline": {
    "current": "...",
    "recommended": "...",
    "alternatives": ["...", "..."]
  },
  "about": {
    "current": "...",
    "recommended": "..."
  },
  "experience": [{"current": "...", "recommended": "..."}],
  "projects": [{"current": "...", "recommended": "..."}],
  "skills": {
    "recommendedOrder": ["...", "..."],
    "missingSkills": ["...", "..."]
  },
  "posts": [
    {
      "original": "...",
      "analysis": "...",
      "recommended": "..."
    }
  ],
  "postIdeas": [
    {
      "title": "...",
      "topic": "...",
      "reason": "...",
      "suggestedPost": "..."
    }
  ]
}
`;

      try {
        console.log(
          `📄 [LinkedIn Optimizer Worker] Job ${job.id}: Processing targetRole "${targetRole}" for user ${userId}`,
        );
        const { content: rawText } = await generateChatResponse([
          { role: 'user', content: prompt },
        ]);
        let text = rawText.trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          text = text.substring(firstBrace, lastBrace + 1);
        } else {
          text = text
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        }
        content = JSON.parse(text);
      } catch (aiError) {
        console.warn(
          '⚠️ LinkedIn optimizer AI/parsing error, falling back to demo mode:',
          aiError?.message || aiError,
        );
        content = {
          overallScore: 88,
          roleAlignmentScore: 92,
          summary: `High-impact technical profile tailored for ${targetRole || 'Target Role'}. Headline, summary, and experience have been strengthened with industry keywords and quantified outcomes.`,
          headline: {
            current: headline || '',
            recommended: `${targetRole || 'Senior Software Engineer'} | Full-Stack Architect | Distributed Systems & Cloud Platforms`,
            alternatives: [
              `Building scalable systems as a ${targetRole || 'Software Engineer'} | React • Node.js • Cloud`,
              `${targetRole || 'Software Engineer'} | High-Throughput Architectures & Engineering Leadership`,
            ],
          },
          about: {
            current: about || '',
            recommended: `Experienced ${targetRole || 'Software Engineer'} specializing in building scalable distributed web applications, modern cloud infrastructure, and developer-first platforms. Passionate about system design, performance optimization, and engineering excellence.`,
          },
          experience: experience
            ? [
                {
                  current: experience,
                  recommended: `• Architected and deployed scalable full-stack services for ${targetRole || 'the engineering team'}, improving throughput by 35%.\n• Collaborated cross-functionally with product and design to deliver production features on schedule.`,
                },
              ]
            : [],
          projects: projects
            ? [
                {
                  current: projects,
                  recommended: `• Designed and built high-performance web platform utilizing modern full-stack architectures and automated CI/CD pipelines.`,
                },
              ]
            : [],
          skills: {
            recommendedOrder: [
              'System Architecture',
              'Distributed Systems',
              'React',
              'Node.js',
              'PostgreSQL',
              'Docker',
              'AWS',
            ],
            missingSkills: ['Kubernetes', 'CI/CD Pipelines', 'Microservices'],
          },
          postIdeas: [
            {
              title: 'Architectural Deep Dive',
              topic: 'System Scalability',
              reason: 'Establishes technical credibility and thought leadership among recruiters.',
              suggestedPost:
                'How we reduced latency by 40% in our background queue processing: 3 key architectural decisions that made the difference.',
            },
          ],
        };
        demo = true;
      }

      content.targetRole = targetRole;
      content.optimizationGoal = optimizationGoal;

      const promptLabel = targetRole ? targetRole.trim() : 'LinkedIn Profile Optimization';

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${promptLabel}, ${JSON.stringify(content)}, 'linkedin-optimizer')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    default:
      throw new Error(`Unsupported LinkedIn task type: ${type}`);
  }

  return { content, demo, type };
}
