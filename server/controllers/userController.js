import sql from '../configs/db.js';
import { safeGet, safeSetEx, safeDel } from '../configs/redis.js';
import { NotFoundError } from '../middlewares/errors.js';

export const getUserCreations = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const cacheKey = `user:creations:${userId}`;

    const cached = await safeGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.json({ success: true, content: parsed, cached: true });
    }

    const creations =
      await sql`SELECT * FROM creations WHERE user_id=${userId} ORDER BY created_at DESC`;
    await safeSetEx(cacheKey, 5 * 60, JSON.stringify(creations));

    return res.json({ success: true, content: creations });
  } catch (error) {
    next(error);
  }
};

export const getPublishedCreations = async (req, res, next) => {
  try {
    const cacheKey = `creations:published`;

    const cached = await safeGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.json({ success: true, content: parsed, cached: true });
    }

    const creations =
      await sql`SELECT * FROM creations WHERE publish=true ORDER BY created_at DESC`;
    await safeSetEx(cacheKey, 2 * 60, JSON.stringify(creations));

    res.json({ success: true, content: creations });
  } catch (error) {
    next(error);
  }
};

export const toggleLikeCreations = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;
    const [creation] = await sql`SELECT * FROM creations WHERE id=${id}`;

    if (!creation) throw new NotFoundError('Creation');

    const currentLikes = creation.likes;
    const userIdStr = userId.toString();
    let updatedLikes;
    let message;

    const likesArr = Array.isArray(currentLikes) ? currentLikes : [];
    if (likesArr.includes(userIdStr)) {
      updatedLikes = likesArr.filter((user) => user !== userIdStr);
      message = 'Creation Unliked';
    } else {
      updatedLikes = [...likesArr, userIdStr];
      message = 'Creation Liked';
    }
    const formattedArray = `{${updatedLikes.join(',')}}`;
    await sql`UPDATE creations SET likes=${formattedArray}::text[] WHERE id=${id}`;

    await safeDel(`creations:published`, `user:creations:${creation.user_id}`);

    const [updated] = await sql`SELECT * FROM creations WHERE id=${id}`;
    res.json({ success: true, content: updated, message });
  } catch (error) {
    next(error);
  }
};
