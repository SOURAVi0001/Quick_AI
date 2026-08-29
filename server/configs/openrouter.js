import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = [
  'google/gemini-2.0-flash-lite-001',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3.5-lightning:free',
];

/**
 * Generate response directly using Google Generative AI SDK.
 */
async function generateWithGeminiSDK(messages, geminiKey) {
  console.log('🚀 Using Google Gemini SDK directly');
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemMessage = messages.find((m) => m.role === 'system');
  const userMessages = messages.filter((m) => m.role !== 'system');

  let prompt = '';
  if (systemMessage) {
    prompt += `System Instructions:\n${systemMessage.content}\n\n`;
  }
  prompt += userMessages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const content = response.text();

  return {
    content,
    reasoning_details: null,
  };
}

/**
 * Generate chat response from OpenRouter with native model-fallback routing,
 * and secondary fallback to Google Gemini SDK.
 * @param {Array<{role: string, content: string, reasoning_details?: Array<any>}>} messages - The message array
 * @param {object} [options] - Additional parameters
 * @returns {Promise<{content: string, reasoning_details?: Array<any>}>}
 */
export async function generateChatResponse(messages, options = {}) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  console.log('🔍 [AI Routing Diagnostics]:', {
    hasOpenRouterKey: !!openRouterKey,
    openRouterPrefix: openRouterKey ? `${openRouterKey.slice(0, 10)}...` : 'NONE',
    hasGeminiKey: !!geminiKey,
    geminiPrefix: geminiKey ? `${geminiKey.slice(0, 10)}...` : 'NONE',
    sameKey: openRouterKey && geminiKey ? openRouterKey === geminiKey : false,
  });

  if (!openRouterKey && !geminiKey) {
    throw new Error('Missing OPENROUTER_API_KEY or GEMINI_API_KEY in environment variables.');
  }

  // If OpenRouter key is available and not a duplicate of Gemini key, use OpenRouter with native fallbacks
  if (openRouterKey && openRouterKey !== geminiKey) {
    console.log('🚀 Using OpenRouter with native model fallbacks:', DEFAULT_MODELS);

    const payload = {
      ...options,
      model: options.model || DEFAULT_MODELS[0],
      models: options.models || DEFAULT_MODELS,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.reasoning_details && { reasoning_details: m.reasoning_details }),
      })),
    };

    try {
      const response = await axios.post(OPENROUTER_URL, payload, {
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://quickai.store',
          'X-Title': 'Quick AI',
        },
        timeout: 120000,
      });

      const choice = response.data?.choices?.[0];
      if (!choice) {
        throw new Error(
          `OpenRouter returned no choices: ${JSON.stringify(response.data)}`,
        );
      }

      console.log('✅ OpenRouter response received successfully');
      return {
        content: choice.message?.content || '',
        reasoning_details: choice.message?.reasoning_details || null,
      };
    } catch (error) {
      console.error('❌ OpenRouter request failed:', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      // If OpenRouter fails and Gemini key is available, attempt Level 2 fallback
      if (geminiKey) {
        console.log('🔄 Attempting Level 2 fallback to Google Gemini SDK...');
        try {
          return await generateWithGeminiSDK(messages, geminiKey);
        } catch (geminiError) {
          console.error('❌ Gemini SDK fallback also failed:', geminiError.message);
        }
      }

      throw error;
    }
  }

  // Otherwise, if only Gemini Key is available
  if (geminiKey) {
    return await generateWithGeminiSDK(messages, geminiKey);
  }

  throw new Error('No valid AI provider configuration available.');
}
