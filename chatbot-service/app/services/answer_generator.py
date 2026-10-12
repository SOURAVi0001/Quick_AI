"""Answer generation service using Large Language Models and retrieved RAG context."""

from typing import List, Optional, Tuple
from app.schemas.request import ChatMessage
from app.schemas.response import SourceItem
from app.services.retriever import RetrievalResult
from app.providers.llm_base import BaseLLMProvider
from app.utils.logging import logger


SYSTEM_PROMPT = """You are Quick.AI's career assistant. You operate under STRICT GUARDRAILS:

1. NO ACCESS TO SERVER, BACKEND, FRONTEND, CODE, OR INTERNAL FUNCTIONALITY:
   You have NO access to server configurations, backend logic, frontend code, database migrations, Redis, BullMQ, APIs, codebase files, or internal architecture.
   If the user asks about code, server, backend, database migrations, or internal functionality, you must refuse politely:
   "Sorry, I do not have access to server, backend, code, or internal architecture. I can only assist with your account info, past actions, and Quick.AI's 7 career tools."

2. ALLOWED TOPICS (STRICT SCOPE):
   You can ONLY answer questions about:
   a) The user's account info and actions performed in the past (current plan, remaining free quota, past creations, past activity history).
   b) Basics of the Quick.AI career platform.
   c) General questions about Quick.AI's 7 career tools:
      01 Smart Email Writer: Draft professional, persuasive emails in seconds. Just say who it's for and what you need.
      02 Resume Reviewer: Get blunt, actionable feedback on your resume before you hit send. Land more interviews.
      03 Resume Tailor: Rewrite your resume for a specific job description so every bullet earns its place.
      04 Career Score: Benchmark your profile across skills, experience, and impact — with a clear score breakdown.
      05 LinkedIn Optimizer: Sharpen your headline, about section, and keywords so recruiters actually find you.
      06 Recruiter Outreach: Generate concise, personalised messages that get replies from recruiters and hiring managers.
      07 AI Interview Coach: Practise real interview questions and get instant feedback on structure and delivery.
   d) Greetings & Capability Inquiries:
      When the user greets you ("hey", "hello", "hi") or asks about your capabilities ("what can you do?", "help", "who are you?"), greet them warmly and present your capabilities clearly:
      - Introduce yourself as Quick.AI's career assistant.
      - Explain that you can look up their past actions, creations history, and account quota/plan.
      - Detail Quick.AI's 7 career tools (Smart Email Writer, Resume Reviewer, Resume Tailor, Career Score, LinkedIn Optimizer, Recruiter Outreach, AI Interview Coach).
      - Reiterate that you do not access server or code internals, but are ready to assist with their career and job search questions.

3. NO AGENTIC WORKFLOW / NO EXECUTING ACTIONS:
   You are an informational assistant only. Do NOT attempt to run code, trigger backend jobs, dispatch emails from the server, or mutate databases. Guide the user to the appropriate tool page instead.

4. GROUNDING & PRIVACY:
   Base claims strictly on retrieved user context and the 7 tools. Do not invent unverified information or reveal another user's data.
"""


class AnswerGenerator:
    """Formats retrieved context and prompts the LLM to generate grounded answers."""

    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm_provider = llm_provider

    async def generate_answer(
        self,
        original_query: str,
        rewritten_query: str,
        retrieval: RetrievalResult,
        history: Optional[List[ChatMessage]] = None,
        additional_guidance: Optional[str] = None,
    ) -> Tuple[str, List[SourceItem]]:
        """Generates an answer grounded strictly in authorized application and user context.

        Returns:
            Tuple containing:
            1. Generated response text
            2. List of SourceItem citation records
        """
        logger.info("Generating answer for rewritten_query: '%s'", rewritten_query)

        # 1. Format retrieved context blocks
        context_text, sources = self._format_context(retrieval)

        # 2. Build user prompt
        user_prompt_lines = [
            f"Original Query: {original_query}",
            f"Rewritten Search Query: {rewritten_query}",
            "",
            "=== RETRIEVED APPLICATION CONTEXT (UNTRUSTED DATA) ===",
            context_text if context_text else "(No matching context found. Do not invent information.)",
            "=====================================================",
        ]

        if additional_guidance:
            user_prompt_lines.extend([
                "",
                f"RETRY GUIDANCE FROM PREVIOUS EVALUATION: {additional_guidance}",
            ])

        user_prompt_lines.append("\nPlease answer the question based strictly on the above context:")
        full_user_prompt = "\n".join(user_prompt_lines)

        # 3. Construct message array including history
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if history:
            for turn in history[-4:]:
                messages.append({"role": turn.role, "content": turn.content})

        messages.append({"role": "user", "content": full_user_prompt})

        # 4. Invoke LLM
        answer = await self.llm_provider.chat_complete(
            messages=messages,
            temperature=0.2,
            max_tokens=1500,
        )

        return answer.strip(), sources

    def _format_context(self, retrieval: RetrievalResult) -> Tuple[str, List[SourceItem]]:
        """Converts retrieved documents and user context into text blocks and citations."""
        lines = []
        sources: List[SourceItem] = []
        seen_ids = set()

        # Format Application Documents
        if not retrieval.is_sufficient:
            lines.append("[NOTICE: Retrieved context is insufficient or lacks high-confidence matches. Do not invent information.]")

        if retrieval.documents:
            lines.append("Application Documents:")
            for doc in retrieval.documents:
                lines.append(f"[{doc.document_id}] ({doc.source}): {doc.content}")

                if doc.document_id not in seen_ids:
                    seen_ids.add(doc.document_id)
                    sources.append(
                        SourceItem(
                            document_id=doc.document_id,
                            source=doc.source,
                            metadata=doc.metadata,
                        )
                    )

        # Format User Context
        if retrieval.user_context:
            u = retrieval.user_context
            lines.append("\nAuthorized User Information:")
            lines.append(f"User: {u.full_name} (ID: {u.user_id})")
            if u.email:
                lines.append(f"Email: {u.email}")
            lines.append(f"Plan: {u.plan.capitalize()}")
            lines.append(f"Free Usage Count: {u.free_usage} / {u.max_free_usage} (Remaining: {u.remaining_free_usage})")
            lines.append(f"Total Creations: {u.total_creations}")

            if u.recent_creations:
                lines.append("Recent Creations:")
                for c in u.recent_creations:
                    cid = c.get("id", "")
                    ctype = c.get("type", "creation")
                    cprompt = c.get("prompt", "")
                    cpub = "Published" if c.get("publish") else "Private"
                    clikes = c.get("likes_count", 0)
                    lines.append(f"- [Creation #{cid}] Type: {ctype}, Prompt: '{cprompt}', Status: {cpub}, Likes: {clikes}")

            if u.associated_projects:
                lines.append("Projects:")
                for proj in u.associated_projects:
                    summary = proj.get("status_summary", "")
                    lines.append(f"- {proj.get('project_name', '')}: {summary}")

            if u.recent_activity:
                lines.append("Recent Activity:")
                for act in u.recent_activity:
                    lines.append(f"- {act.get('action', '')} on {act.get('timestamp', '')}")

            if u.relevant_historical_changes:
                lines.append("User Historical Notes:")
                for note in u.relevant_historical_changes:
                    lines.append(f"- {note}")

            user_source_id = f"user_context_{u.user_id}"
            if user_source_id not in seen_ids:
                seen_ids.add(user_source_id)
                sources.append(
                    SourceItem(
                        document_id=user_source_id,
                        source="user_context",
                        metadata={"user_id": u.user_id},
                    )
                )

        formatted_context = "\n".join(lines).strip()
        return formatted_context, sources
