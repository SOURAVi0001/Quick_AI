import express from 'express';
import { auth } from '../middlewares/auth.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import {
  createApplication,
  listApplications,
  getAnalytics,
  getUpcomingActions,
  getInsightHistory,
  analyzeJobSearchInsights,
  getInsightDetail,
  getApplicationDetail,
  getApplicationActivities,
  updateApplication,
  deleteApplication,
  listAllActivities,
} from '../controllers/jobApplicationController.js';

const jobApplicationRouter = express.Router();

// Apply auth middleware to all routes in this router
jobApplicationRouter.use(auth);

// Job search insights routes (specific paths)
jobApplicationRouter.get('/insights/history', rateLimiter, getInsightHistory);
jobApplicationRouter.post('/insights/analyze', rateLimiter, analyzeJobSearchInsights);
jobApplicationRouter.get('/insights/:id', rateLimiter, getInsightDetail);

// Global status activities feed (MUST be declared before parameterized /:id routes)
jobApplicationRouter.get('/activities', rateLimiter, listAllActivities);

// Analytics and upcoming actions
jobApplicationRouter.get('/analytics', rateLimiter, getAnalytics);
jobApplicationRouter.get('/upcoming', rateLimiter, getUpcomingActions);

// CRUD operations
jobApplicationRouter.post('/', rateLimiter, createApplication);
jobApplicationRouter.get('/', rateLimiter, listApplications);
jobApplicationRouter.get('/:id', rateLimiter, getApplicationDetail);
jobApplicationRouter.get('/:id/activities', rateLimiter, getApplicationActivities);
jobApplicationRouter.patch('/:id', rateLimiter, updateApplication);
jobApplicationRouter.delete('/:id', rateLimiter, deleteApplication);

export default jobApplicationRouter;
