import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import sql from '../configs/db.js';
import { safeSetEx, safeDel } from '../configs/redis.js';
import crypto from 'crypto';
import {
  getDemoEmail,
  getDemoBlogTitles,
  getDemoResumeReview,
  getDemoImage,
  isQuotaError,
} from '../configs/demoFallbacks.js';
import 'dotenv/config';
import { generateChatResponse } from '../configs/openrouter.js';

export async function processAITask(job) {
  const { type, userId, prompt, plan, free_usage, publish } = job.data;

  let content;
  let demo = false;

  switch (type) {
    case 'generate-email': {
      const cacheKey = `ai:email:${crypto.createHash('sha256').update(prompt).digest('hex')}`;

      const structuredPrompt = `${prompt}

Return ONLY valid JSON matching this exact structure:
{
  "subject": "Email subject line...",
  "body": "Full email body..."
}`;

      try {
        const { content: rawText } = await generateChatResponse([
          { role: 'user', content: structuredPrompt },
        ]);
        let text = rawText.trim();
        text = text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        content = JSON.parse(text);
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          content = {
            subject: 'Application Follow-up',
            body: getDemoEmail(),
          };
          demo = true;
        } else {
          try {
            const { content: rawTextFallback } = await generateChatResponse([
              { role: 'user', content: prompt },
            ]);
            content = {
              subject: 'Application Update',
              body: rawTextFallback,
            };
          } catch (e) {
            throw aiError;
          }
        }
      }

      await safeSetEx(cacheKey, 3600, JSON.stringify(content));

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${prompt}, ${JSON.stringify(content)}, 'email')`;
      await safeDel(`user:creations:${userId}`);

      if (plan !== 'premium') {
        try {
          const { clerkClient } = await import('@clerk/express');
          await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata: { free_usage: (free_usage || 0) + 1 },
          });
        } catch (clerkError) {}
      }
      break;
    }

    case 'generate-blog-title': {
      try {
        const { content: rawText } = await generateChatResponse([
          { role: 'user', content: prompt },
        ]);
        content = rawText;
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          content = getDemoBlogTitles();
          demo = true;
        } else {
          throw aiError;
        }
      }

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${prompt}, ${content}, 'blog-title')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

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
      const systemPrompt = `You are an Expert Resume Writer, ATS Specialist, and Technical Recruiter. 
Analyze the provided resume against the job description and output an optimized resume strategy.

Job Description:
${jobDescription}

Current Resume:
${pdfText}

Rules:
1. Never invent or fabricate companies, job titles, technologies, projects, metrics, or years of experience.
2. Optimize sections for ATS readability, impact, and clarity.
3. Identify genuine gaps between the JD and the resume.
4. Provide the exact text to copy-paste for the recommended sections. Do not include AI commentary inside the "recommended" text.

Return ONLY valid JSON matching this exact structure:
{
  "matchScore": 75,
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
      "current": "...",
      "recommended": "...",
      "reason": "..."
    }
  ],
  "projects": [
    {
      "current": "...",
      "recommended": "...",
      "reason": "..."
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
        let text = rawText.trim();
        text = text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        content = JSON.parse(text);
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          content = {
            matchScore: 82,
            matchingSkills: ['JavaScript', 'React', 'Node.js'],
            missingKeywords: ['Kafka', 'GraphQL'],
            underEmphasizedKeywords: ['AWS'],
            experienceGaps: [
              'No direct experience with large-scale distributed systems mentioned.',
            ],
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
              },
            ],
            projects: [],
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
        } else {
          throw aiError;
        }
      }

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Resume Tailor', ${JSON.stringify(content)}, 'resume-tailor')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

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
        const { content: rawText } = await generateChatResponse([
          { role: 'user', content: prompt },
        ]);
        let text = rawText.trim();
        text = text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        content = JSON.parse(text);
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          content = {
            overallScore: 90,
            roleAlignmentScore: 95,
            summary: 'Demo mode: This is a sample analysis since API quota was exceeded.',
            headline: {
              current: headline,
              recommended: 'Optimized Demo Headline',
              alternatives: [],
            },
          };
          demo = true;
        } else {
          throw aiError;
        }
      }

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'LinkedIn Profile Optimization', ${JSON.stringify(content)}, 'linkedin-optimizer')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    case 'recruiter-outreach': {
      const { targetRole, company, myProfile, recruiterProfile, jobDescription } = job.data;
      const systemPrompt = `You are an expert career coach and technical recruiter. Generate 3 personalized outreach messages for a candidate.
Target Role: ${targetRole}
Target Company: ${company}
Candidate Profile: ${myProfile}
Recruiter Profile (optional): ${recruiterProfile || 'Not provided'}
Job Description (optional): ${jobDescription || 'Not provided'}

Rules:
- Do not fabricate experience, companies, or skills.
- Use the optional information ONLY if provided.
- Keep messages professional and concise.

Return ONLY valid JSON matching this exact structure:
{
  "connectionRequest": "Short LinkedIn connection request...",
  "recruiterDM": "Slightly longer personalized LinkedIn message...",
  "coldEmail": {
    "subject": "Email subject line...",
    "body": "Full email body..."
  }
}`;

      try {
        const { content: rawText } = await generateChatResponse([
          { role: 'user', content: systemPrompt },
        ]);
        let text = rawText.trim();
        text = text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        content = JSON.parse(text);
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          content = {
            connectionRequest: `Hi, I came across your work at ${company} and I'm exploring ${targetRole} opportunities. I'd love to connect.`,
            recruiterDM: `Hi, I'm currently exploring ${targetRole} roles and came across ${company}. I'd love to connect and discuss if my background might be a fit for your team.`,
            coldEmail: {
              subject: `${targetRole} inquiry`,
              body: `Hi team,\n\nI am interested in the ${targetRole} position at ${company}. Let's connect!\n\nBest,\nDemo User`,
            },
          };
          demo = true;
        } else {
          throw aiError;
        }
      }

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Recruiter Outreach', ${JSON.stringify(content)}, 'recruiter-outreach')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    case 'interview-start': {
      const { sessionId, targetRole, company, experienceLevel, interviewType, context } = job.data;
      const systemPrompt = `You are an expert technical and behavioral interviewer for a ${experienceLevel} ${targetRole} role${company ? ` at ${company}` : ''}. The interview type is ${interviewType}.
Context: ${context || 'None'}
Start the interview by asking the very first question. Ask only ONE question. Keep it concise, professional, and directly relevant to the role. Do not include any pleasantries or "Sure, let's start" prefixes. Just ask the question.`;

      let firstQuestion;
      let firstQuestionReasoning = null;
      try {
        const { content: rawText, reasoning_details } = await generateChatResponse([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: "Let's start the interview." },
        ]);
        firstQuestion = rawText.trim();
        firstQuestionReasoning = reasoning_details;
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          firstQuestion = 'Tell me about your experience with building scalable systems.';
          demo = true;
        } else {
          throw aiError;
        }
      }

      const sessionData = {
        targetRole,
        company,
        experienceLevel,
        interviewType,
        context,
        history: [
          {
            role: 'interviewer',
            content: firstQuestion,
            reasoning_details: firstQuestionReasoning,
          },
        ],
        status: 'active',
      };

      const saveSession = async (sId, sData) => {
        const contentStr = JSON.stringify(sData);
        const existing =
          await sql`SELECT id FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sId}`;
        if (existing.length > 0) {
          await sql`UPDATE creations SET content = ${contentStr}, updated_at = NOW() WHERE id = ${existing[0].id}`;
        } else {
          await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${sId}, ${contentStr}, 'interview-session')`;
        }
      };

      await saveSession(sessionId, sessionData);
      await safeDel(`user:creations:${userId}`);

      content = { sessionId, firstQuestion };
      break;
    }

    case 'interview-answer': {
      const { sessionId, answer, conclude, sessionData } = job.data;
      const isConcluding = conclude;

      const chatMessages = sessionData.history.map((msg) => {
        const payload = {
          role: msg.role === 'interviewer' ? 'assistant' : 'user',
          content: msg.content,
        };
        if (msg.reasoning_details) {
          payload.reasoning_details = msg.reasoning_details;
        }
        return payload;
      });

      if (isConcluding) {
        chatMessages.push({
          role: 'user',
          content: `You are the interviewer. The interview is now concluding. Review the entire transcript and provide an overall evaluation in valid JSON.
Return ONLY JSON:
{
  "overallFeedback": {
    "overallScore": 8.5,
    "technicalScore": 8.0,
    "communicationScore": 9.0,
    "structureScore": 8.5,
    "strongAreas": ["...", "..."],
    "weakAreas": ["...", "..."],
    "recommendedPractice": ["...", "..."]
  }
}`,
        });
      } else {
        const systemPrompt = `You are the interviewer. Evaluate the candidate's last answer, then ask the next question.
Target Role: ${sessionData.experienceLevel} ${sessionData.targetRole}
Interview Type: ${sessionData.interviewType}

Return ONLY valid JSON:
{
  "evaluation": {
    "score": 7.5,
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "missingPoints": ["...", "..."],
    "betterApproach": "..."
  },
  "nextQuestion": "..."
}`;
        chatMessages.unshift({ role: 'system', content: systemPrompt });
      }

      let aiResult;
      try {
        if (isConcluding) {
          const { content: rawText } = await generateChatResponse(chatMessages);
          let text = rawText.trim();
          text = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

          try {
            const parsed = JSON.parse(text);
            aiResult = { overallFeedback: parsed.overallFeedback || parsed, isConcluded: true };
          } catch (e) {
            aiResult = {
              overallFeedback: {
                overallScore: 8,
                technicalScore: 8,
                communicationScore: 8,
                structureScore: 8,
                strongAreas: ['Good communication'],
                weakAreas: ['Provide more detail'],
                recommendedPractice: ['Review basics'],
              },
              isConcluded: true,
            };
          }
          sessionData.status = 'concluded';
          sessionData.overallFeedback = aiResult.overallFeedback;
        } else {
          const { content: rawText, reasoning_details } = await generateChatResponse(chatMessages);
          let text = rawText.trim();
          text = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

          try {
            const parsed = JSON.parse(text);
            aiResult = {
              evaluation: parsed.evaluation,
              nextQuestion: parsed.nextQuestion,
              isConcluded: false,
            };
            sessionData.history.push({
              role: 'interviewer',
              content: parsed.nextQuestion,
              reasoning_details,
            });
          } catch (e) {
            aiResult = {
              evaluation: {
                score: 7,
                strengths: ['Good attempt'],
                weaknesses: ['Lacks depth'],
                betterApproach: 'Be more specific.',
              },
              nextQuestion: 'Can you elaborate on your experience with databases?',
              isConcluded: false,
            };
            sessionData.history.push({
              role: 'interviewer',
              content: aiResult.nextQuestion,
              reasoning_details: null,
            });
          }
        }
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          if (isConcluding) {
            aiResult = {
              overallFeedback: {
                overallScore: 8,
                technicalScore: 8,
                communicationScore: 8,
                structureScore: 8,
                strongAreas: ['Demo mode'],
                weakAreas: ['Demo mode'],
                recommendedPractice: ['Demo mode'],
              },
              isConcluded: true,
            };
            sessionData.status = 'concluded';
            sessionData.overallFeedback = aiResult.overallFeedback;
          } else {
            aiResult = {
              evaluation: {
                score: 8,
                strengths: ['Demo Mode'],
                weaknesses: ['Demo Mode'],
                betterApproach: 'Demo Mode',
              },
              nextQuestion: 'Demo Question: How do you handle conflicts in a team?',
              isConcluded: false,
            };
            sessionData.history.push({
              role: 'interviewer',
              content: aiResult.nextQuestion,
              reasoning_details: null,
            });
          }
          demo = true;
        } else {
          throw aiError;
        }
      }

      const saveSession = async (sId, sData) => {
        const contentStr = JSON.stringify(sData);
        const existing =
          await sql`SELECT id FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sId}`;
        if (existing.length > 0) {
          await sql`UPDATE creations SET content = ${contentStr}, updated_at = NOW() WHERE id = ${existing[0].id}`;
        } else {
          await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${sId}, ${contentStr}, 'interview-session')`;
        }
      };

      await saveSession(sessionId, sessionData);
      await safeDel(`user:creations:${userId}`);

      content = aiResult;
      break;
    }

    case 'generate-image': {
      let secure_url;

      try {
        const formData = new FormData();
        formData.append('prompt', prompt);

        const { data } = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
          headers: { 'x-api-key': process.env.CLIPDROP_API_KEY },
          responseType: 'arraybuffer',
        });

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;
        ({ secure_url } = await cloudinary.uploader.upload(base64Image));
      } catch (imgError) {
        if (isQuotaError(imgError) || imgError.response?.status >= 400) {
          secure_url = getDemoImage();
          demo = true;
        } else {
          throw imgError;
        }
      }

      content = secure_url;

      await sql`INSERT INTO creations (user_id, prompt, content, type, publish) 
                VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;
      await safeDel(`user:creations:${userId}`);
      if (publish) await safeDel('creations:published');
      break;
    }

    case 'remove-image-object': {
      content = getDemoImage();
      demo = true;
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${prompt}, ${content}, 'image')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    case 'remove-image-background': {
      content = getDemoImage();
      demo = true;
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${prompt}, ${content}, 'image')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    case 'job-search-insights': {
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

    default:
      throw new Error(`Unknown task type: ${type}`);
  }

  return { content, demo, type };
}
