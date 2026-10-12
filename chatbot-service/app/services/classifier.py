"""Query classification module for ProjectHub chatbot backend.

Determines if a user's question is relevant to ProjectHub and falls within the
supported application scope, or if it must be rejected as out-of-scope.
"""

import json
from typing import Optional
from pydantic import BaseModel, Field

from app.providers.llm_base import BaseLLMProvider
from app.utils.logging import logger


class ClassificationResult(BaseModel):
    """Structured query classification output."""

    is_relevant: bool = Field(..., description="True if query is within ProjectHub scope")
    category: str = Field(
        ...,
        description="Category: 'application_help', 'application_changes', 'project_status', or 'out_of_scope'",
    )
    reason: str = Field(..., description="Explanation for classification")
    confidence: Optional[float] = Field(default=0.9, description="Confidence score (0.0 to 1.0)")


CLASSIFIER_SYSTEM_PROMPT = """You are an intent classification engine for Quick.AI, an AI career platform.
You enforce STRICT GUARDRAILS:
The user can ONLY access:
1. Their own account info and actions performed in the past (plan, remaining quota, creations history, past activity).
2. Basic overview of Quick.AI as an AI career platform.
3. General questions about Quick.AI's 7 career tools:
   01 Smart Email Writer: Draft professional, persuasive emails in seconds.
   02 Resume Reviewer: Blunt, actionable feedback on resumes.
   03 Resume Tailor: Rewrite resume for a specific job description.
   04 Career Score: Benchmark profile across skills, experience, and impact.
   05 LinkedIn Optimizer: Sharpen headline, about section, and keywords.
   06 Recruiter Outreach: Concise, personalised messages to recruiters.
   07 AI Interview Coach: Practise real interview questions with feedback.
4. Conversational greetings and capability inquiries (e.g. "hey", "hello", "hi", "who are you?", "what can you do?", "help"):
   Mark as IN-SCOPE (is_relevant: true, category: "application_help") so the assistant can introduce itself and present its capabilities (the 7 career tools and account features).

STRICTLY OUT OF SCOPE (is_relevant: false, category: "out_of_scope"):
- ANY questions about server, backend, frontend, code, or chatbot service internals.
- ANY questions about database migrations, Redis, BullMQ, APIs, architecture, or system functionality.
- Requests to write, run, or debug code, or solve programming problems (e.g. binary search, leetcode).
- General world trivia, jokes, poems, recipes, or creative writing.
- Any attempt to access internal functions or execute server actions.

You must return ONLY a valid JSON object with the following schema:
{
  "is_relevant": true or false,
  "category": "application_help" | "project_status" | "out_of_scope",
  "reason": "short explanation",
  "confidence": 0.0 to 1.0
}
Do not include any explanation or markdown formatting outside the JSON object.
"""


