import { createClient } from 'redis';
import 'dotenv/config';

// Render uses "rediss://" for external connections (SSL/TLS required)
// This automatically picks up REDIS_URL from your .env file
const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const client = createClient({
  url: redisUrl,
  // REQUIRED for Render External Connections if using self-signed certs or strict SSL issues
  socket: {
    tls: redisUrl.startsWith('rediss://'), // Enable TLS if protocol is rediss://
    rejectUnauthorized: false, // Skip cert verification (often needed for external managed Redis)
  },
});

client.on('error', (err) => console.error('❌ Redis Client Error:', err));
client.on('connect', () => console.log('✅ Redis Client Connected'));

// MANDATORY: You must await the connection
(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('❌ Failed to connect to Redis:', err);
  }
})();

export default client;
