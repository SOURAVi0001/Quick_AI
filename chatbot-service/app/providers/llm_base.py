"""Abstract base class interface for Large Language Model (LLM) providers."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseLLMProvider(ABC):
    """Abstract base class that all LLM providers must implement.

    Ensures that LM Studio, Mock LLM, or future providers (e.g. OpenAI, Anthropic, vLLM)
    can be swapped interchangeably without altering downstream business logic.
    """

    @abstractmethod
    async def chat_complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = 500,
    ) -> str:
        """Sends chat messages to the model provider and returns the raw text response.

        Args:
            messages: List of message dictionaries with 'role' and 'content'.
            temperature: Sampling temperature for output generation.
            max_tokens: Maximum tokens in generated completion.

        Returns:
            The generated response string.
        """
        pass
