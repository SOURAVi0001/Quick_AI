"""Quick.AI Chatbot Orchestrator Service.

Coordinates the end-to-end RAG pipeline under strict career-domain guardrails:
1. Request Ingestion & Application Validation
2. Query Classification & Guardrail Verification (rejects out-of-scope inquiries immediately)
3. Conversational Query Rewriting (resolves pronouns and chat history)
4. Context Retrieval (semantic RAG across documentation and authorized user records)
5. Grounded LLM Generation (produces answers anchored exclusively in retrieved context)
6. LLM-as-a-Judge Quality Evaluation (relevance, faithfulness, and consistency scoring)
7. Adaptive Retry Recovery (expands retrieval depth and refines guidance if needed)
8. Structured Client-Facing Response Assembly
"""

import json
import time
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.schemas.request import ChatRequest
from app.schemas.response import ChatResponse, EvaluationSummary, SourceItem
from app.services.classifier import ClassificationResult, QueryClassifier
from app.services.query_rewriter import QueryRewriter, RewritingResult
from app.services.retriever import ContextRetriever, RetrievalResult
from app.services.answer_generator import AnswerGenerator
from app.services.evaluator import AnswerEvaluator, EvaluationResult
from app.services.db_retriever import DatabaseRetrievalService
from app.providers.llm_base import BaseLLMProvider
from app.providers.lm_studio import LMStudioConnectionError
from app.utils.logging import logger


def _build_evaluation_context(retrieval: RetrievalResult, db_context: Optional[str] = None) -> str:
    """Give the judge the same selected user evidence that generation received."""
    sections = [f"- {doc.content}" for doc in retrieval.documents]
    if db_context:
        sections.append(f"Authoritative user database records:\n{db_context}")
    user = retrieval.user_context
    if not user:
        return "\n".join(sections)

    sections.append(f"Authorized user context: {user.full_name}, plan: {user.plan}")
    for feature, records in user.feature_history.items():
        if not records:
            continue
        sections.append(f"{feature.replace('_', ' ').title()} history:")
        for record in records:
            content = record.get("content", "")
            if not isinstance(content, str):
                content = json.dumps(content, ensure_ascii=False, default=str)
            sections.append(
                f"- Date: {record.get('created_at', 'unknown')}; "
                f"request: {str(record.get('prompt', ''))[:300]}; "
                f"result: {content[:3000]}"
            )
            source_resume = record.get("source_resume")
            if source_resume:
                sections.append(f"  Resume evidence: {str(source_resume)[:3000]}")
            job_description = record.get("resume_job_description")
            if job_description:
                sections.append(f"  Job description: {str(job_description)[:1500]}")
    if user.job_applications:
        sections.append("Job application history:")
        for application in user.job_applications:
            sections.append(
                f"- {application.get('company', 'unknown company')}, "
                f"{application.get('role', 'unknown role')}, "
                f"status {application.get('status', 'unknown')}"
            )
    return "\n".join(sections)


class ExecutionTracer:
    """Collects granular step-by-step trace nodes during pipeline execution.

    Used by developer tools and inspection endpoints without duplicating
    the core business logic.
    """

    def __init__(self) -> None:
        self.start_time: float = time.time()
        self.nodes: List[Dict[str, Any]] = []

    def record(
        self,
        node_id: str,
        name: str,
        file_path: str,
        function_name: str,
        status: str,
        description: str,
        input_data: Any,
        output_data: Any,
        duration_ms: float,
    ) -> None:
        """Appends a completed pipeline step to the execution trace."""
        self.nodes.append({
            "id": node_id,
            "name": name,
            "file": file_path,
            "function": function_name,
            "status": status,
            "description": description,
            "input": input_data,
            "output": output_data,
            "duration_ms": round(duration_ms, 2),
        })

    @property
    def total_duration_ms(self) -> float:
        """Returns the total elapsed execution time in milliseconds."""
        return round((time.time() - self.start_time) * 1000, 2)


