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

    // Queue background task and return taskId
    const taskId = await addTask('generate-email', {
      type: 'generate-email',
      userId,
      prompt: fullPrompt,
      plan,
      free_usage,
    });

  
    let content;
    let demo = false;
    try {
      const result = await model.generateContent(fullPrompt);
      content = result.response.text();
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        content = getDemoEmail();
        demo = true;
      } else {
        return next(aiError);
      }
    }

    await safeSetEx(cacheKey, 3600, content);

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${fullPrompt}, ${content}, 'email')`;
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

    emitToUser(req, 'task:completed', { taskId, type: 'email', content, demo });
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
      return res.json({ success: true, content, demo, taskId, warning: 'Failed to save to database' });
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
      "recommended": "..."
    }
  ],
  "projects": [
    {
      "current": "...",
      "recommended": "..."
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

    const taskId = await addTask('resume-tailor', {
      type: 'resume-tailor',
      userId,
      prompt: 'Resume Tailor',
      plan: req.plan,
    });

    let content;
    let demo = false;
    try {
      const result = await model.generateContent(systemPrompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      content = JSON.parse(text);
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        content = {
          matchScore: 82,
          matchingSkills: ["JavaScript", "React", "Node.js"],
          missingKeywords: ["Kafka", "GraphQL"],
          underEmphasizedKeywords: ["AWS"],
          experienceGaps: ["No direct experience with large-scale distributed systems mentioned."],
          atsRecommendations: ["Use exact phrasing from JD for 'Frontend Development'"],
          summaryOptimization: {
            current: "Software Developer with experience in JS.",
            recommended: "Software Engineer with 3+ years experience building full-stack JavaScript applications using React and Node.js."
          },
          experience: [
            {
              current: "Built frontend using React.",
              recommended: "Developed responsive frontend architectures using React, improving load times by 20%."
            }
          ],
          projects: [],
          skills: {
            current: ["JS", "React", "Node"],
            recommendedOrder: ["React", "Node.js", "JavaScript"],
            missing: ["GraphQL", "Kafka"]
          },
          actionPlan: [
            { priority: "High", action: "Add GraphQL project if applicable", reason: "Strong requirement in JD" }
          ]
        };
        demo = true;
      } else {
        if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
        return next(aiError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Resume Tailor', ${JSON.stringify(content)}, 'resume-tailor')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {
      if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
      return res.json({ success: true, content, demo, taskId, warning: 'Failed to save record' });
    }

    if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
    emitToUser(req, 'task:completed', { taskId, type: 'resume-tailor', content, demo });
    res.json({ success: true, content, demo, taskId });
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
    const { targetRole, optimizationGoal, headline, about, experience, projects, skills, education, achievements, posts } = req.body;

    if (!targetRole || !optimizationGoal || !headline) {
      throw new ValidationError('Missing required fields (targetRole, optimizationGoal, headline)');
    }

    if (posts && posts.length > 10) {
      throw new ValidationError('Cannot submit more than 10 posts');
    }

    const payloadString = JSON.stringify({
      targetRole, optimizationGoal, headline, about, experience, projects, skills, education, achievements, posts
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

    const taskId = await addTask('linkedin-optimizer', {
      type: 'linkedin-optimizer',
      userId,
      prompt: 'LinkedIn Profile Optimization',
      plan: req.plan,
    });

    let content;
    let parsedContent;
    let demo = false;

    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      if (text.startsWith('\`\`\`json')) {
        text = text.substring(7);
      } else if (text.startsWith('\`\`\`')) {
        text = text.substring(3);
      }
      if (text.endsWith('\`\`\`')) {
        text = text.substring(0, text.length - 3);
      }
      
      parsedContent = JSON.parse(text);
      content = parsedContent;
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        // Simple demo fallback
        content = {
          overallScore: 90,
          roleAlignmentScore: 95,
          summary: "Demo mode: This is a sample analysis since API quota was exceeded.",
          headline: { current: headline, recommended: "Optimized Demo Headline", alternatives: [] }
        };
        demo = true;
      } else {
        return next(aiError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'LinkedIn Profile Optimization', ${JSON.stringify(content)}, 'linkedin-optimizer')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {
      return res.json({ success: true, content, demo, taskId, warning: 'Failed to save record' });
    }

    emitToUser(req, 'task:completed', { taskId, type: 'linkedin-optimizer', content, demo });
    res.json({ success: true, content, demo, taskId });
  } catch (error) {
    next(error);
  }
};


// Helper to save session
async function saveInterviewSession(userId, sessionId, sessionData) {
  const contentStr = JSON.stringify(sessionData);
  // Check if session exists
  const existing = await sql`SELECT id FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sessionId}`;
  
  if (existing.length > 0) {
    await sql`UPDATE creations SET content = ${contentStr}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  } else {
    await sql`INSERT INTO creations (user_id, prompt, content, type) VALUES (${userId}, ${sessionId}, ${contentStr}, 'interview-session')`;
  }
}

