// DELETE: import OpenAI from "openai";
// ADD: Import Google SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import 'dotenv/config'
import { v2 as cloudinary } from 'cloudinary'
import axios from "axios";
import fs from "fs";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.PDFParse || pdfParseModule;

import redisClient from '../configs/redis.js';
import crypto from 'crypto';

// Initialize Google AI Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateArticle = async (req, res) => {
      try {
            console.log(req.auth());
            console.log(req.auth);

            const { userId } = req.auth();
            let { prompt, length } = req.body;
            prompt += `\n\n within approximately ${length} words.`;

            // Redis cache lookup
            try {
                  const key = `ai:article:${crypto.createHash('sha256').update(`${prompt}::${length || ''}`).digest('hex')}`;
                  const cached = await redisClient.get(key);
                  if (cached) {
                        console.log('Serving article from Redis cache');
                        return res.json({ success: true, content: cached, cached: true });
                  }
            } catch (cacheErr) {
                  console.error('Redis cache check failed', cacheErr?.message || cacheErr);
            }

            const plan = req.plan;
            console.log("Article Generation Requested in controller");
            const free_usage = req.free_usage;

            if (plan !== 'premium' && free_usage >= 5) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium Plan and continue." })
            }

            // --- START: NEW GOOGLE SDK LOGIC ---

            // 1. Select the model
            // Note: 'gemini-2.5-flash' does not exist yet. Using 'gemini-1.5-flash'.
            // If you have access to the 2.0 experimental, use 'gemini-2.0-flash-exp'.
            const model = genAI.getGenerativeModel({
                  model: "gemini-2.5-flash",
                  generationConfig: {
                        temperature: 0.7 // Maps to 'max_tokens'
                  }
            });

            // 2. Generate Content
            const result = await model.generateContent(prompt);

            const response = await result.response;

            // 3. Extract Text
            const content = response.text();
            //console.log("result of generate text: ", content);

            // --- END: NEW GOOGLE SDK LOGIC ---



            // Redis set (cache) for 1 hour
            try {
                  const key = `ai:article:${crypto.createHash('sha256').update(`${prompt}::${length || ''}`).digest('hex')}`;
                  await redisClient.setEx(key, 60 * 60, content);
            } catch (cacheErr) {
                  console.error('Redis set failed', cacheErr?.message || cacheErr);
            }

            try {
                  await sql`
                  INSERT INTO creations (user_id, prompt, content, type)
                  VALUES (${userId}, ${prompt}, ${content}, 'article')
                  `;
                  console.log("✅ Saved to database!");
            }
            catch (error) {
                  console.error("❌ Error saving to database:", error);
            }

            if (plan !== 'premium') {
                  await clerkClient.users.updateUserMetadata(userId, {
                        privateMetadata: {
                              free_usage: free_usage + 1
                        }
                  })
            }
            res.json({ success: true, content })
      }
      catch (error) {
            console.log("Google Gemini API Error");
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const generateBlogTitle = async (req, res) => {
      try {
            console.log(req.auth());
            console.log(req.auth);

            const { userId } = req.auth();
            let { prompt } = req.body;
            prompt += `i need only top 5 blog titles with catchy and attractive words.`;
            // Redis cache lookup
            try {
                  const key = `ai:blogtitle:${crypto.createHash('sha256').update(prompt).digest('hex')}`;
                  const cached = await redisClient.get(key);
                  if (cached) {
                        console.log('Serving blog titles from Redis cache');
                        return res.json({ success: true, content: cached, cached: true });
                  }
            } catch (cacheErr) {
                  console.error('Redis cache check failed', cacheErr?.message || cacheErr);
            }

            const plan = req.plan;
            console.log("HEYYY - Blog Title Requested");
            const free_usage = req.free_usage;

            if (plan !== 'premium' && free_usage >= 5) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium Plan and continue." })
            }

            // --- START: GOOGLE SDK UPDATE ---

            // 1. Initialize the model
            // Using 'gemini-1.5-flash' as 2.5 is not yet standard.
            const model = genAI.getGenerativeModel({
                  model: "gemini-2.5-flash",
                  generationConfig: {
                        temperature: 0.7// Reduced token limit for titles
                  }
            });

            // 2. Generate Content
            const result = await model.generateContent(prompt);

            const response = await result.response;

            // 3. Extract Text
            const content = response.text();
            console.log("result of blog title:", result);
            // --- END: GOOGLE SDK UPDATE ---

            console.log("HEYYY - Response Received");

            // Redis set (cache) for 30 minutes
            try {
                  const key = `ai:blogtitle:${crypto.createHash('sha256').update(prompt).digest('hex')}`;
                  await redisClient.setEx(key, 30 * 60, content);
            } catch (cacheErr) {
                  console.error('Redis set failed', cacheErr?.message || cacheErr);
            }

            try {
                  await sql`
                  INSERT INTO creations (user_id, prompt, content, type)
                  VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
                  `;
                  console.log("✅ Saved to database!");
            } catch (error) {
                  console.error("❌ Error saving to database:", error);
            }

            if (plan !== 'premium') {
                  await clerkClient.users.updateUserMetadata(userId, {
                        privateMetadata: {
                              free_usage: free_usage + 1
                        }
                  })
            }
            res.json({ success: true, content })
      }
      catch (error) {
            console.log("Google Gemini API Error (Blog Title)");
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const generateImage = async (req, res) => {
      try {
            console.log(req.auth());
            console.log(req.auth);

            const { userId } = req.auth();
            const { prompt, publish } = req.body;
            const plan = req.plan;

            console.log("HEYYY");


            if (plan !== 'premium') {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." })
            }

            const formData = new FormData();
            formData.append('prompt', prompt)
            const { data } = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
                  headers: {
                        'x-api-key': process.env.CLIPDROP_API_KEY,
                  },
                  responseType: "arraybuffer",

            })
            const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

            const { secure_url } = await cloudinary.uploader.upload(base64Image)
            try {
                  await sql`
    INSERT INTO creations (user_id, prompt, content, type, publish)
    VALUES (${userId}, ${prompt}, ${secure_url}, 'image',${publish ?? false})
  `;
                  console.log("✅ Saved to database!");
            }
            catch (error) {
                  console.error("❌ Error saving to database:", error);
            }
            res.json({ success: true, content: secure_url })
      }

      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const removeImageObject = async (req, res) => {
      try {
            console.log('🔍 removeImageObject called');
            console.log('🔍 req.file:', req.file);
            console.log('🔍 req.body:', req.body);
            console.log('🔍 req.headers:', req.headers['content-type']);

            const { userId } = req.auth();
            const object = req.body.object;
            const image = req.file;
            const plan = req.plan;

            if (!image) {
                  console.log('❌ No image file received!');
                  return res.json({ success: false, message: "No image file uploaded" });
            }

            if (!object) {
                  console.log('❌ No object specified!');
                  return res.json({ success: false, message: "Please specify object to remove" });
            }

            console.log('✅ Image received:', image.filename);
            console.log('✅ Object to remove:', object);

            if (plan !== 'premium') {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." });
            }

            const { public_id } = await cloudinary.uploader.upload(image.path);
            const imageUrl = cloudinary.url(public_id, {
                  transformation: [{ effect: `gen_remove:${object}` }],
                  resource_type: 'image'
            });

            await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')
    `;

            fs.unlinkSync(image.path);

            res.json({ success: true, content: imageUrl });
      }
      catch (error) {
            console.error('❌ Error:', error.message);
            res.json({ success: false, message: error.message });
      }
}

export const removeImageBackground = async (req, res) => {
      try {

            console.log(req.auth());
            console.log(req.auth);

            const { userId } = req.auth();
            const image = req.file;
            const plan = req.plan;

            console.log("HEYYY");


            if (plan !== 'premium') {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." })
            }


            const { secure_url } = await cloudinary.uploader.upload(image.path, {
                  transformation: [{
                        effect: 'background_removal',
                        background_removal: 'remove_the_background'
                  }]
            })
            try {
                  await sql`
    INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')
  `;
                  console.log("✅ Saved to database!");
            } catch (error) {
                  console.error("❌ Error saving to database:", error);
            }


            res.json({ success: true, content: secure_url })
      }

      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const resumeReview = async (req, res) => {
      try {
            const { userId } = req.auth();
            const resume = req.file;
            const plan = req.plan;

            if (!resume) {
                  return res.json({ success: false, message: "No resume file uploaded" });
            }

            if (plan !== 'premium') {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." });
            }

            if (resume.size > 5 * 1024 * 1024) {
                  return res.json({ success: false, message: "Resume file size exceeds allowed size 5MB" });
            }

            const dataBuffer = fs.readFileSync(resume.path);

            // ✅ Use PDFParse constructor
            const pdfData = await new pdfParse(dataBuffer);

            const prompt = `Review the following resume and provide constructive feedback on strengths, weaknesses, and areas for improvement. Resume content:\n\n${pdfData.text} and generate review within 300 words a descriptive way.`;

            // Redis cache lookup for resume review
            try {
                  const key = `ai:resume:${crypto.createHash('sha256').update(pdfData.text).digest('hex')}`;
                  const cached = await redisClient.get(key);
                  if (cached) {
                        console.log('Serving resume review from Redis cache');
                        // cleanup uploaded file
                        try { fs.unlinkSync(resume.path); } catch (e) { }
                        return res.json({ success: true, content: cached, cached: true });
                  }
            } catch (cacheErr) {
                  console.error('Redis cache check failed', cacheErr?.message || cacheErr);
            }

            // const response = await AI.chat.completions.create({
            //       model: "gemini-2.5-flash",
            //       messages: [{
            //             role: "user",
            //             content: prompt,
            //       }],
            //       temperature: 0.7,
            //       max_tokens: 1000,
            // });
            const model = genAI.getGenerativeModel({
                  model: "gemini-2.5-flash",
                  generationConfig: {
                        temperature: 0.7 // Maps to 'max_tokens'
                  }
            });
            const result = await model.generateContent(prompt);

            const response = await result.response;
            const content = response.text();

            // Cache resume review for 6 hours
            try {
                  const key = `ai:resume:${crypto.createHash('sha256').update(pdfData.text).digest('hex')}`;
                  await redisClient.setEx(key, 6 * 60 * 60, content);
            } catch (cacheErr) {
                  console.error('Redis set failed', cacheErr?.message || cacheErr);
            }

            await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')
    `;

            fs.unlinkSync(resume.path);

            res.json({ success: true, content });
      }
      catch (error) {
            console.error('❌ Error:', error);
            res.json({ success: false, message: error.message });
      }
}
