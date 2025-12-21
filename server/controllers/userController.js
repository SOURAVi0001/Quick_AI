import sql from "../configs/db.js";
import redisClient from '../configs/redis.js';

export const getUserCreations = async (req, res) => {
      try {
            const { userId } = req.auth()
            const cacheKey = `user:creations:${userId}`;
            try {
                  const cached = await redisClient.get(cacheKey);
                  if (cached) {
                        const parsed = JSON.parse(cached);
                        return res.json({ success: true, content: parsed, cached: true });
                  }
            } catch (err) {
                  console.error('Redis get failed', err?.message || err);
            }

            const creations = await sql`SELECT * FROM creations WHERE user_id=${userId} ORDER BY created_at DESC`;
            // cache for 5 minutes
            try {
                  await redisClient.setEx(cacheKey, 5 * 60, JSON.stringify(creations));
            } catch (err) {
                  console.error('Redis set failed', err?.message || err);
            }
            return res.json({ success: true, content: creations });
      }
      catch (error) {
            return res.json({ success: false, message: error.message });
      }
}
export const getPublishedCreations = async (req, res) => {
      try {
            const cacheKey = `creations:published`;
            try {
                  const cached = await redisClient.get(cacheKey);
                  if (cached) {
                        const parsed = JSON.parse(cached);
                        return res.json({ success: true, content: parsed, cached: true });
                  }
            } catch (err) {
                  console.error('Redis get failed', err?.message || err);
            }

            const creations = await sql`SELECT * FROM creations WHERE publish=true ORDER BY created_at DESC`;
            // cache for 2 minutes
            try {
                  await redisClient.setEx(cacheKey, 2 * 60, JSON.stringify(creations));
            } catch (err) {
                  console.error('Redis set failed', err?.message || err);
            }
            res.json({ success: true, content: creations });
      }
      catch (error) {
            res.json({ success: false, message: error.message });
      }
}

export const toggleLikeCreations = async (req, res) => {
      try {
            const { userId } = req.auth()
            const { id } = req.body;
            const [creation] = await sql`SELECT * FROM creations WHERE id=${id}`
            if (!creation) {
                  return res.json({ success: false, message: 'Creation not found' });
            }
            const currentLikes = creation.likes;
            const userIdStr = userId.toString();
            let updatedLikes;
            let message;
            // defensive checks for currentLikes being an array
            const likesArr = Array.isArray(currentLikes) ? currentLikes : [];
            if (likesArr.includes(userIdStr)) {
                  updatedLikes = likesArr.filter((user) => user !== userIdStr);
                  message = 'Creation Unliked'
            }
            else {
                  updatedLikes = [...likesArr, userIdStr];
                  message = 'Creation Liked'
            }
            const formattedArray = `{${updatedLikes.join(',')}}`
            await sql`UPDATE creations SET likes=${formattedArray}::text[] WHERE id=${id}`

            // invalidate relevant caches: published list and the creator's user creations
            try {
                  await redisClient.del(`creations:published`);
                  await redisClient.del(`user:creations:${creation.user_id}`);
            } catch (err) {
                  console.error('Redis del failed', err?.message || err);
            }

            // return updated creation
            const [updated] = await sql`SELECT * FROM creations WHERE id=${id}`;
            res.json({ success: true, content: updated, message });
      }
      catch (error) {
            res.json({ success: false, message: error.message });
      }
}