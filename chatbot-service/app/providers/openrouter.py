"""OpenRouter provider using its OpenAI-compatible API endpoint with streaming support."""

from typing import Dict, List, Optional
import re
from openai import AsyncOpenAI, OpenAIError

from app.core.config import settings
from app.providers.llm_base import BaseLLMProvider
from app.utils.logging import logger


class OpenRouterConnectionError(ConnectionError):
    """Raised when connection to OpenRouter fails, times out, or authentication fails."""
    pass


class OpenRouterProvider(BaseLLMProvider):
    """Integrates with OpenRouter via OpenAI-compatible streaming API.

    Features:
    - Primary cloud LLM provider using OpenRouter free/budget models (default: openrouter/free).
    - Chunk-by-chunk stream consumption matching the Node.js OpenRouter SDK pattern.
    - Automatic fallback to secondary provider (e.g. local LM Studio or Mock LLM) on error or missing key.
    - Automatic cleaning of internal chain-of-thought tokens (e.g. <think>...</think>).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        fallback_provider: Optional[BaseLLMProvider] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.OPENROUTER_API_KEY
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        self.model = model or settings.OPENROUTER_MODEL
        self.timeout = timeout or settings.LLM_REQUEST_TIMEOUT_SECONDS
        self.fallback_provider = fallback_provider
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        """Lazily initialize the AsyncOpenAI client with OpenRouter base URL and headers."""
        if self._client is None:
            if not self.api_key:
                raise OpenRouterConnectionError(
                    "OPENROUTER_API_KEY is not configured in environment variables."
                )
            self._client = AsyncOpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=self.timeout,
                default_headers={
                    "HTTP-Referer": "https://quickai.app",
                    "X-Title": "Quick.AI Chatbot",
                    "X-OpenRouter-Cache": "true",
                },
            )
        return self._client

    async def chat_complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = 1500,
    ) -> str:
        """Sends chat request to OpenRouter using streaming response aggregation.

        Args:
            messages: Array of message dicts with 'role' and 'content'.
            temperature: Sampling temperature.
            max_tokens: Token budget for completion.

        Returns:
            The fully accumulated text response.
        """
        logger.debug(
            "Calling OpenRouter endpoint at %s for model %s with %d messages (streaming=True)",
            self.base_url,
            self.model,
            len(messages),
        )

        try:
            if not self.api_key:
                raise OpenRouterConnectionError(
                    "OPENROUTER_API_KEY is not configured in environment variables."
                )

            client = self._get_client()

            # Stream chat completion chunks similar to openrouter.chat.send({ stream: true })
            stream = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": m.get("role", "user"), "content": m.get("content", "")}
                    for m in messages
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
                extra_headers={
                    "X-OpenRouter-Cache": "true",
                },
            )

            accumulated_content: List[str] = []
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta_content = chunk.choices[0].delta.content
                    if delta_content:
                        accumulated_content.append(delta_content)

            full_text = "".join(accumulated_content).strip()

            # Strip reasoning/thinking tags if model emitted them
            if "<think>" in full_text and "</think>" in full_text:
                full_text = re.sub(r"<think>.*?</think>", "", full_text, flags=re.DOTALL).strip()

            if not full_text:
                logger.warning("OpenRouter returned an empty response string.")
                if self.fallback_provider:
                    logger.warning("Falling back to secondary provider due to empty OpenRouter output.")
                    return await self.fallback_provider.chat_complete(
                        messages=messages, temperature=temperature, max_tokens=max_tokens
                    )

            return full_text

        except (OpenAIError, OpenRouterConnectionError, Exception) as exc:
            msg = f"OpenRouter request failed for model '{self.model}': {exc}"
            logger.error(msg)

            if self.fallback_provider:
                fallback_name = type(self.fallback_provider).__name__
                logger.warning(
                    "Failing over from OpenRouter to %s due to error: %s",
                    fallback_name,
                    exc,
                )
                return await self.fallback_provider.chat_complete(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

            raise OpenRouterConnectionError(msg) from exc
