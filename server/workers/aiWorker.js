import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import sql from '../configs/db.js';
import { safeSetEx, safeDel } from '../configs/redis.js';
import crypto from 'crypto';
import {
  getDemoArticle,
  getDemoBlogTitles,
  getDemoResumeReview,
  getDemoImage,
  isQuotaError,
} from '../configs/demoFallbacks.js';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function processAITask(job) {
  const { type, userId, prompt, plan, free_usage, publish } = job.data;

  let content;
  let demo = false;

  switch (type) {
    case 'generate-article': {
      const cacheKey = `ai:article:${crypto.createHash('sha256').update(prompt).digest('hex')}`;

      try {
        const result = await model.generateContent(prompt);
        content = result.response.text();
      } catch (aiError) {
        if (isQuotaError(aiError)) {
          content = getDemoArticle(300);
          demo = true;
        } else {
          throw aiError;
        }
      }

      await safeSetEx(cacheKey, 3600, content);

      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${prompt}, ${content}, 'article')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    case 'generate-blog-title': {
      try {
        const result = await model.generateContent(prompt);
        content = result.response.text();
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

    default:
      throw new Error(`Unknown task type: ${type}`);
  }

  return { content, demo, type };
}
