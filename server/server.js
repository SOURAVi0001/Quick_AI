import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express'
import 'dotenv/config'
import aiRouter from './routes/aiRoutes.js';
import connectionCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';

const app= express();


app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

console.log("remove BG server");
await connectionCloudinary();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
// app.use(requireAuth());


app.get('/',(req,res)=>res.send('Server is Live!'))
app.use('/api/ai',aiRouter);
app.use('/api/user',userRouter);
const PORT=process.env.PORT || 3000;
app.listen(PORT,()=>{
      console.log('Server is running on port',PORT);
});
