import sql from '../../configs/db.js';
import { safeDel } from '../../configs/redis.js';
import { generateChatResponse } from '../../configs/openrouter.js';
import { getDemoResumeReview, isQuotaError } from '../../configs/demoFallbacks.js';

export async function handleResumeTask(job) {
  const { type, userId } = job.data;
  let content;
  let demo = false;

  switch (type) {
    case 'resume-review': {
      const { pdfText } = job.data;
      const reviewPrompt = `Review the following resume and provide feedback on strengths and weaknesses within 300 words:\n\n${pdfText || ''}`;
      try {
        const { content: rawText } = await generateChatResponse([
          { role: 'user', content: reviewPrompt },
        ]);
        content = rawText;
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          content = getDemoResumeReview();
          demo = true;
        } else {
          throw aiError;
        }
      }

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Resume Review', ${content}, 'resume-review')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    case 'resume-tailor': {
      const { pdfText, jobDescription } = job.data;
      console.log(
        `📄 [Resume Tailor Worker] Job ${job.id}: Processing Resume (${pdfText?.length || 0} chars) against JD (${jobDescription?.length || 0} chars)`,
      );

      const systemPrompt = `You are a Principal Executive Resume Writer, ATS Algorithm Architect, and Fortune 500 Technical Recruiter.
Your objective is to take the candidate's resume and aggressively tailor and optimize it to maximize interview callback rates for the target Job Description.

Job Description:
${jobDescription}

Current Resume:
${pdfText}

CRITICAL TRANSFORMATION RULES:
1. **Aggressive ATS Tailoring**: Do NOT simply copy or mildly rephrase words. Analyze the exact skills, tech stack, architecture patterns, and domain keywords in the Job Description. Strategically weave these target keywords into the candidate's experience and project bullet points where relevant.
2. **Bullet-Point Structure (Google XYZ Formula)**:
   - Format every Experience and Project entry in "recommended" as 2 to 4 high-impact, standalone bullet points (each starting with "• ").
   - Structure every bullet with strong action verbs (e.g. "Architected", "Engineered", "Spearheaded", "Optimized", "Scaled") and quantify business/technical impact with metrics (e.g. "reducing latency by 35%", "scaling to 50k+ QPS", "improving throughput by 40%").
   - Bold key tailored keywords and metrics using markdown (e.g. "**Go** microservices", "**Redis** caching layer", "**20% faster** response times") so the improvements stand out vividly.
3. **Summary Optimization**:
   - "current": The candidate's current summary or tagline.
   - "recommended": A compelling 3-4 sentence elevator pitch tailored directly to the target role's seniority level, core tech stack, and primary domain requirements from the JD.
4. **Honesty & Integrity**:
   - Enhance framing, technical depth, and ATS keyword alignment based on the candidate's genuine background. Do not fabricate fictitious companies or jobs.
5. **Clean Section Headers**:
   - For experience and projects, populate "title" with the clean role and company (e.g. "Software Engineer | MergeMind") so the bullets remain clean and readable.

Return ONLY valid JSON matching this exact structure:
{
  "matchScore": 78,
  "matchingSkills": ["..."],
  "missingKeywords": ["..."],
  "underEmphasizedKeywords": ["..."],
  "experienceGaps": ["..."],
  "atsRecommendations": ["..."],
  "summaryOptimization": {
    "current": "...",
    "recommended": "..."
  },
  "experience": [
    {
      "title": "Role | Company",
      "current": "• Current bullet 1...\n• Current bullet 2...",
      "recommended": "• **Architected and deployed** scalable **[Key Tech from JD]**...\n• **Engineered** high-performance asynchronous pipelines reducing latency by **30%**...",
      "reason": "Directly incorporates JD keywords and restructures passive text into quantifiable impact metrics."
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "current": "• Current project bullet...",
      "recommended": "• **Designed and built** production platform with **[Key Tech]**, serving **[Metric]** users...\n• **Implemented** automated CI/CD deployment workflows with **Docker**...",
      "reason": "Highlights full-stack architectural ownership and production scalability matching the JD."
    }
  ],
  "skills": {
    "current": ["..."],
    "recommendedOrder": ["..."],
    "missing": ["..."]
  },
  "actionPlan": [
    {
      "priority": "High",
      "action": "...",
      "reason": "..."
    }
  ]
}`;

      try {
        const { content: rawText } = await generateChatResponse([
          { role: 'user', content: systemPrompt },
        ]);
        let text = (rawText || '').trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
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
          '⚠️ Resume tailor AI/parsing error, falling back to demo mode:',
          aiError?.message || aiError,
        );
        content = {
          matchScore: 82,
          matchingSkills: ['JavaScript', 'React', 'Node.js'],
          missingKeywords: ['Kafka', 'GraphQL'],
          underEmphasizedKeywords: ['AWS'],
          experienceGaps: ['No direct experience with large-scale distributed systems mentioned.'],
          atsRecommendations: ["Use exact phrasing from JD for 'Frontend Development'"],
          summaryOptimization: {
            current: 'Software Developer with experience in JS.',
            recommended:
              'Software Engineer with 3+ years experience building full-stack JavaScript applications using React and Node.js.',
          },
          experience: [
            {
              current: 'Built frontend using React.',
              recommended:
                'Developed responsive frontend architectures using React, improving load times by 20%.',
              reason: 'Quantifies impact and highlights modern frontend practices.',
            },
          ],
          projects: [
            {
              current: 'Personal Portfolio & Full-stack Web Apps',
              recommended:
                'Engineered high-performance web applications with CI/CD and automated test coverage.',
              reason: 'Demonstrates end-to-end engineering rigor aligned with job requirements.',
            },
          ],
          skills: {
            current: ['JS', 'React', 'Node'],
            recommendedOrder: ['React', 'Node.js', 'JavaScript'],
            missing: ['GraphQL', 'Kafka'],
          },
          actionPlan: [
            {
              priority: 'High',
              action: 'Add GraphQL project if applicable',
              reason: 'Strong requirement in JD',
            },
          ],
        };
        demo = true;
      }

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Resume Tailor', ${JSON.stringify(content)}, 'resume-tailor')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    default:
      throw new Error(`Unsupported resume task type: ${type}`);
  }

  return { content, demo, type };
}
