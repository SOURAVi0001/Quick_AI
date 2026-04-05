import { GoogleGenerativeAI } from '@google/generative-ai';
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Helper to get the Socket.IO instance from the request
function emitToUser(req, event, data) {
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${req.auth().userId}`).emit(event, data);
  }
}

export const generateArticle = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    let { prompt, length } = req.body;
    const fullPrompt = `${prompt}\n\n Write an article within approximately ${length} words.`;

    const cacheKey = `ai:article:${crypto.createHash('sha256').update(fullPrompt).digest('hex')}`;
    const cached = await safeGet(cacheKey);
    if (cached) return res.json({ success: true, content: cached, cached: true });

    const plan = req.plan;
    const free_usage = req.free_usage || 0;

    if (plan !== 'premium' && free_usage >= 5) {
      throw new ForbiddenError('Limit reached. Upgrade to Premium.');
    }

    // Queue background task and return taskId
    const taskId = await addTask('generate-article', {
      type: 'generate-article',
      userId,
      prompt: fullPrompt,
      plan,
      free_usage,
    });

    // Also run inline for immediate response (best-effort)
    let content;
    let demo = false;
    try {
      const result = await model.generateContent(fullPrompt);
      content = result.response.text();
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        content = getDemoArticle(length);
        demo = true;
      } else {
        return next(aiError);
      }
    }

    await safeSetEx(cacheKey, 3600, content);

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${fullPrompt}, ${content}, 'article')`;
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

    if (plan !== 'premium') {
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: { free_usage: free_usage + 1 },
        });
      } catch (clerkError) {}
    }

    emitToUser(req, 'task:completed', { taskId, type: 'article', content, demo });
    res.json({ success: true, content, demo, taskId });
  } catch (error) {
    next(error);
  }
};

export const generateBlogTitle = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    let { prompt } = req.body;
    const refinedPrompt = `${prompt}. Provide only the top 5 catchy and attractive blog titles.`;

    let content;
    let demo = false;
    try {
      const result = await model.generateContent(refinedPrompt);
      content = result.response.text();
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
      return res.json({ success: true, content, demo, warning: 'Failed to save to database' });
    }

    if (req.plan !== 'premium') {
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: { free_usage: (req.free_usage || 0) + 1 },
        });
      } catch (clerkError) {}
    }
    res.json({ success: true, content, demo });
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

    let content;
    let demo = false;
    try {
      const result = await model.generateContent(prompt);
      content = result.response.text();
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
      return res.json({ success: true, content, demo, warning: 'Failed to save record' });
    }

    if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
    res.json({ success: true, content, demo });
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

    emitToUser(req, 'task:completed', { type: 'image', content: secure_url, demo });
    res.json({ success: true, content: secure_url, demo });
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
    res.json({ success: true, content: imageUrl, demo });
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
    res.json({ success: true, content: secure_url, demo });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