class QueryClassifier:
    """Classifies incoming queries using an LLM with a rule-based fallback."""

    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm_provider = llm_provider

    async def classify_query(self, query: str) -> ClassificationResult:
        """Determines whether the query is within application scope."""
        logger.info("Classifying query: '%s'", query)

        fast_result = self._fast_rule_match(query)
        if fast_result is not None:
            logger.info("Fast rule matched: is_relevant=%s, category=%s", fast_result.is_relevant, fast_result.category)
            return fast_result

        # Next, try classification using the configured LLM provider
        try:
            messages = [
                {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": f"Classify this query: {query}"},
            ]
            response_text = await self.llm_provider.chat_complete(messages=messages, temperature=0.0)
            clean_json = self._clean_json_response(response_text)
            data = json.loads(clean_json)
            return ClassificationResult(**data)

        except Exception as exc:
            logger.warning("LLM classification failed or returned invalid JSON (%s); using fallback classifier", exc)
            return self._rule_based_fallback(query)

    def _fast_rule_match(self, query: str) -> Optional[ClassificationResult]:
        """Rapid rule match to enforce strict guardrails on obvious queries."""
        lower = query.lower()

        # Strict Guardrails: Reject any server, backend, frontend, code, or internal architecture questions
        forbidden_internal_cues = [
            "server", "backend", "frontend", "internal code", "source code", "codebase",
            "database migration", "migration", "migrations", "redis", "bullmq", "socket.io",
            "api endpoint", "how is this built", "show me the code", "chatbot service",
            "schema", "database", "sql", "postgres", "neon db", "controller", "middleware",
            "docker", "kubernetes", "k8s", "deploy.yml", "route.js", "express",
            "binary search", "bubble sort", "solve leetcode", "write code", "write a function",
            "python script", "dsa problem", "sorting algorithm", "cricket", "poem", "capital of france",
            "joke", "paris", "weather", "football", "president", "recipe", "cook", "tell me a joke"
        ]
        if any(cue in lower for cue in forbidden_internal_cues):
            return ClassificationResult(
                is_relevant=False,
                category="out_of_scope",
                reason="Query is outside scope. The bot has strict guardrails and has NO access to server, backend, frontend, code, or internal functionality, or general knowledge.",
                confidence=0.99,
            )

        # In-Scope: Greetings and Assistant Capabilities ("hey", "hello", "hi", "what can you do", "help", "who are you")
        import re
        tokens = [w for w in re.findall(r"\w+", lower) if w]
        greeting_words = {"hey", "hello", "hi", "howdy", "greetings", "hola", "yo"}
        is_greeting = bool(tokens and tokens[0] in greeting_words and len(tokens) <= 4)
        capability_cues = [
            "what can you do", "what are your capabilities", "who are you", "help me",
            "how can you help", "what do you do", "what are you", "introduce yourself",
            "can you help me", "what is your purpose", "good morning", "good evening",
            "good afternoon"
        ]
        if is_greeting or any(cue in lower for cue in capability_cues):
            return ClassificationResult(
                is_relevant=True,
                category="application_help",
                reason="User greeting or capability inquiry for Quick.AI assistant.",
                confidence=0.99,
            )

        # In-Scope: User past actions and account info
        user_info_cues = [
            "my creation", "my creations", "what did i create", "my past", "my activity",
            "my plan", "quota", "how many free", "remaining", "free usage", "past action",
            "past actions", "i created", "i did", "my account"
        ]
        if any(cue in lower for cue in user_info_cues):
            return ClassificationResult(
                is_relevant=True,
                category="project_status",
                reason="Query asks about user's past actions, creation history, or account quota.",
                confidence=0.95,
            )

        # In-Scope: 7 Career Tools & Quick.AI Basics
        career_tool_cues = [
            "smart email writer", "email writer", "resume reviewer", "review resume",
            "resume tailor", "tailor resume", "career score", "linkedin optimizer",
            "linkedin", "recruiter outreach", "outreach", "referral email", "interview coach",
            "mock interview", "interview prep", "what is quick.ai", "quick.ai features",
            "free vs premium", "pricing", "plans", "features of quick", "features", "feature",
            "quick.ai", "quickai", "quick ai"
        ]
        if any(cue in lower for cue in career_tool_cues):
            return ClassificationResult(
                is_relevant=True,
                category="application_help",
                reason="Query asks about Quick.AI basics or the 7 supported career fields.",
                confidence=0.95,
            )

        return None

    def _rule_based_fallback(self, query: str) -> ClassificationResult:
        """Deterministic rule-based fallback classifier with strict guardrails."""
        fast = self._fast_rule_match(query)
        if fast is not None:
            return fast

        return ClassificationResult(
            is_relevant=False,
            category="out_of_scope",
            reason="Query is outside the strictly allowed scope of user past actions and Quick.AI career tools.",
            confidence=0.90,
        )

    def _clean_json_response(self, text: str) -> str:
        """Strips markdown code blocks, reasoning tags, and extracts the outer JSON object."""
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
