import sql from '../configs/db.js';
import { clerkClient } from '@clerk/express';
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

import { safeGet, safeSetEx, safeDel } from '../configs/redis.js';
import crypto from 'crypto';
import {
  getDemoArticle,
  getDemoBlogTitles,
  getDemoResumeReview,
  getDemoImage,
  isQuotaError,
} from '../configs/demoFallbacks.js';
import { addTask } from '../configs/queue.js';
import { ForbiddenError, ValidationError } from '../middlewares/errors.js';
import { generateChatResponse } from '../configs/openrouter.js';

// Helper to get the Socket.IO instance from the request
function emitToUser(req, event, data) {
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.auth().userId}`).emit(event, data);
  }
}

export const generateEmail = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    let { prompt, tone } = req.body;
    const fullPrompt = `${prompt}\n\n Write an email with a ${tone} tone.`;

    const cacheKey = `ai:email:${crypto.createHash('sha256').update(fullPrompt).digest('hex')}`;
    const cached = await safeGet(cacheKey);
    if (cached) return res.json({ success: true, content: cached, cached: true });

    const plan = req.plan;
    const free_usage = req.free_usage || 0;

    if (plan !== 'premium' && free_usage >= 5) {
      throw new ForbiddenError('Limit reached. Upgrade to Premium.');
    }

    // Queue background task and return taskId immediately
    const taskId = await addTask('generate-email', {
      type: 'generate-email',
      userId,
      prompt: fullPrompt,
      plan,
      free_usage,
    });

    res.status(202).json({ success: true, taskId, status: 'queued' });
  } catch (error) {
    next(error);
  }
};

export const generateBlogTitle = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    let { prompt } = req.body;
    const refinedPrompt = `${prompt}. Provide only the top 5 catchy and attractive blog titles.`;

    const taskId = await addTask('generate-blog-title', {
      type: 'generate-blog-title',
      userId,
      prompt: refinedPrompt,
      plan: req.plan,
      free_usage: req.free_usage || 0,
    });

    let content;
    let demo = false;
    try {
      const { content: rawText } = await generateChatResponse([
        { role: 'user', content: refinedPrompt },
      ]);
      content = rawText;
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        content = getDemoBlogTitles();
        demo = true;
      } else {
        return next(aiError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${refinedPrompt}, ${content}, 'blog-title')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {
      return res.json({
        success: true,
        content,
        demo,
        taskId,
        warning: 'Failed to save to database',
      });
    }

    if (req.plan !== 'premium') {
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: { free_usage: (req.free_usage || 0) + 1 },
        });
      } catch (clerkError) {}
    }

    emitToUser(req, 'task:completed', { taskId, type: 'blog-title', content, demo });
    res.json({ success: true, content, demo, taskId });
  } catch (error) {
    next(error);
  }
};

export const resumeReview = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;

    if (!resume) throw new ValidationError('No resume file uploaded');

    const dataBuffer = fs.readFileSync(resume.path);
    const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    await parser.load();
    const pdfText = await parser.getText();

    const prompt = `Review the following resume and provide feedback on strengths and weaknesses within 300 words:\n\n${pdfText}`;

    const taskId = await addTask('resume-review', {
      type: 'resume-review',
      userId,
      prompt: 'Resume Review',
      pdfText,
      plan: req.plan,
    });

    let content;
    let demo = false;
    try {
      const { content: rawText } = await generateChatResponse([{ role: 'user', content: prompt }]);
      content = rawText;
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        content = getDemoResumeReview();
        demo = true;
      } else {
        if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
        return next(aiError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Resume Review', ${content}, 'resume-review')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {
      if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
      return res.json({ success: true, content, demo, taskId, warning: 'Failed to save record' });
    }

    if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
    emitToUser(req, 'task:completed', { taskId, type: 'resume-review', content, demo });
    res.json({ success: true, content, demo, taskId });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

export const resumeTailor = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const { jobDescription } = req.body;

    if (!resume) throw new ValidationError('No resume file uploaded');
    if (!jobDescription) throw new ValidationError('No job description provided');

    const dataBuffer = fs.readFileSync(resume.path);
    const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    await parser.load();
    const pdfText = await parser.getText();

    const taskId = await addTask('resume-tailor', {
      type: 'resume-tailor',
      userId,
      prompt: 'Resume Tailor',
      pdfText,
      jobDescription,
      plan: req.plan,
    });

    if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);

    res.status(202).json({ success: true, taskId, status: 'queued' });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

export const generateImage = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;

    if (req.plan !== 'premium') throw new ForbiddenError('Premium required for images.');

    const taskId = await addTask('generate-image', {
      type: 'generate-image',
      userId,
      prompt,
      publish,
      plan: req.plan,
    });

    let secure_url;
    let demo = false;

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
        return next(imgError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type, publish) 
                VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;
      await safeDel(`user:creations:${userId}`);
      if (publish) await safeDel('creations:published');
    } catch (dbError) {}

    emitToUser(req, 'task:completed', { taskId, type: 'image', content: secure_url, demo });
    res.json({ success: true, content: secure_url, demo, taskId });
  } catch (error) {
    next(error);
  }
};

export const removeImageObject = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;

    if (!image || !object) throw new ValidationError('Missing image or object');

    const taskId = await addTask('remove-image-object', {
      type: 'remove-image-object',
      userId,
      prompt: `Removed ${object}`,
      object,
      plan: req.plan,
    });

    let imageUrl;
    let demo = false;

    try {
      const { public_id } = await cloudinary.uploader.upload(image.path);
      imageUrl = cloudinary.url(public_id, {
        transformation: [{ effect: `gen_remove:${object}` }],
        resource_type: 'image',
      });
    } catch (imgError) {
      if (isQuotaError(imgError) || imgError.http_code >= 400) {
        imageUrl = getDemoImage();
        demo = true;
      } else {
        if (fs.existsSync(image.path)) fs.unlinkSync(image.path);
        return next(imgError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${`Removed ${object}`}, ${imageUrl}, 'image')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {}

    if (fs.existsSync(image.path)) fs.unlinkSync(image.path);
    emitToUser(req, 'task:completed', { taskId, type: 'image', content: imageUrl, demo });
    res.json({ success: true, content: imageUrl, demo, taskId });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

export const removeImageBackground = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const image = req.file;

    if (!image) throw new ValidationError('No image provided');

    const taskId = await addTask('remove-image-background', {
      type: 'remove-image-background',
      userId,
      prompt: 'Background removal',
      plan: req.plan,
    });

    let secure_url;
    let demo = false;

    try {
      ({ secure_url } = await cloudinary.uploader.upload(image.path, {
        transformation: [{ effect: 'background_removal' }],
      }));
    } catch (imgError) {
      if (isQuotaError(imgError) || imgError.http_code >= 400) {
        secure_url = getDemoImage();
        demo = true;
      } else {
        if (fs.existsSync(image.path)) fs.unlinkSync(image.path);
        return next(imgError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Background removal', ${secure_url}, 'image')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {}

    if (fs.existsSync(image.path)) fs.unlinkSync(image.path);
    emitToUser(req, 'task:completed', { taskId, type: 'image', content: secure_url, demo });
    res.json({ success: true, content: secure_url, demo, taskId });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

export const analyzeLinkedinProfile = async (req, res, next) => {
  try {
    const { userId } = req.auth();
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
    } = req.body;

    if (!targetRole || !optimizationGoal || !headline) {
      throw new ValidationError('Missing required fields (targetRole, optimizationGoal, headline)');
    }

    if (posts && posts.length > 10) {
      throw new ValidationError('Cannot submit more than 10 posts');
    }

    const taskId = await addTask('linkedin-optimizer', {
      type: 'linkedin-optimizer',
      userId,
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
      plan: req.plan,
    });

    res.status(202).json({ success: true, taskId, status: 'queued' });
  } catch (error) {
    next(error);
  }
};

// Helper to save session
async function saveInterviewSession(userId, sessionId, sessionData) {
  const contentStr = JSON.stringify(sessionData);
  // Check if session exists
  const existing =
    await sql`SELECT id FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sessionId}`;

  if (existing.length > 0) {
    await sql`UPDATE creations SET content = ${contentStr}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  } else {
    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${sessionId}, ${contentStr}, 'interview-session')`;
  }
}

async function getInterviewSession(userId, sessionId) {
  const existing =
    await sql`SELECT content FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sessionId}`;
  if (existing.length > 0) {
    return typeof existing[0].content === 'string'
      ? JSON.parse(existing[0].content)
      : existing[0].content;
  }
  return null;
}

export const startInterview = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { targetRole, company, experienceLevel, interviewType, context } = req.body;

    if (!targetRole || !experienceLevel || !interviewType) {
      throw new ValidationError('Missing required fields');
    }

    const sessionId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create session record immediately with history empty
    const sessionData = {
      targetRole,
      company,
      experienceLevel,
      interviewType,
      context,
      history: [],
      status: 'active',
    };

    await saveInterviewSession(userId, sessionId, sessionData);

    // Queue background generation for the first question
    const taskId = await addTask('interview-start', {
      type: 'interview-start',
      userId,
      sessionId,
      targetRole,
      company,
      experienceLevel,
      interviewType,
      context,
      plan: req.plan,
    });

    res.status(202).json({ success: true, sessionId, taskId, status: 'queued' });
  } catch (error) {
    next(error);
  }
};

export const answerInterview = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { sessionId, answer, conclude } = req.body;

    if (!sessionId) throw new ValidationError('Missing session ID');

    const sessionData = await getInterviewSession(userId, sessionId);
    if (!sessionData) throw new ValidationError('Session not found');
    if (sessionData.status === 'concluded') throw new ValidationError('Session already concluded');

    const isConcluding = conclude || sessionData.history.length >= 10;

    if (answer) {
      sessionData.history.push({ role: 'candidate', content: answer });
      // Update session immediately with candidate's answer
      await saveInterviewSession(userId, sessionId, sessionData);
    }

    // Queue background answer evaluation and next question generation
    const taskId = await addTask('interview-answer', {
      type: 'interview-answer',
      userId,
      sessionId,
      answer,
      conclude: isConcluding,
      sessionData,
      plan: req.plan,
    });

    res.status(202).json({ success: true, taskId, status: 'queued', sessionId });
  } catch (error) {
    next(error);
  }
};

export const recruiterOutreach = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { targetRole, company, myProfile, recruiterProfile, jobDescription } = req.body;

    if (!targetRole || !company || !myProfile) {
      throw new ValidationError('Missing required fields');
    }

    const taskId = await addTask('recruiter-outreach', {
      type: 'recruiter-outreach',
      userId,
      targetRole,
      company,
      myProfile,
      recruiterProfile,
      jobDescription,
      plan: req.plan,
    });

    res.status(202).json({ success: true, taskId, status: 'queued' });
  } catch (error) {
    next(error);
  }
};

export const getCareerScore = async (req, res, next) => {
  try {
    const { userId } = req.auth();

    // Check if we have a recently cached career score in database (less than 2 hours old)
    const [recentScore] = await sql`
      SELECT content, created_at FROM creations 
      WHERE user_id = ${userId} AND type = 'career-score'
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    // If a cached score exists and req.query.recalculate is not true, return it
    if (recentScore && req.query.recalculate !== 'true') {
      const ageHours = (Date.now() - new Date(recentScore.created_at).getTime()) / (1000 * 60 * 60);
      if (ageHours < 2) {
        return res.json({
          success: true,
          content:
            typeof recentScore.content === 'string'
              ? JSON.parse(recentScore.content)
              : recentScore.content,
        });
      }
    }

    // Fetch creations to compile metrics
    const creations = await sql`
      SELECT type, content FROM creations 
      WHERE user_id = ${userId} 
      AND type IN ('resume-review', 'resume-tailor', 'linkedin-optimizer', 'interview-session')
      ORDER BY created_at DESC 
      LIMIT 15
    `;

    // Fetch user job applications count to evaluate job match progress
    const apps = await sql`
      SELECT status FROM job_applications WHERE user_id = ${userId}
    `;

    if (creations.length === 0 && apps.length === 0) {
      return res.json({ success: true, content: null });
    }

    // 1. Calculate deterministic category scores
    const categories = {};

    // Resume Score
    const resumeTailors = creations.filter((c) => c.type === 'resume-tailor');
    const resumeReviews = creations.filter((c) => c.type === 'resume-review');
    if (resumeTailors.length > 0) {
      const parsed =
        typeof resumeTailors[0].content === 'string'
          ? JSON.parse(resumeTailors[0].content)
          : resumeTailors[0].content;
      categories.resume = parsed.matchScore || 80;
    } else if (resumeReviews.length > 0) {
      categories.resume = 75; // Baseline score for parsed review
    }

    // LinkedIn Score
    const linkedinOpts = creations.filter((c) => c.type === 'linkedin-optimizer');
    if (linkedinOpts.length > 0) {
      const parsed =
        typeof linkedinOpts[0].content === 'string'
          ? JSON.parse(linkedinOpts[0].content)
          : linkedinOpts[0].content;
      categories.linkedin = parsed.overallScore || 80;
    }

    // Interview Score
    const interviewSessions = creations.filter((c) => c.type === 'interview-session');
    if (interviewSessions.length > 0) {
      let totalSessionScore = 0;
      let ratedSessionsCount = 0;
      interviewSessions.forEach((s) => {
        try {
          const parsed = typeof s.content === 'string' ? JSON.parse(s.content) : s.content;
          if (parsed.overallFeedback?.overallScore) {
            totalSessionScore += parsed.overallFeedback.overallScore * 10;
            ratedSessionsCount++;
          }
        } catch (e) {}
      });
      if (ratedSessionsCount > 0) {
        categories.interview = Math.round(totalSessionScore / ratedSessionsCount);
        categories.communication = categories.interview;
      } else {
        categories.interview = 75;
        categories.communication = 75;
      }
    }

    // Job Match Score (from job tracker + tailors)
    if (apps.length > 0) {
      const offersCount = apps.filter((a) => a.status === 'Offer').length;
      const interviewCount = apps.filter((a) =>
        ['Interview', 'Final Round'].includes(a.status),
      ).length;
      categories.jobMatch = Math.min(100, 70 + interviewCount * 5 + offersCount * 15);
    } else if (resumeTailors.length > 0) {
      const parsed =
        typeof resumeTailors[0].content === 'string'
          ? JSON.parse(resumeTailors[0].content)
          : resumeTailors[0].content;
      categories.jobMatch = parsed.matchScore || 70;
    }

    const scoreKeys = Object.keys(categories);
    if (scoreKeys.length === 0) {
      return res.json({ success: true, content: null });
    }

    const overallScore = Math.round(
      scoreKeys.reduce((sum, key) => sum + categories[key], 0) / scoreKeys.length,
    );

    // Provide generic qualitative recommendations and strengths deterministically if Gemini is offline,
    // or run a quick synchronous Gemini call to compile them elegantly.
    const dataContext = creations
      .map(
        (c) =>
          `[TYPE: ${c.type}]\n${typeof c.content === 'object' ? JSON.stringify(c.content) : c.content}`,
      )
      .join('\n\n');

    const systemPrompt = `You are a Career Profile Evaluator. Analyze the user's career readiness status and compile top strengths, weaknesses, and prioritized recommendations.
    
 Readiness Score Breakdown:
 - Overall readiness score: ${overallScore}
 - Categories: ${JSON.stringify(categories)}
 - Past tool interaction logs:
 ${dataContext.slice(0, 3000)}

 Return ONLY valid JSON:
 {
   "overallScore": ${overallScore},
   "categories": ${JSON.stringify(categories)},
   "strengths": ["...", "..."],
   "weaknesses": ["...", "..."],
   "recommendations": [
     { "impact": 3, "action": "..." }
   ]
 }`;

    let content;
    let demo = false;
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
      // Fallback
      content = {
        overallScore,
        categories,
        strengths: [
          'Actively targeting role fit optimizations',
          'Participating in interview coaching',
        ],
        weaknesses: [
          'Needs broader application tracking metrics',
          'Some profile sections could be optimized',
        ],
        recommendations: [
          { impact: 3, action: 'Complete a resume tailor optimization to target new roles.' },
          { impact: 2, action: 'Review and address missing keywords in your LinkedIn profile.' },
        ],
      };
      demo = true;
    }

    // Save creation
    await sql`INSERT INTO creations (user_id, prompt, content, type) 
              VALUES (${userId}, 'Career Score Calculation', ${JSON.stringify(content)}, 'career-score')`;
    await safeDel(`user:creations:${userId}`);

    res.json({ success: true, content, demo });
  } catch (error) {
    next(error);
  }
};

