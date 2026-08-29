import sql from '../../configs/db.js';
import { safeDel } from '../../configs/redis.js';
import { generateChatResponse } from '../../configs/openrouter.js';
import { isQuotaError } from '../../configs/demoFallbacks.js';

export async function handleOutreachTask(job) {
  const { type, userId } = job.data;
  let content;
  let demo = false;

  switch (type) {
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

    default:
      throw new Error(`Unsupported outreach task type: ${type}`);
  }

  return { content, demo, type };
}
