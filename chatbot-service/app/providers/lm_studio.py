"""LM Studio provider using its local OpenAI-compatible API endpoint."""

from typing import Dict, List, Optional
import httpx

from app.core.config import settings
from app.providers.llm_base import BaseLLMProvider
from app.utils.logging import logger


class LMStudioConnectionError(ConnectionError):
    """Raised when connection to LM Studio fails or times out."""
    pass


class LMStudioProvider(BaseLLMProvider):
    """Integrates with LM Studio's local OpenAI-compatible server.

    Expected endpoint: POST {settings.LLM_BASE_URL}/chat/completions
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        fallback_provider: Optional[BaseLLMProvider] = None,
    ):
        self.base_url = (base_url or settings.LLM_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.LLM_API_KEY
        self.model = model or settings.LLM_MODEL
        self.timeout = timeout or settings.LLM_REQUEST_TIMEOUT_SECONDS
        self.fallback_provider = fallback_provider

    async def chat_complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = 1500,
    ) -> str:
        """Sends chat completion request to LM Studio."""
        endpoint = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.debug("Calling LM Studio endpoint at %s for model %s", endpoint, self.model)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

                # Extract OpenAI-format choice
                choices = data.get("choices", [])
                if not choices:
                    raise LMStudioConnectionError("LM Studio returned empty choices in completion response")

                msg_obj = choices[0].get("message", {})
                content = msg_obj.get("content") or ""
                # Strip thinking blocks if model emitted them in content
                if "<think>" in content and "</think>" in content:
                    import re
                    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)
                return content.strip()

        except httpx.TimeoutException as exc:
            msg = f"LM Studio request timed out after {self.timeout}s: {exc}"
            logger.error(msg)
            if self.fallback_provider:
                logger.warning("Falling back to offline Mock LLM provider due to timeout.")
                return await self.fallback_provider.chat_complete(messages=messages, temperature=temperature, max_tokens=max_tokens)
            raise LMStudioConnectionError(msg) from exc
        except httpx.ConnectError as exc:
            msg = (
                f"Failed to connect to LM Studio at {self.base_url}. "
                "Ensure LM Studio local server is running and accessible."
            )
            logger.error(msg)
            if self.fallback_provider:
                logger.warning("Falling back to offline Mock LLM provider due to LM Studio connection failure.")
                return await self.fallback_provider.chat_complete(messages=messages, temperature=temperature, max_tokens=max_tokens)
            raise LMStudioConnectionError(msg) from exc
        except httpx.HTTPStatusError as exc:
            msg = f"LM Studio API returned HTTP error {exc.response.status_code}: {exc.response.text}"
            logger.error(msg)
            if self.fallback_provider:
                logger.warning("Falling back to offline Mock LLM provider due to LM Studio HTTP error.")
                return await self.fallback_provider.chat_complete(messages=messages, temperature=temperature, max_tokens=max_tokens)
            raise LMStudioConnectionError(msg) from exc
        except Exception as exc:
            msg = f"Unexpected error communicating with LM Studio: {exc}"
            logger.error(msg)
            if self.fallback_provider:
                logger.warning("Falling back to offline Mock LLM provider due to unexpected LM Studio error.")
                return await self.fallback_provider.chat_complete(messages=messages, temperature=temperature, max_tokens=max_tokens)
            raise LMStudioConnectionError(msg) from exc
