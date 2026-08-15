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
} from '../controllers/aiController.js';
import { upload } from '../configs/muter.js';

const aiRouter = express.Router();

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
aiRouter.post('/interview/start', auth, rateLimiter, startInterview);
aiRouter.post('/interview/answer', auth, rateLimiter, answerInterview);
aiRouter.post('/recruiter-outreach', auth, rateLimiter, recruiterOutreach);
aiRouter.get('/career-score', auth, rateLimiter, getCareerScore);

aiRouter.get('/task/:taskId', auth, getTaskStatus);

export default aiRouter;
