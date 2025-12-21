import { createClient } from 'redis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const client = createClient({ url: redisUrl });

client.on('error', (err) => console.error('Redis Client Error', err));

export default client;
