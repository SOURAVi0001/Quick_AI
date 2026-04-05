import { clerkClient } from '@clerk/express';
import memCache from '../configs/memcache.js';
import { AuthenticationError } from './errors.js';

export const auth = async (req, res, next) => {
  try {
    const authData = req.auth();
    const { userId, has } = authData;

    if (!userId) throw new AuthenticationError();

    const userCacheKey = `clerk:user:${userId}`;
    let user = memCache.get(userCacheKey);

    if (user) {
      user = JSON.parse(user);
    } else {
      user = await clerkClient.users.getUser(userId);
      memCache.set(userCacheKey, JSON.stringify(user), 120);
    }

    const hasPremiumByPlan = has({ plan: 'premium' });
    const hasPremiumByPermission = has({ permission: 'premium' });
    const hasPremiumPlan = hasPremiumByPlan || hasPremiumByPermission;

    if (!hasPremiumPlan && user.privateMetadata?.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      if (user.privateMetadata?.free_usage === undefined) {
        await clerkClient.users.updateUserMetadata(userId, {
          privateMetadata: { free_usage: 0 },
        });
        memCache.del(userCacheKey);
      }
      req.free_usage = user.privateMetadata?.free_usage || 0;
    }
    req.plan = hasPremiumPlan ? 'premium' : 'free';
    next();
  } catch (error) {
    next(error);
  }
};
