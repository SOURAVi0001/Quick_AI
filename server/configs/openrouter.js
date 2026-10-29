import { OpenRouter } from '@openrouter/sdk';
import 'dotenv/config';

const apiKey = process.env.OPENROUTER_API_KEY;

export const openrouter = new OpenRouter({
  apiKey: apiKey || '',
});

/**
 * Generate chat response from OpenRouter using @openrouter/sdk with streaming.
 * @param {Array<{role: string, content: string}>} messages - The message array
 * @returns {Promise<{content: string, reasoning_details?: any}>}
 */
export async function generateChatResponse(messages) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured in environment variables.');
  }

  try {
    const stream = await openrouter.chat.send({
      chatRequest: {
        model: 'openrouter/free',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      },
    });

    let response = '';
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        response += content;
      }
    }

    return {
      content: response,
      reasoning_details: null,
    };
  } catch (error) {
    console.error('OpenRouter request failed:', error.message || error);
    throw error;
  }
}
