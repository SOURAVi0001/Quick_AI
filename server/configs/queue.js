import { Queue, Worker } from 'bullmq';
import { isConnected } from './redis.js';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const parsedUrl = new URL(redisUrl);

const connection = {
  host: parsedUrl.hostname,
  port: parseInt(parsedUrl.port || '6379'),
  ...(parsedUrl.password && { password: parsedUrl.password }),
  ...(parsedUrl.username && { username: parsedUrl.username }),
  ...(redisUrl.startsWith('rediss://') && {
    tls: { rejectUnauthorized: false },
  }),
};

const QUEUE_NAME = 'ai-tasks';

let aiQueue = null;
let aiWorker = null;

export function getQueue() {
  if (!aiQueue) {
    aiQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
      },
    });
  }
  return aiQueue;
}

export function startWorker(processorFn) {
  if (aiWorker) return aiWorker;

  aiWorker = new Worker(QUEUE_NAME, processorFn, {
    connection,
    concurrency: 3,
    limiter: { max: 5, duration: 60000 },
  });

  aiWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} (${job.name}) completed`);
  });

  aiWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  return aiWorker;
}

export async function addTask(taskName, data, opts = {}) {
  const queue = getQueue();
  const job = await queue.add(taskName, data, opts);
  return job.id;
}

export { connection as bullConnection, QUEUE_NAME };
