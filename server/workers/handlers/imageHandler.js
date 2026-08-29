import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import sql from '../../configs/db.js';
import { safeDel } from '../../configs/redis.js';
import { getDemoImage, isQuotaError } from '../../configs/demoFallbacks.js';

export async function handleImageTask(job) {
  const { type, userId, prompt, publish } = job.data;
  let content;
  let demo = false;

  switch (type) {
    case 'generate-image': {
      let secure_url;

      try {
        const formData = new FormData();
        formData.append('prompt', prompt);

        const { data } = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
          headers: { 'x-api-key': process.env.CLIPDROP_API_KEY },
          responseType: 'arraybuffer',
        });

        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;
        ({ secure_url } = await cloudinary.uploader.upload(base64Image));
      } catch (imgError) {
        if (isQuotaError(imgError) || imgError.response?.status >= 400) {
          secure_url = getDemoImage();
          demo = true;
        } else {
          throw imgError;
        }
      }

      content = secure_url;

      await sql`INSERT INTO creations (user_id, prompt, content, type, publish) 
                VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;
      await safeDel(`user:creations:${userId}`);
      if (publish) await safeDel('creations:published');
      break;
    }

    case 'remove-image-object': {
      content = getDemoImage();
      demo = true;
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${prompt}, ${content}, 'image')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    case 'remove-image-background': {
      content = getDemoImage();
      demo = true;
      await sql`INSERT INTO creations (user_id, prompt, content, type) 
                VALUES (${userId}, ${prompt}, ${content}, 'image')`;
      await safeDel(`user:creations:${userId}`);
      break;
    }

    default:
      throw new Error(`Unsupported image task type: ${type}`);
  }

  return { content, demo, type };
}