// Endpoint to check async task status
export const getTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { Queue } = await import('bullmq');
    const { bullConnection, QUEUE_NAME } = await import('../configs/queue.js');

    const queue = new Queue(QUEUE_NAME, { connection: bullConnection });
    const job = await queue.getJob(taskId);

    if (!job) {
      return res.json({ success: false, message: 'Task not found' });
    }

    const state = await job.getState();
    const result = job.returnvalue;

    res.json({
      success: true,
      task: {
        id: job.id,
        state,
        progress: job.progress,
        result: state === 'completed' ? result : null,
        failedReason: state === 'failed' ? job.failedReason : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Generic history retrieval helper
async function getHistoryByType(userId, type, req) {
  const { page = 1, limit = 3 } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 3;
  const offset = (pageNum - 1) * limitNum;

  const items = await sql`
    SELECT * FROM creations 
    WHERE user_id = ${userId} AND type = ${type} 
    ORDER BY created_at DESC 
    LIMIT ${limitNum} OFFSET ${offset}
  `;

  const countResult = await sql`
    SELECT COUNT(*) FROM creations 
    WHERE user_id = ${userId} AND type = ${type}
  `;
  const total = parseInt(countResult[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limitNum);

  return {
    success: true,
    items,
    page: pageNum,
    limit: limitNum,
    totalItems: total,
    totalPages,
  };
}

export const getResumeTailorHistory = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const result = await getHistoryByType(userId, 'resume-tailor', req);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getEmailHistory = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const result = await getHistoryByType(userId, 'email', req);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getLinkedinHistory = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const result = await getHistoryByType(userId, 'linkedin-optimizer', req);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getRecruiterOutreachHistory = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const result = await getHistoryByType(userId, 'recruiter-outreach', req);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getInterviewHistory = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const result = await getHistoryByType(userId, 'interview-session', req);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getCareerScoreHistory = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const result = await getHistoryByType(userId, 'career-score', req);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
