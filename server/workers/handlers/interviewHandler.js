import sql from '../../configs/db.js';
import { safeDel } from '../../configs/redis.js';
import { generateChatResponse } from '../../configs/openrouter.js';
import { isQuotaError } from '../../configs/demoFallbacks.js';

const saveSession = async (userId, sId, sData) => {
  const contentStr = JSON.stringify(sData);
  const existing =
    await sql`SELECT id FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sId}`;
  if (existing.length > 0) {
    await sql`UPDATE creations SET content = ${contentStr}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  } else {
    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${sId}, ${contentStr}, 'interview-session')`;
  }
};

export async function handleInterviewTask(job) {
  const { type, userId } = job.data;
  let content;
  let demo = false;

  switch (type) {
    case 'interview-start': {
      const { sessionId, targetRole, company, experienceLevel, interviewType, context } = job.data;
      const systemPrompt = `You are an expert technical and behavioral interviewer for a ${experienceLevel} ${targetRole} role${company ? ` at ${company}` : ''}. The interview type is ${interviewType}.
Context: ${context || 'None'}
Generate exactly 8 unique, relevant, easy-to-medium difficulty level interview questions for this role and type. Do not include any pleasantries or "Sure, let's start" prefixes. Just list the questions.`;

      let allQuestions = [];
      try {
        const { content: rawText } = await generateChatResponse([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: "Let's generate 8 interview questions." },
        ]);

        const lines = rawText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        allQuestions = lines
          .map((line) =>
            line
              .replace(/^\d+[\.\)]\s*/, '')
              .replace(/^-\s*/, '')
              .trim(),
          )
          .filter((line) => line.length > 0)
          .slice(0, 8); // Only take first 8
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          allQuestions = [
            'Tell me about your experience with building scalable systems.',
            'How do you approach debugging complex software issues?',
            'Describe a time you had to work under tight deadlines.',
            'What is your experience with CI/CD pipelines?',
            'How do you ensure code quality in a team environment?',
            'Explain how you would design a REST API.',
            'How do you handle disagreements with other engineers?',
            'What is your approach to system architecture?',
          ];
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
        history: allQuestions.map((q) => ({
          role: 'interviewer',
          content: q,
        })),
        status: 'active',
        questions: allQuestions, // Store all questions in session data
      };

      await saveSession(userId, sessionId, sessionData);
      await safeDel(`user:creations:${userId}`);

      content = { sessionId, allQuestions };

      // Return allQuestions at top level to align with client expectations
      return { content, demo, type, allQuestions };
    }

    case 'interview-all-answers': {
      const { sessionId, answers } = job.data;

      const sessionData =
        await sql`SELECT content FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sessionId}`;
      const sessionContent =
        typeof sessionData[0].content === 'string'
          ? JSON.parse(sessionData[0].content)
          : sessionData[0].content;

      // Evaluate each answer and generate feedback
      const evaluationPromises = (sessionContent.questions || []).map(async (question, i) => {
        const userAnswer = answers[i] || '';
        const systemPrompt = `
          Evaluate the candidate's answer to the following question:

          Question: ${question}
          Answer: ${userAnswer}

          Provide a structured JSON response:
          {
            "evaluation": {
              "score": 7.5,
              "strengths": ["...", "..."],
              "weaknesses": ["...", "..."],
              "missingPoints": ["...", "..."],
              "betterApproach": "..."
            }
          }
        `;

        try {
          const { content: rawText } = await generateChatResponse([
            { role: 'system', content: systemPrompt },
          ]);
          let cleanedText = rawText.trim();
          cleanedText = cleanedText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
          const parsed = JSON.parse(cleanedText);
          return parsed.evaluation || parsed;
        } catch (e) {
          return {
            score: 7,
            strengths: ['Demo Mode'],
            weaknesses: ['Demo Mode'],
            missingPoints: ['Demo Mode'],
            betterApproach: 'Demo Mode',
          };
        }
      });

      const evaluations = await Promise.all(evaluationPromises);

      // Generate dynamic overall feedback from the complete session transcript
      let overallFeedback;
      try {
        const transcript = (sessionContent.questions || [])
          .map(
            (q, i) =>
              `Question ${i + 1}: ${q}\nAnswer ${i + 1}: ${answers[i] || ''}\nEvaluation ${i + 1}: ${JSON.stringify(evaluations[i] || {})}`,
          )
          .join('\n\n');

        const summarySystemPrompt = `You are an expert interviewer reviewing a candidate's full mock interview transcript.
Analyze the questions, candidate answers, and individual evaluations, then provide an overall summary of their performance.
You MUST respond with a valid JSON object matching this schema:
{
  "overallScore": 7.8,
  "technicalScore": 8.0,
  "communicationScore": 7.5,
  "structureScore": 8.0,
  "strongAreas": ["...", "..."],
  "weakAreas": ["...", "..."],
  "recommendedPractice": ["...", "..."]
}`;
        const { content: summaryText } = await generateChatResponse([
          { role: 'system', content: summarySystemPrompt },
          { role: 'user', content: transcript },
        ]);

        let cleanedSummary = summaryText.trim();
        cleanedSummary = cleanedSummary
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        overallFeedback = JSON.parse(cleanedSummary);
      } catch (summaryError) {
        // Fallback in case of OpenRouter API / quota / JSON parsing issues
        overallFeedback = {
          overallScore:
            Math.round(
              (evaluations.reduce((sum, e) => sum + (e.score || 7), 0) / evaluations.length) * 10,
            ) / 10,
          technicalScore:
            Math.round(
              (evaluations.reduce((sum, e) => sum + ((e.score || 7) > 8 ? 9 : 7), 0) /
                evaluations.length) *
                10,
            ) / 10,
          communicationScore:
            Math.round(
              (evaluations.reduce((sum, e) => sum + ((e.score || 7) > 8 ? 9 : 7), 0) /
                evaluations.length) *
                10,
            ) / 10,
          structureScore:
            Math.round(
              (evaluations.reduce((sum, e) => sum + ((e.score || 7) > 8 ? 9 : 7), 0) /
                evaluations.length) *
                10,
            ) / 10,
          strongAreas: evaluations
            .map((e) => e.strengths || [])
            .flat()
            .filter(Boolean)
            .slice(0, 3),
          weakAreas: evaluations
            .map((e) => e.weaknesses || [])
            .flat()
            .filter(Boolean)
            .slice(0, 3),
          recommendedPractice: [
            'Review basic design patterns',
            'Structure technical responses with STAR method',
          ],
        };
      }

      sessionContent.status = 'concluded';
      sessionContent.evaluations = evaluations;
      sessionContent.overallFeedback = overallFeedback;

      // Populate root-level keys expected by client history items
      sessionContent.overallScore = overallFeedback.overallScore;
      sessionContent.strongAreas = overallFeedback.strongAreas;
      sessionContent.weakAreas = overallFeedback.weakAreas;

      sessionContent.history = (sessionContent.questions || [])
        .map((q, i) => [
          { role: 'interviewer', content: q },
          { role: 'candidate', content: answers[i] || '' },
        ])
        .flat();

      await saveSession(userId, sessionId, sessionContent);
      await safeDel(`user:creations:${userId}`);

      content = { overallFeedback, evaluations };
      break;
    }

    default:
      throw new Error(`Unsupported interview task type: ${type}`);
  }

  return { content, demo, type };
}
