"""Query rewriting module for the ProjectHub chatbot backend.

Converts conversational or ambiguous queries into clear, self-contained search queries
optimized for vector retrieval and grounded generation.
"""

import json
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.request import ChatMessage
from app.providers.llm_base import BaseLLMProvider
from app.utils.logging import logger


class RewritingResult(BaseModel):
    """Structured query rewriting output."""

    original_query: str = Field(..., description="The user's original query")
    rewritten_query: str = Field(..., description="Standalone, unambiguous query")
    reason: str = Field(..., description="Rationale for query transformation")


QUERY_REWRITER_SYSTEM_PROMPT = """You are a query rewriting module for Quick.AI's chatbot assistant.
Your task is to rephrase the user's latest query into an explicit, standalone question suitable for knowledge base search and retrieval.

Rules:
1. Disambiguate pronouns and conversational references using provided chat history (e.g. 'the completed ones' -> 'completed tasks or creations').
2. Explicitly specify 'Quick.AI' when referring to 'this app' or 'the application'.
3. Do not invent facts or context not present in the chat history or query.
4. Keep the query focused and search-friendly.

You must return ONLY a valid JSON object with the following schema:
{
  "original_query": "user original query",
  "rewritten_query": "rewritten standalone query",
  "reason": "brief explanation"
}
Do not include any other markdown or comments outside the JSON object.
"""


class QueryRewriter:
    """Rewrites queries using an LLM, with graceful fallback to the original query."""

    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm_provider = llm_provider

    async def rewrite_query(
        self,
        query: str,
        history: Optional[List[ChatMessage]] = None,
    ) -> RewritingResult:
        """Transforms a conversational query into a standalone search query."""
        # If no conversation history, query is already standalone; avoid unnecessary local LLM inference delay
        if not history:
            return RewritingResult(
                original_query=query,
                rewritten_query=query,
                reason="Query is standalone without conversation history.",
            )

        try:
            # Build conversation context string if history is present
            history_turns = [f"{turn.role}: {turn.content}" for turn in history[-4:]]
            history_context = f"\nRecent Conversation History:\n" + "\n".join(history_turns)

            user_content = f"Original Query: {query}{history_context}"

            messages = [
                {"role": "system", "content": QUERY_REWRITER_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ]

            response_text = await self.llm_provider.chat_complete(messages=messages, temperature=0.0)
            clean_json = self._clean_json_response(response_text)
            data = json.loads(clean_json)

            rewritten = data.get("rewritten_query", "").strip()
            if not rewritten:
                raise ValueError("Rewritten query was empty in model response")

            return RewritingResult(
                original_query=query,
                rewritten_query=rewritten,
                reason=data.get("reason", "Query rewritten by LLM."),
            )

        except Exception as exc:
            # Fall back to original query rather than failing the entire request
            logger.warning(
                "Query rewriting failed (%s). Falling back safely to original query: '%s'",
                exc,
                query,
            )
            return RewritingResult(
                original_query=query,
                rewritten_query=query,
                reason=f"Fallback: Original query retained due to rewriting error ({exc}).",
            )

    def _clean_json_response(self, text: str) -> str:
        """Strips markdown code fences, reasoning tags, and extracts outer JSON object."""
        import re
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
