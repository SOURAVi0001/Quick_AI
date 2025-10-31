import express from 'express';
import cors from 'cors';
import { clerkMiddleware /*, requireAuth */ } from '@clerk/express';
import 'dotenv/config';
import aiRouter from './routes/aiRoutes.js';
import connectionCloudinary from './configs/cloudinary.js';
import userRouter from './routes/userRoutes.js';

const app = express();

// Allow-list origins for credentials=true
const whitelist = [process.env.FRONTEND, 'http://localhost:5173'].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || whitelist.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// No need for app.options('*', ...) when using app.use(cors())
// If you prefer preflight handling explicitly, use a RegExp:
// app.options(/.*/, cors());

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
