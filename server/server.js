import express from 'express';

import { clerkMiddleware /*, requireAuth */ } from '@clerk/express';
import 'dotenv/config';
import aiRouter from './routes/aiRoutes.js';
import connectionCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';

const app = express();

// Allow-list origins for credentials=true
import cors from 'cors';

const allowedOrigins = [
  'https://quick-ai-frontend.onrender.com',
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use((req, res, next) => {
  console.log('CORS check', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
  });
  next();
});

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser clients during debug
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));


console.log('remove BG server');
await connectionCloudinary();

app.use(express.json());
app.use(clerkMiddleware());
// app.use(requireAuth());

app.get('/', (req, res) => res.send('Server is Live!'));

// Your APIs
app.use('/api/ai', aiRouter);
app.use('/api/user', userRouter);

// Optional: 404 catch‑all compatible with new matching rules
app.all('/*splat', (req, res) => res.status(404).send('Not Found')); // or: app.all(/.*/, ...)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});
