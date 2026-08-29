import crypto from 'crypto';
import sql from '../../configs/db.js';
import { safeSetEx, safeDel } from '../../configs/redis.js';
import { generateChatResponse } from '../../configs/openrouter.js';
import { getDemoEmail, getDemoBlogTitles, isQuotaError } from '../../configs/demoFallbacks.js';

export async function handleEmailTask(job) {
  const { type, userId, prompt, plan, free_usage } = job.data;
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

    default:
      throw new Error(`Unsupported email task type: ${type}`);
  }

  return { content, demo, type };
}
