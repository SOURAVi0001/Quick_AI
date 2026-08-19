import axios from 'axios';
import 'dotenv/config';

const openRouterModel = 'nvidia/nemotron-3.5-lightning:free';

/**
 * Generate chat response from OpenRouter, with reasoning details preserved.
 * @param {Array<{role: string, content: string, reasoning_details?: Array<any>}>} messages - The message array
 * @param {object} [options] - Additional parameters
 * @returns {Promise<{content: string, reasoning_details?: Array<any>}>}
 */
export async function generateChatResponse(messages, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY or GEMINI_API_KEY in environment variables.');
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: openRouterModel,
        messages: messages.map((m) => {
          const msg = {
            role: m.role,
            content: m.content,
          };
          if (m.reasoning_details) {
            msg.reasoning_details = m.reasoning_details;
          }
          return msg;
        }),
        reasoning: {
          effort: 'high',
          exclude: false,
        },
        ...options,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://quickai.store',
          'X-Title': 'Quick AI',
        },
        timeout: 60000, // 60s timeout for reasoning models
      },
    );

    const choice = response.data.choices?.[0];
    if (!choice) {
      throw new Error(`OpenRouter returned empty choices: ${JSON.stringify(response.data)}`);
    }

    const content = choice.message?.content || '';
    const reasoning_details = choice.message?.reasoning_details || null;

    return {
      content,
      reasoning_details,
    };
  } catch (error) {
    console.error(
      'Error generating content from OpenRouter:',
      error.response?.data || error.message,
    );
    throw error;
  }
}
