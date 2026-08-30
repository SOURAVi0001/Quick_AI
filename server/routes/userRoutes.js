import express from 'express';
import {
  getPublishedCreations,
  getUserCreations,
  toggleLikeCreations,
  getFeatureHistory,
} from '../controllers/userController.js';
import { auth } from '../middlewares/auth.js';
const userRouter = express.Router();
userRouter.get('/get-user-creations', auth, getUserCreations);
userRouter.get('/get-published-creations', auth, getPublishedCreations);
userRouter.post('/toggle-like-creations', auth, toggleLikeCreations);
userRouter.get('/history', auth, getFeatureHistory);

export default userRouter;