async function getInterviewSession(userId, sessionId) {
  const existing = await sql`SELECT content FROM creations WHERE user_id = ${userId} AND type = 'interview-session' AND prompt = ${sessionId}`;
  if (existing.length > 0) {
    return typeof existing[0].content === 'string' ? JSON.parse(existing[0].content) : existing[0].content;
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
    const systemPrompt = `You are an expert technical and behavioral interviewer for a ${experienceLevel} ${targetRole} role${company ? ` at ${company}` : ''}. The interview type is ${interviewType}.
Context: ${context || 'None'}
Start the interview by asking the very first question. Ask only ONE question. Keep it concise, professional, and directly relevant to the role. Do not include any pleasantries or "Sure, let's start" prefixes. Just ask the question.`;

    let firstQuestion;
    try {
      const result = await model.generateContent(systemPrompt);
      firstQuestion = result.response.text().trim();
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        firstQuestion = "Tell me about your experience with building scalable systems.";
      } else {
        return next(aiError);
      }
    }

    const sessionData = {
      targetRole,
      company,
      experienceLevel,
      interviewType,
      context,
      history: [{ role: 'interviewer', content: firstQuestion }],
      status: 'active'
    };

    await saveInterviewSession(userId, sessionId, sessionData);
    await safeDel(`user:creations:${userId}`);

    res.json({ success: true, sessionId, firstQuestion });
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

    const isConcluding = conclude || sessionData.history.length >= 10; // Auto-conclude after 5 Q&A pairs

    if (answer) {
      sessionData.history.push({ role: 'candidate', content: answer });
    }

    // Format history for AI
    const historyText = sessionData.history.map(msg => `${msg.role === 'interviewer' ? 'Question' : 'Answer'}: ${msg.content}`).join('\n\n');

    let aiResult;
    try {
      if (isConcluding) {
        const prompt = `You are the interviewer. The interview is now concluding. Review the entire transcript and provide an overall evaluation in valid JSON.
Transcript:
${historyText}

Return ONLY JSON:
{
  "overallScore": 8.5,
  "technicalScore": 8.0,
  "communicationScore": 9.0,
  "structureScore": 8.5,
  "strongAreas": ["...", "..."],
  "weakAreas": ["...", "..."],
  "recommendedPractice": ["...", "..."]
}`;
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
          aiResult = { overallFeedback: JSON.parse(text), isConcluded: true };
        } catch(e) {
          aiResult = { 
            overallFeedback: { 
              overallScore: 8, technicalScore: 8, communicationScore: 8, structureScore: 8, 
              strongAreas: ["Good communication"], weakAreas: ["Provide more detail"], recommendedPractice: ["Review basics"] 
            }, 
            isConcluded: true 
          };
        }
        sessionData.status = 'concluded';
      } else {
        const prompt = `You are the interviewer. Evaluate the candidate's last answer, then ask the next question.
Target Role: ${sessionData.experienceLevel} ${sessionData.targetRole}
Interview Type: ${sessionData.interviewType}
Transcript:
${historyText}

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
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
          const parsed = JSON.parse(text);
          aiResult = { evaluation: parsed.evaluation, nextQuestion: parsed.nextQuestion, isConcluded: false };
          sessionData.history.push({ role: 'interviewer', content: parsed.nextQuestion });
        } catch(e) {
          aiResult = { 
            evaluation: { score: 7, strengths: ["Good attempt"], weaknesses: ["Lacks depth"], betterApproach: "Be more specific." }, 
            nextQuestion: "Can you elaborate on your experience with databases?", 
            isConcluded: false 
          };
          sessionData.history.push({ role: 'interviewer', content: aiResult.nextQuestion });
        }
      }
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        // Fallback for quota error
        if (isConcluding) {
          aiResult = { 
            overallFeedback: { overallScore: 8, technicalScore: 8, communicationScore: 8, structureScore: 8, strongAreas: ["Demo mode"], weakAreas: ["Demo mode"], recommendedPractice: ["Demo mode"] }, 
            isConcluded: true 
          };
          sessionData.status = 'concluded';
        } else {
          aiResult = { 
            evaluation: { score: 8, strengths: ["Demo Mode"], weaknesses: ["Demo Mode"], betterApproach: "Demo Mode" }, 
            nextQuestion: "Demo Question: How do you handle conflicts in a team?", 
            isConcluded: false 
          };
          sessionData.history.push({ role: 'interviewer', content: aiResult.nextQuestion });
        }
      } else {
        return next(aiError);
      }
    }

    await saveInterviewSession(userId, sessionId, sessionData);
    await safeDel(`user:creations:${userId}`);

    res.json({ success: true, ...aiResult });
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

    const taskId = await addTask('recruiter-outreach', {
      type: 'recruiter-outreach',
      userId,
      prompt: `Recruiter Outreach for ${targetRole} at ${company}`,
      plan: req.plan,
    });

    let content;
    let demo = false;
    
    try {
      const result = await model.generateContent(systemPrompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      content = JSON.parse(text);
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        content = {
          connectionRequest: `Hi, I came across your work at ${company} and I'm exploring ${targetRole} opportunities. I'd love to connect.`,
          recruiterDM: `Hi, I'm currently exploring ${targetRole} roles and came across ${company}. I'd love to connect and discuss if my background might be a fit for your team.`,
          coldEmail: {
            subject: `${targetRole} inquiry`,
            body: `Hi team,\n\nI am interested in the ${targetRole} position at ${company}. Let's connect!\n\nBest,\nDemo User`
          }
        };
        demo = true;
      } else {
        return next(aiError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Recruiter Outreach', ${JSON.stringify(content)}, 'recruiter-outreach')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {
      return res.json({ success: true, content, demo, taskId, warning: 'Failed to save record' });
    }

    emitToUser(req, 'task:completed', { taskId, type: 'recruiter-outreach', content, demo });
    res.json({ success: true, content, demo, taskId });
  } catch (error) {
    next(error);
  }
};

