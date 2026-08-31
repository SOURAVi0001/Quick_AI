import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';

import aiRouter from './routes/aiRoutes.js';
import userRouter from './routes/userRoutes.js';
import jobApplicationRouter from './routes/jobApplicationRoutes.js';
import connectionCloudinary from './configs/cloudinary.js';
import redisClient from './configs/redis.js';
import { startWorker } from './configs/queue.js';
import { processAITask } from './workers/aiWorker.js';
import { errorHandler } from './middlewares/errorHandler.js';

// ─── Validate Environment ────────────────────────────────────────────
const REQUIRED_ENV = [
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Create a .env file based on .env.example');
  process.exit(1);
}

// ─── Express App ─────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ─── CORS ────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://quick-ai-frontend.onrender.com',
  'https://d30jzk0hgtqxk3.cloudfront.net',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://quickai.store',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Public Health Check Routes (Before Auth Middleware) ─────────────
app.get('/', (req, res) => res.send('Server is Live!'));
app.get('/health', (req, res) =>
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }),
);

// ─── Socket.IO ───────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('disconnect', () => {});
});

app.set('io', io);

// ─── Initialize Services ────────────────────────────────────────────
await connectionCloudinary();

try {
  await redisClient.connect();
  console.log('Redis connected');

  // Attempt to set eviction policy to noeviction
  try {
    const policy = await redisClient.configGet('maxmemory-policy');
    const policyValue = policy && policy['maxmemory-policy'];
    console.log(`ℹ️ Redis maxmemory-policy is: ${policyValue}`);
    if (policyValue && policyValue !== 'noeviction') {
      console.log(`⚠️ Eviction policy is ${policyValue}. Changing to noeviction...`);
      await redisClient.configSet('maxmemory-policy', 'noeviction');
      console.log('✅ Redis maxmemory-policy set to noeviction');
    }
  } catch (configErr) {
    console.warn(
      '⚠️ Could not dynamically configure Redis maxmemory-policy to noeviction. ' +
        'If you are using a managed Redis provider (like Render/Redis Labs), please set the eviction policy ' +
        'to "noeviction" manually in their dashboard to prevent BullMQ job eviction.',
    );
  }

  // Start BullMQ worker only if Redis is available
  const worker = startWorker(processAITask);
  console.log('BullMQ AI Worker started');

  worker.on('completed', (job, result) => {
    const io = app.get('io');
    if (io && job.data?.userId) {
      io.to(`user:${job.data.userId}`).emit('task:completed', {
        taskId: job.id,
        type: result?.type || job.data?.type,
        status: 'completed',
        resultId: result?.resultId,
        content: result?.content,
        demo: result?.demo,
      });
    }
  });

  worker.on('failed', (job, err) => {
    const io = app.get('io');
    if (io && job?.data?.userId) {
      io.to(`user:${job.data.userId}`).emit('task:failed', {
        taskId: job.id,
        type: job.data?.type,
        status: 'failed',
        error: err?.message || 'Failed to process AI task. Please try again.',
      });
    }
  });
} catch (err) {
  console.warn('Redis connection failed — running without cache & queues:', err.message || err);
}

// ─── Middleware & Protected Routes ──────────────────────────────────
app.use(express.json());
app.use(clerkMiddleware());

app.use('/api/ai', aiRouter);
app.use('/api/user', userRouter);
app.use('/api/job-applications', jobApplicationRouter);

// ─── 404 Catch-All ──────────────────────────────────────────────────
app.all('/*splat', (req, res) => res.status(404).json({ success: false, message: 'Not Found' }));

// ─── Global Error Handler (must be last) ─────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
