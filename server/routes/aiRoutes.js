import express from 'express';
import { auth } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  generateEmail,
  generateBlogTitle,
  generateImage,
  removeImageBackground,
  removeImageObject,
  resumeReview,
  getTaskStatus,
  analyzeLinkedinProfile,
  startInterview,
  answerInterview,
  recruiterOutreach,
  getCareerScore,
  resumeTailor,
  getResumeTailorHistory,
  getEmailHistory,
  getLinkedinHistory,
  getRecruiterOutreachHistory,
  getInterviewHistory,
  getCareerScoreHistory
} from '../controllers/aiController.js';
import { upload } from '../configs/muter.js';

const aiRouter = express.Router();

// Specific history routes (MUST be defined before parameterized task/session routes)
aiRouter.get('/resume-tailor/history', auth, rateLimiter, getResumeTailorHistory);
aiRouter.get('/generate-email/history', auth, rateLimiter, getEmailHistory);
aiRouter.get('/linkedin/history', auth, rateLimiter, getLinkedinHistory);
aiRouter.get('/recruiter-outreach/history', auth, rateLimiter, getRecruiterOutreachHistory);
aiRouter.get('/interview/history', auth, rateLimiter, getInterviewHistory);
aiRouter.get('/career-score/history', auth, rateLimiter, getCareerScoreHistory);

aiRouter.post('/generate-email', auth, rateLimiter, generateEmail);
aiRouter.post('/generate-blog-title', auth, rateLimiter, generateBlogTitle);
aiRouter.post('/generate-image', auth, rateLimiter, generateImage);
aiRouter.post(
  '/remove-image-background',
  upload.single('image'),
  auth,
  rateLimiter,
  removeImageBackground
);
aiRouter.post('/remove-image-object', upload.single('image'), auth, rateLimiter, removeImageObject);
aiRouter.post('/review-resume', upload.single('resume'), auth, rateLimiter, resumeReview);
aiRouter.post('/resume-tailor', upload.single('resume'), auth, rateLimiter, resumeTailor);
aiRouter.post('/linkedin-optimizer', auth, rateLimiter, analyzeLinkedinProfile);
aiRouter.post('/linkedin/analyze', auth, rateLimiter, analyzeLinkedinProfile);
aiRouter.post('/interview/start', auth, rateLimiter, startInterview);
aiRouter.post('/interview/answer', auth, rateLimiter, answerInterview);
aiRouter.post('/recruiter-outreach', auth, rateLimiter, recruiterOutreach);
aiRouter.get('/career-score', auth, rateLimiter, getCareerScore);

aiRouter.get('/task/:taskId', auth, getTaskStatus);

export default aiRouter;
