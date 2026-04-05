import { createClient } from 'redis';
import 'dotenv/config';
import memCache from './memcache.js';

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const client = createClient({
  url: redisUrl,
  socket: {
    tls: redisUrl.startsWith('rediss://'),
    rejectUnauthorized: false,
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Max reconnection attempts reached.');
        return false;
      }
      const delay = Math.min(retries * 500, 5000);
      return delay;
    },
  },
});

let isConnected = false;

client.on('error', (err) => {
  if (err.code === 'ENOTFOUND') {
    if (!client._lastDnsError) {
      console.error('❌ Redis DNS Error: Cannot resolve', err.hostname);
      client._lastDnsError = true;
    }
  } else if (err.message?.includes('Socket closed unexpectedly')) {
    if (!client._lastSocketError) {
      console.error('❌ Redis: Socket closed unexpectedly.');
      client._lastSocketError = true;
    }
  } else if (!err.message?.includes('max retries')) {
    console.error('❌ Redis Error:', err.message);
  }
  isConnected = false;
});

client.on('connect', () => {
  console.log('✅ Redis Client Connected');
  isConnected = true;
  client._lastDnsError = false;
  client._lastSocketError = false;
});

client.on('end', () => {
  isConnected = false;
});

export async function safeGet(key) {
  const memHit = memCache.get(key);
  if (memHit !== null) {
    return memHit;
  }

  if (!isConnected) return null;

  try {
    const value = await client.get(key);
    if (value !== null) {
      memCache.set(key, value, 120);
      return value;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function safeSetEx(key, seconds, value) {
  memCache.set(key, value, Math.min(seconds, 300));

  if (!isConnected) return;
  try {
    await client.setEx(key, seconds, value);
  } catch (e) {}
}

export async function safeDel(...keys) {
  keys.forEach((k) => memCache.del(k));

  if (!isConnected) return;
  try {
    await client.del(keys);
  } catch (e) {}
}

export { isConnected };
export default client;
