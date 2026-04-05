import express from 'express';
import { auth } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  generateArticle,
  generateBlogTitle,
  generateImage,
  removeImageBackground,
  removeImageObject,
  resumeReview,
  getTaskStatus,
} from '../controllers/aiController.js';
import { upload } from '../configs/muter.js';

const aiRouter = express.Router();

aiRouter.post('/generate-article', auth, rateLimiter, generateArticle);
aiRouter.post('/generate-blog-title', auth, rateLimiter, generateBlogTitle);
aiRouter.post('/generate-image', auth, rateLimiter, generateImage);
aiRouter.post(
  '/remove-image-background',
  upload.single('image'),
  auth,
  rateLimiter,
  removeImageBackground,
);
aiRouter.post('/remove-image-object', upload.single('image'), auth, rateLimiter, removeImageObject);
aiRouter.post('/resume-review', upload.single('resume'), auth, rateLimiter, resumeReview);
aiRouter.get('/task/:taskId', auth, getTaskStatus);

export default aiRouter;
