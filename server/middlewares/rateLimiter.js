import { RateLimitError } from './errors.js';
import redisClient, { isConnected } from '../configs/redis.js';
import memCache from '../configs/memcache.js';

const RATE_LIMITS = {
  free: { maxRequests: 2, windowSeconds: 60 },
  premium: { maxRequests: 20, windowSeconds: 60 },
};

export const rateLimiter = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    if (!userId) return next();

    const plan = req.plan || 'free';
    const limits = RATE_LIMITS[plan] || RATE_LIMITS.free;
    const key = `ratelimit:${userId}`;
    const now = Date.now();
    const windowStart = now - limits.windowSeconds * 1000;

    // Use Redis sliding window if connected
    if (isConnected) {
      try {
        const multi = redisClient.multi();
        multi.zRemRangeByScore(key, 0, windowStart);
        multi.zCard(key);
        multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
        multi.expire(key, limits.windowSeconds);
        const results = await multi.exec();

        const currentCount = results[1];
        if (currentCount >= limits.maxRequests) {
          const oldestInWindow = await redisClient.zRange(key, 0, 0, { REV: false });
          const oldestScore = oldestInWindow.length
            ? parseFloat(await redisClient.zScore(key, oldestInWindow[0]))
            : now;
          const retryAfter = Math.ceil((oldestScore + limits.windowSeconds * 1000 - now) / 1000);

          throw new RateLimitError(retryAfter);
        }

        res.set({
          'X-RateLimit-Limit': String(limits.maxRequests),
          'X-RateLimit-Remaining': String(Math.max(0, limits.maxRequests - currentCount - 1)),
          'X-RateLimit-Reset': String(Math.ceil((now + limits.windowSeconds * 1000) / 1000)),
        });

        return next();
      } catch (err) {
        if (err instanceof RateLimitError) throw err;
        // Redis error — fall through to in-memory
      }
    }

    // Fallback: in-memory token bucket
    const memKey = `ratelimit:mem:${userId}`;
    const bucket = memCache.get(memKey);
    const state = bucket
      ? JSON.parse(bucket)
      : { count: 0, resetAt: now + limits.windowSeconds * 1000 };

    if (now > state.resetAt) {
      state.count = 0;
      state.resetAt = now + limits.windowSeconds * 1000;
    }

    if (state.count >= limits.maxRequests) {
      const retryAfter = Math.ceil((state.resetAt - now) / 1000);
      throw new RateLimitError(retryAfter);
    }

    state.count++;
    memCache.set(memKey, JSON.stringify(state), limits.windowSeconds);

    res.set({
      'X-RateLimit-Limit': String(limits.maxRequests),
      'X-RateLimit-Remaining': String(Math.max(0, limits.maxRequests - state.count)),
      'X-RateLimit-Reset': String(Math.ceil(state.resetAt / 1000)),
    });

    return next();
  } catch (err) {
    next(err);
  }
};
