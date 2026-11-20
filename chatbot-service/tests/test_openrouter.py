"""Tests for OpenRouterProvider and the multi-tier fallback architecture."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from openai import OpenAIError

from app.providers.openrouter import OpenRouterProvider, OpenRouterConnectionError
from app.providers.mock_llm import MockLLMProvider
from app.providers.lm_studio import LMStudioProvider


class MockChunkChoiceDelta:
    def __init__(self, content):
        self.content = content


class MockChunkChoice:
    def __init__(self, content):
        self.delta = MockChunkChoiceDelta(content)


class MockChunk:
    def __init__(self, content):
        self.choices = [MockChunkChoice(content)] if content is not None else []


async def async_generator(chunks):
    for chunk in chunks:
        yield chunk


@pytest.mark.asyncio
async def test_openrouter_streaming_accumulation():
    """Verifies that OpenRouter chunks are properly streamed and concatenated into full response."""
    provider = OpenRouterProvider(api_key="sk-test-key", model="openrouter/free")

    mock_chunks = [
        MockChunk("Hello"),
        MockChunk(" world"),
        MockChunk(" from"),
        MockChunk(" OpenRouter!"),
    ]

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=async_generator(mock_chunks))

    with patch.object(provider, "_get_client", return_value=mock_client):
        result = await provider.chat_complete(
            messages=[{"role": "user", "content": "Hi"}],
            temperature=0.2,
            max_tokens=100,
        )

    assert result == "Hello world from OpenRouter!"
    mock_client.chat.completions.create.assert_called_once()
    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["stream"] is True
    assert call_kwargs["model"] == "openrouter/free"
    assert call_kwargs["extra_headers"] == {"X-OpenRouter-Cache": "true"}


@pytest.mark.asyncio
async def test_openrouter_cache_headers():
    """Verifies that OpenRouter client initializes with X-OpenRouter-Cache: true header."""
    provider = OpenRouterProvider(api_key="sk-test-key", model="openrouter/free")
    client = provider._get_client()
    assert client.default_headers.get("X-OpenRouter-Cache") == "true"


@pytest.mark.asyncio
async def test_openrouter_strips_thinking_tags():
    """Verifies that reasoning <think>...</think> blocks from models are stripped."""
    provider = OpenRouterProvider(api_key="sk-test-key", model="openrouter/free")

    mock_chunks = [
        MockChunk("<think>Thinking step 1</think>The answer is 42."),
    ]

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=async_generator(mock_chunks))

    with patch.object(provider, "_get_client", return_value=mock_client):
        result = await provider.chat_complete(
            messages=[{"role": "user", "content": "What is the answer?"}],
        )

    assert result == "The answer is 42."


@pytest.mark.asyncio
async def test_openrouter_missing_api_key_fails_over_to_fallback():
    """Verifies that missing API key automatically triggers fallback provider."""
    mock_fallback = AsyncMock()
    mock_fallback.chat_complete.return_value = "Fallback answer from local model"

    provider = OpenRouterProvider(api_key="", fallback_provider=mock_fallback)

    result = await provider.chat_complete(
        messages=[{"role": "user", "content": "Hello"}],
    )

    assert result == "Fallback answer from local model"
    mock_fallback.chat_complete.assert_called_once()


@pytest.mark.asyncio
async def test_openrouter_api_error_fails_over_to_fallback():
    """Verifies that OpenRouter API exceptions trigger graceful fallback."""
    mock_fallback = AsyncMock()
    mock_fallback.chat_complete.return_value = "Fallback response after OpenRouter failure"

    provider = OpenRouterProvider(api_key="sk-test", fallback_provider=mock_fallback)

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=OpenAIError("Rate limit exceeded"))

    with patch.object(provider, "_get_client", return_value=mock_client):
        result = await provider.chat_complete(
            messages=[{"role": "user", "content": "Help me"}],
        )

    assert result == "Fallback response after OpenRouter failure"
    mock_fallback.chat_complete.assert_called_once()


@pytest.mark.asyncio
async def test_openrouter_raises_when_no_fallback_configured():
    """Verifies that if OpenRouter fails and no fallback exists, OpenRouterConnectionError is raised."""
    provider = OpenRouterProvider(api_key="sk-test", fallback_provider=None)

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=OpenAIError("Network timeout"))

    with patch.object(provider, "_get_client", return_value=mock_client):
        with pytest.raises(OpenRouterConnectionError):
            await provider.chat_complete(messages=[{"role": "user", "content": "Hi"}])


@pytest.mark.asyncio
async def test_full_tier_fallback_chain():
    """Verifies OpenRouter -> LM Studio -> Mock LLM full 3-tier fallback."""
    mock_llm = MockLLMProvider()
    lm_studio = LMStudioProvider(
        base_url="http://invalid-host:9999/v1",
        timeout=0.1,
        fallback_provider=mock_llm,
    )
    openrouter = OpenRouterProvider(
        api_key="sk-test",
        fallback_provider=lm_studio,
    )

    # Simulate OpenRouter error
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=OpenAIError("Service unavailable"))

    with patch.object(openrouter, "_get_client", return_value=mock_client):
        # Even with OpenRouter and LM Studio failing, Mock LLM provides a graceful answer
        result = await openrouter.chat_complete(
            messages=[
                {"role": "system", "content": "Assistant prompt"},
                {"role": "user", "content": "What is Quick.AI?"},
            ]
        )

    assert isinstance(result, str)
    assert len(result) > 0