export const getCareerScore = async (req, res, next) => {
  try {
    const { userId } = req.auth();

    // Fetch latest creations for relevant types
    const recentCreations = await sql`
      SELECT type, content FROM creations 
      WHERE user_id = ${userId} 
      AND type IN ('resume-review', 'linkedin-optimizer', 'interview-session')
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    if (recentCreations.length === 0) {
      return res.json({ success: true, content: null });
    }

    // Extract raw data from recent creations to pass to AI
    const dataContext = recentCreations.map(c => `[TYPE: ${c.type}]\n${typeof c.content === 'object' ? JSON.stringify(c.content) : c.content}`).join('\n\n');

    const systemPrompt = `You are a Career Profile Evaluator. Analyze the user's recent interactions with various career tools (resume review, linkedin optimizer, interview coaching) and generate an aggregated Career Score.
If a data source is missing (e.g. no resume data, no interview data), do NOT penalize the overall score for its absence, simply omit it from the categories object.
The overall score should reflect their readiness based ONLY on the provided data.

Provided Data:
${dataContext}

Return ONLY valid JSON matching this structure:
{
  "overallScore": 84,
  "categories": {
    "resume": 88, // Only if resume data exists
    "linkedin": 82, // Only if linkedin data exists
    "interview": 80 // Only if interview data exists
  },
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "recommendations": [
    { "impact": 2, "action": "Improve LinkedIn headline" }
  ]
}`;

    const taskId = await addTask('career-score', {
      type: 'career-score',
      userId,
      prompt: 'Career Score Calculation',
      plan: req.plan,
    });

    let content;
    let demo = false;

    try {
      const result = await model.generateContent(systemPrompt);
      let text = result.response.text().trim();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      content = JSON.parse(text);
      
      // Normalize category keys to match frontend expectations
      if (content.categories) {
        if (content.categories.interview && !content.categories.communication) {
          content.categories.communication = content.categories.interview;
        }
      }
    } catch (aiError) {
      if (isQuotaError(aiError)) {
        content = {
          overallScore: 84,
          categories: {
            resume: 88,
            linkedin: 82,
            communication: 80
          },
          strengths: ["Strong technical background", "Good problem solving"],
          weaknesses: ["Needs better quantitative metrics", "LinkedIn headline is generic"],
          recommendations: [
            { impact: 3, action: "Add metrics to resume" },
            { impact: 2, action: "Update LinkedIn headline" }
          ]
        };
        demo = true;
      } else {
        return next(aiError);
      }
    }

    try {
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, 'Career Score Calculation', ${JSON.stringify(content)}, 'career-score')`;
      await safeDel(`user:creations:${userId}`);
    } catch (dbError) {
      return res.json({ success: true, content, demo, taskId, warning: 'Failed to save record' });
    }

    res.json({ success: true, content, demo, taskId });
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