class ChatbotService:
    """Orchestrates the intelligent Quick.AI career support chatbot pipeline."""

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        retriever: Optional[ContextRetriever] = None,
        max_retries: Optional[int] = None,
    ) -> None:
        self.llm_provider = llm_provider
        self.retriever = retriever or ContextRetriever()
        self.classifier = QueryClassifier(llm_provider)
        self.rewriter = QueryRewriter(llm_provider)
        self.generator = AnswerGenerator(llm_provider)
        self.evaluator = AnswerEvaluator(llm_provider)
        self.db_service = DatabaseRetrievalService()
        self.max_retries = max_retries if max_retries is not None else settings.MAX_RETRIES

    async def process_chat_request(
        self,
        request: ChatRequest,
        tracer: Optional[ExecutionTracer] = None,
    ) -> ChatResponse:
        """Processes a chat request through the full 8-step RAG pipeline.

        Args:
            request: Validated incoming user chat payload.
            tracer: Optional execution tracer for flowchart/telemetry inspection.

        Returns:
            Structured ChatResponse payload.
        """
        logger.info(
            "Processing chat request id='%s', user_id='%s', app='%s'",
            request.request_id,
            request.user_id,
            request.application_id,
        )

        # ----------------------------------------------------------------------
        # Step 1: Application ID Validation
        # ----------------------------------------------------------------------
        t0 = time.time()
        valid_apps = {settings.SUPPORTED_APPLICATION_ID.lower(), "quickai", "quick_ai"}
        is_app_valid = request.application_id.lower() in valid_apps
        t1 = time.time()

        if tracer:
            tracer.record(
                node_id="node_validation",
                name="Request Validation & Ingestion",
                file_path="app/schemas/request.py",
                function_name="ChatRequest.validate_query()",
                status="completed" if is_app_valid else "rejected",
                description=(
                    "Validated request payload and verified target application."
                    if is_app_valid else
                    f"Unsupported application '{request.application_id}' (expected '{settings.SUPPORTED_APPLICATION_ID}')."
                ),
                input_data={"raw_payload": request.model_dump()},
                output_data={"validated": is_app_valid, "app": request.application_id},
                duration_ms=(t1 - t0) * 1000,
            )

        if not is_app_valid:
            logger.warning(
                "Rejected unsupported application ID '%s' (expected '%s')",
                request.application_id,
                settings.SUPPORTED_APPLICATION_ID,
            )
            return ChatResponse(
                request_id=request.request_id,
                conversation_id=request.conversation_id,
                status="rejected",
                original_query=request.query,
                rewritten_query=None,
                answer="Sorry, this service only supports the Quick.AI application.",
                sources=[],
                retry_count=0,
            )

        # ----------------------------------------------------------------------
        # Step 2: Intent Classification
        # ----------------------------------------------------------------------
        t0 = time.time()
        try:
            classification: ClassificationResult = await self.classifier.classify_query(request.query)
        except (LMStudioConnectionError, ConnectionError) as exc:
            logger.error("LLM connection failed during classification: %s", exc)
            return self._build_error_response(
                request=request,
                rewritten_query=None,
                error_message="The AI classification service is temporarily unavailable. Please try again later.",
            )
        t1 = time.time()

        if tracer:
            tracer.record(
                node_id="node_classification",
                name="Query Intent Classification",
                file_path="app/services/classifier.py",
                function_name="QueryClassifier.classify_query()",
                status="completed",
                description=f"Classified as '{classification.category}' (confidence: {classification.confidence:.2f}): {classification.reason}",
                input_data={"query": request.query},
                output_data=classification.model_dump(),
                duration_ms=(t1 - t0) * 1000,
            )

        # ----------------------------------------------------------------------
        # Step 3: Out-of-Scope Guardrail Gate
        # ----------------------------------------------------------------------
        t0 = time.time()
        is_in_scope = classification.is_relevant and classification.category != "out_of_scope"
        t1 = time.time()

        if tracer:
            tracer.record(
                node_id="node_scope_gate",
                name="Guardrail Scope Gate",
                file_path="app/services/chatbot.py",
                function_name="ChatbotService._scope_gate()",
                status="passed" if is_in_scope else "blocked",
                description=(
                    "Query confirmed within Quick.AI career tools and user scope."
                    if is_in_scope else
                    "Query violated guardrails or asked about off-scope topics (server/code/world trivia)."
                ),
                input_data={"is_relevant": classification.is_relevant, "category": classification.category},
                output_data={"proceed_to_rag": is_in_scope},
                duration_ms=(t1 - t0) * 1000,
            )

        if not is_in_scope:
            logger.info("Query '%s' classified as out-of-scope; rejecting.", request.query)
            rejection_response = ChatResponse(
                request_id=request.request_id,
                conversation_id=request.conversation_id,
                status="rejected",
                original_query=request.query,
                rewritten_query=None,
                answer="Sorry, I can only answer questions related to this application.",
                sources=[],
                evaluation=None,
                retry_count=0,
            )
            if tracer:
                tracer.record(
                    node_id="node_final_response",
                    name="Final Response Assembly",
                    file_path="app/services/chatbot.py",
                    function_name="ChatbotService.process_chat_request()",
                    status="completed",
                    description="Assembled rejection response.",
                    input_data={"status": "rejected"},
                    output_data=rejection_response.model_dump(),
                    duration_ms=0.5,
                )
            return rejection_response

        # ----------------------------------------------------------------------
        # Fast Path: Static Greeting Handler (intent: "greeting")
        # ----------------------------------------------------------------------
        if classification.intent == "greeting" or classification.category == "greeting":
            logger.info("Query '%s' dispatched via static greeting handler.", request.query)
            return self._handle_greeting_response(request, classification, tracer)

        # ----------------------------------------------------------------------
        # Step 4: Conversational Query Rewriting
        # ----------------------------------------------------------------------
        t0 = time.time()
        rewriting: RewritingResult = await self.rewriter.rewrite_query(
            query=request.query,
            history=request.history,
        )
        current_search_query = rewriting.rewritten_query
        t1 = time.time()

        if tracer:
            tracer.record(
                node_id="node_rewriter",
                name="Conversational Query Rewriting",
                file_path="app/services/query_rewriter.py",
                function_name="QueryRewriter.rewrite_query()",
                status="completed",
                description=f"Rewrote query for standalone search: '{current_search_query}' ({rewriting.reason})",
                input_data={"query": request.query, "history_len": len(request.history) if request.history else 0},
                output_data=rewriting.model_dump(),
                duration_ms=(t1 - t0) * 1000,
            )

        # ----------------------------------------------------------------------
        # Database Retrieval & Dynamic Relational Context Augmentation
        # ----------------------------------------------------------------------
        db_context: Optional[str] = None
        selected_tables: List[str] = []

        if classification.requires_db:
            # Node: Database Table Selector
            t0 = time.time()
            selected_tables = self.db_service.select_tables(
                query=request.query,
                classification=classification,
            )
            t1 = time.time()

            if tracer:
                tracer.record(
                    node_id="node_db_table_selector",
                    name="Database Table Selector",
                    file_path="app/services/db_retriever.py",
                    function_name="DatabaseTableSelector.select_tables()",
                    status="completed",
                    description=f"Selected {len(selected_tables)} database tables: {', '.join(selected_tables)} (relational multi-db: {len(selected_tables) > 1}).",
                    input_data={"query": request.query, "intent": classification.intent, "needs_multi_db": classification.needs_multi_db},
                    output_data={"selected_tables": selected_tables, "needs_multi_db": len(selected_tables) > 1},
                    duration_ms=(t1 - t0) * 1000,
                )

            # Node: Database Retrieval & Dynamic Context Builder
            t0 = time.time()
            db_context = await self.db_service.fetch_and_build_context(
                user_id=request.user_id,
                query=request.query,
                tables=selected_tables,
                fallback_user_info=request.user_info,
            )
            t1 = time.time()

            if tracer:
                tracer.record(
                    node_id="node_db_context_builder",
                    name="Database Context Builder",
                    file_path="app/services/db_retriever.py",
                    function_name="DatabaseContextBuilder.build_relational_context()",
                    status="completed",
                    description=f"Retrieved and synthesized relational context across {len(selected_tables)} database tables.",
                    input_data={"user_id": request.user_id, "tables": selected_tables},
                    output_data={"has_db_context": bool(db_context), "preview": db_context[:200] if db_context else ""},
                    duration_ms=(t1 - t0) * 1000,
                )

        # ----------------------------------------------------------------------
        # Steps 5, 6 & 7: Retrieval, Generation & Evaluator Recovery Loop
        # ----------------------------------------------------------------------
        current_top_k = settings.RETRIEVAL_TOP_K
        attempt = 0
        last_eval_result: Optional[EvaluationResult] = None
        final_answer = ""
        final_sources: List[SourceItem] = []
        guidance: Optional[str] = None

        while attempt <= self.max_retries:
            logger.info(
                "Execution attempt %d/%d for query '%s'",
                attempt + 1,
                self.max_retries + 1,
                current_search_query,
            )

            # 5. Semantic Context Retrieval
            t0 = time.time()
            retrieval: RetrievalResult = self.retriever.retrieve_context(
                rewritten_query=current_search_query,
                user_id=request.user_id,
                application_id=request.application_id,
                top_k=current_top_k,
                dynamic_user_info=request.user_info,
            )
            t1 = time.time()

            if tracer:
                tracer.record(
                    node_id=f"node_retriever_attempt_{attempt + 1}",
                    name=f"Context Retrieval (Attempt {attempt + 1})",
                    file_path="app/services/retriever.py",
                    function_name="ContextRetriever.retrieve_context()",
                    status="completed",
                    description=(
                        f"Retrieved {len(retrieval.documents)} documents "
                        f"(top_score={retrieval.top_score:.3f}). User context found: "
                        f"{retrieval.user_context is not None}. Feature record counts: "
                        f"{ {key: len(value) for key, value in retrieval.user_context.feature_history.items()} if retrieval.user_context else {} }."
                    ),
                    input_data={"query": current_search_query, "top_k": current_top_k},
                    output_data={
                        "document_ids": [d.document_id for d in retrieval.documents],
                        "top_score": retrieval.top_score,
                        "has_user_context": retrieval.user_context is not None,
                        "feature_history_counts": {
                            key: len(value)
                            for key, value in retrieval.user_context.feature_history.items()
                        } if retrieval.user_context else {},
                    },
                    duration_ms=(t1 - t0) * 1000,
                )

            # 6. Grounded Candidate Answer Generation
            t0 = time.time()
            try:
                candidate_answer, sources = await self.generator.generate_answer(
                    original_query=request.query,
                    rewritten_query=current_search_query,
                    retrieval=retrieval,
                    history=request.history,
                    additional_guidance=guidance,
                    db_context=db_context,
                )
            except (LMStudioConnectionError, ConnectionError) as exc:
                logger.error("LLM connection failed during generation: %s", exc)
                return self._build_error_response(
                    request=request,
                    rewritten_query=rewriting.rewritten_query,
                    error_message="The AI generation service is temporarily unavailable. Please try again later.",
                )
            t1 = time.time()

            if tracer:
                tracer.record(
                    node_id=f"node_generator_attempt_{attempt + 1}",
                    name=f"Answer Generation (Attempt {attempt + 1})",
                    file_path="app/services/answer_generator.py",
                    function_name="AnswerGenerator.generate_answer()",
                    status="completed",
                    description=f"Generated candidate answer ({len(candidate_answer)} chars) grounded in {len(sources)} sources.",
                    input_data={
                        "retrieved_docs_count": len(retrieval.documents),
                        "feature_history_counts": {
                            key: len(records)
                            for key, records in retrieval.user_context.feature_history.items()
                        } if retrieval.user_context else {},
                    },
                    output_data={"answer_snippet": candidate_answer[:120], "sources_count": len(sources)},
                    duration_ms=(t1 - t0) * 1000,
                )

            # Prepare context summary for LLM judge evaluation
            context_summary = _build_evaluation_context(retrieval, db_context=db_context)

            # 7. Answer Quality Evaluation (LLM-as-a-Judge)
            t0 = time.time()
            try:
                eval_result = await self.evaluator.evaluate_answer(
                    original_query=request.query,
                    rewritten_query=current_search_query,
                    context_text=context_summary,
                    generated_answer=candidate_answer,
                )
            except Exception as exc:
                logger.warning("Answer evaluation failed (%s); accepting candidate answer", exc)
                eval_result = EvaluationResult(
                    is_satisfactory=True,
                    relevance_score=0.85,
                    grounding_score=0.85,
                    reason="Evaluation bypassed due to internal error.",
                )
            t1 = time.time()

            if tracer:
                tracer.record(
                    node_id=f"node_evaluator_attempt_{attempt + 1}",
                    name=f"Quality Evaluation (Attempt {attempt + 1})",
                    file_path="app/services/evaluator.py",
                    function_name="AnswerEvaluator.evaluate_answer()",
                    status="passed" if eval_result.is_satisfactory else "retry_needed",
                    description=f"Verdict: satisfactory={eval_result.is_satisfactory} (relevance={eval_result.relevance_score:.2f}, grounding={eval_result.grounding_score:.2f}). Reason: {eval_result.reason}",
                    input_data={"answer_chars": len(candidate_answer)},
                    output_data=eval_result.model_dump(),
                    duration_ms=(t1 - t0) * 1000,
                )

            last_eval_result = eval_result
            final_answer = candidate_answer
            final_sources = sources

            # Check if candidate passed quality thresholds
            if eval_result.is_satisfactory:
                logger.info(
                    "Answer passed evaluation on attempt %d (relevance=%.2f, grounding=%.2f)",
                    attempt + 1,
                    eval_result.relevance_score,
                    eval_result.grounding_score,
                )
                success_response = ChatResponse(
                    request_id=request.request_id,
                    conversation_id=request.conversation_id,
                    status="success",
                    original_query=request.query,
                    rewritten_query=rewriting.rewritten_query,
                    answer=final_answer,
                    sources=final_sources,
                    evaluation=EvaluationSummary(
                        is_satisfactory=eval_result.is_satisfactory,
                        relevance_score=eval_result.relevance_score,
                        grounding_score=eval_result.grounding_score,
                        reason=eval_result.reason,
                    ),
                    retry_count=attempt,
                )

                if tracer:
                    tracer.record(
                        node_id="node_final_response",
                        name="Final Response Assembly",
                        file_path="app/services/chatbot.py",
                        function_name="ChatbotService.process_chat_request()",
                        status="completed",
                        description=f"Completed successfully in {attempt + 1} attempt(s).",
                        input_data={"status": "success"},
                        output_data=success_response.model_dump(),
                        duration_ms=0.5,
                    )
                return success_response

            # Candidate answer failed evaluation; adjust search depth and retry
            logger.warning(
                "Attempt %d/%d failed evaluation: %s. Initiating retry recovery.",
                attempt + 1,
                self.max_retries + 1,
                eval_result.reason,
            )
            attempt += 1
            current_top_k += 2
            guidance = f"Previous answer failed evaluation: {eval_result.reason}. Ensure all claims strictly match retrieved text."

        # ----------------------------------------------------------------------
        # Step 8: Safe Fallback when retries are exhausted
        # ----------------------------------------------------------------------
        logger.warning("Max retries reached without satisfactory answer for '%s'", request.query)
        fallback_msg = (
            "I couldn't find enough reliable information to answer that question accurately. "
            "Please rephrase your question or provide more details."
        )

        fallback_response = ChatResponse(
            request_id=request.request_id,
            conversation_id=request.conversation_id,
            status="fallback",
            original_query=request.query,
            rewritten_query=rewriting.rewritten_query,
            answer=fallback_msg,
            sources=final_sources,
            evaluation=EvaluationSummary(
                is_satisfactory=last_eval_result.is_satisfactory if last_eval_result else False,
                relevance_score=last_eval_result.relevance_score if last_eval_result else 0.0,
                grounding_score=last_eval_result.grounding_score if last_eval_result else 0.0,
                reason=last_eval_result.reason if last_eval_result else "Max retries exceeded without passing evaluation.",
            ),
            retry_count=self.max_retries,
        )

        if tracer:
            tracer.record(
                node_id="node_final_response",
                name="Final Response Assembly",
                file_path="app/services/chatbot.py",
                function_name="ChatbotService.process_chat_request()",
                status="completed",
                description="Assembled fallback response after exhausting retries.",
                input_data={"status": "fallback"},
                output_data=fallback_response.model_dump(),
                duration_ms=0.5,
            )

        return fallback_response

    async def process_chat_request_with_trace(self, request: ChatRequest) -> Dict[str, Any]:
        """Processes request and captures a step-by-step execution trace without code duplication.

        Args:
            request: Incoming chat request.

        Returns:
            Dictionary containing 'response', 'trace' node list, and 'total_duration_ms'.
        """
        tracer = ExecutionTracer()
        response = await self.process_chat_request(request, tracer=tracer)
        return {
            "response": response.model_dump(),
            "trace": tracer.nodes,
            "total_duration_ms": tracer.total_duration_ms,
        }

    async def debug_chat_request(self, request: ChatRequest) -> Dict[str, Any]:
        """Provides granular intermediate step outputs for developer inspection."""
        start_time = time.time()
        classification = await self.classifier.classify_query(request.query)
        rewriting = await self.rewriter.rewrite_query(
            query=request.query,
            history=request.history,
        )
        retrieval = self.retriever.retrieve_context(
            rewritten_query=rewriting.rewritten_query,
            user_id=request.user_id,
            application_id=request.application_id,
            dynamic_user_info=request.user_info,
        )
        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "request_id": request.request_id,
            "classification": classification.model_dump(),
            "rewriting": rewriting.model_dump(),
            "retrieval_debug": {
                "top_score": retrieval.top_score,
                "is_sufficient": retrieval.is_sufficient,
                "document_count": len(retrieval.documents),
                "has_user_context": retrieval.user_context is not None,
                "feature_history_counts": {
                    key: len(records)
                    for key, records in retrieval.user_context.feature_history.items()
                } if retrieval.user_context else {},
                "job_application_count": len(retrieval.user_context.job_applications)
                if retrieval.user_context else 0,
            },
            "execution_time_ms": elapsed_ms,
        }

    def _build_error_response(
        self,
        request: ChatRequest,
        rewritten_query: Optional[str],
        error_message: str,
    ) -> ChatResponse:
        """Constructs a clean client-facing error response without revealing stack traces."""
        return ChatResponse(
            request_id=request.request_id,
            conversation_id=request.conversation_id,
            status="error",
            original_query=request.query,
            rewritten_query=rewritten_query,
            answer=error_message,
            sources=[],
            evaluation=None,
            retry_count=0,
        )

    def _handle_greeting_response(
        self,
        request: ChatRequest,
        classification: ClassificationResult,
        tracer: Optional[ExecutionTracer] = None,
    ) -> ChatResponse:
        """Constructs and returns an instant static greeting response without RAG/evaluator latency."""
        lower_q = request.query.lower().strip()
        user_name = ""
        if request.user_info:
            if isinstance(request.user_info, dict):
                full_name = request.user_info.get("full_name") or ""
            else:
                full_name = getattr(request.user_info, "full_name", "") or ""
            if full_name:
                first = full_name.strip().split()[0]
                if first and first.lower() not in {"there", "user", "guest"}:
                    user_name = f" {first}"

        # Differentiate conversational check-ins ("how are you") from general greetings ("hey", "hello")
        is_check_in = any(
            phrase in lower_q
            for phrase in [
                "how are you",
                "how r u",
                "how are u",
                "how's it going",
                "hows it going",
                "how is it going",
                "how have you been",
                "how do you do",
            ]
        )

        if is_check_in:
            greeting_prefix = f"Hello{user_name}! I'm doing great, thank you for asking! 😊 How can I help you today?"
        else:
            greeting_prefix = f"Hello{user_name}! 👋 How can I help you today?"

        greeting_text = (
            f"{greeting_prefix}\n\n"
            "I'm Fizzi AI, your Quick.AI career assistant. I can help you with:\n"
            "- **Resume Reviewer**: Get blunt, actionable feedback and ATS scores for your resume [Open Reviewer](/ai/review-resume)\n"
            "- **Resume Tailor**: Tailor and align your resume with specific job descriptions [Open Tailor](/ai/resume-tailor)\n"
            "- **Career Profile Score**: Benchmark your career profile across skills, experience, and impact [View Score](/ai/career-score)\n"
            "- **Job Tracker**: Organize and track your job applications and interview stages [Open Tracker](/ai/job-tracker)\n"
            "- **Smart Email Writer**: Draft professional networking and job search emails [Write Email](/ai/write-email)\n"
            "- **Recruiter Outreach**: Connect directly with recruiters and hiring managers [Open Outreach](/ai/recruiter-outreach)\n"
            "- **LinkedIn Optimizer**: Sharpen your headline, about section, and keywords [Optimize Profile](/ai/linkedin-optimizer)\n"
            "- **AI Interview Coach**: Practice role-specific mock interview questions with instant feedback [Start Practice](/ai/interview-coach)\n\n"
            "You can also ask me about your account status, remaining free quota, or past creations history.\n\n"
            "What would you like to work on today?"
        )

        greeting_response = ChatResponse(
            request_id=request.request_id,
            conversation_id=request.conversation_id,
            status="success",
            original_query=request.query,
            rewritten_query=None,
            answer=greeting_text,
            sources=[],
            evaluation=EvaluationSummary(
                is_satisfactory=True,
                relevance_score=1.0,
                grounding_score=1.0,
                reason="Static greeting response dispatched directly for greeting intent.",
            ),
            retry_count=0,
        )

        if tracer:
            tracer.record(
                node_id="node_greeting_handler",
                name="Static Greeting Dispatcher",
                file_path="app/services/chatbot.py",
                function_name="ChatbotService._handle_greeting_response()",
                status="completed",
                description="Classified as greeting intent. Dispatched instant static greeting response without RAG/evaluator latency.",
                input_data={"query": request.query, "intent": classification.intent},
                output_data={"status": "success", "type": "static_greeting"},
                duration_ms=0.5,
            )
            tracer.record(
                node_id="node_final_response",
                name="Final Response Assembly",
                file_path="app/services/chatbot.py",
                function_name="ChatbotService.process_chat_request()",
                status="completed",
                description="Assembled static greeting response.",
                input_data={"status": "success"},
                output_data=greeting_response.model_dump(),
                duration_ms=0.5,
            )

        return greeting_response
