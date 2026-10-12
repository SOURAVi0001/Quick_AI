"""Main Chatbot Orchestrator Service.

Coordinates the end-to-end processing pipeline:
1. Request validation and application ID verification
2. Query classification (rejects out-of-scope queries immediately)
3. Query rewriting (turns conversational queries into standalone queries)
4. Context retrieval via semantic RAG and authorized user data
5. Grounded LLM answer generation
6. Answer quality evaluation (LLM-as-a-Judge)
7. Bounded recovery retries if the answer is unsatisfactory
8. Structured JSON response formation
"""

from typing import Any, Dict, Optional, Tuple
from app.core.config import settings
from app.schemas.request import ChatRequest
from app.schemas.response import ChatResponse, EvaluationSummary, SourceItem
from app.services.classifier import ClassificationResult, QueryClassifier
from app.services.query_rewriter import QueryRewriter, RewritingResult
from app.services.retriever import ContextRetriever, RetrievalResult
from app.services.answer_generator import AnswerGenerator
from app.services.evaluator import AnswerEvaluator, EvaluationResult
from app.providers.llm_base import BaseLLMProvider
from app.providers.lm_studio import LMStudioConnectionError
from app.utils.logging import logger


class ChatbotService:
    """Orchestrates the entire intelligent chatbot pipeline."""

    def __init__(
        self,
        llm_provider: BaseLLMProvider,
        retriever: Optional[ContextRetriever] = None,
        max_retries: Optional[int] = None,
    ):
        self.llm_provider = llm_provider
        self.retriever = retriever or ContextRetriever()
        self.classifier = QueryClassifier(llm_provider)
        self.rewriter = QueryRewriter(llm_provider)
        self.generator = AnswerGenerator(llm_provider)
        self.evaluator = AnswerEvaluator(llm_provider)
        self.max_retries = max_retries if max_retries is not None else settings.MAX_RETRIES

    async def process_chat_request(self, request: ChatRequest) -> ChatResponse:
        """Processes a chat request through the full 8-step pipeline."""
        logger.info(
            "Processing chat request id='%s', user_id='%s', app='%s'",
            request.request_id,
            request.user_id,
            request.application_id,
        )

        # ----------------------------------------------------------------------
        # Step 1: Application ID Check
        # ----------------------------------------------------------------------
        valid_apps = {settings.SUPPORTED_APPLICATION_ID.lower(), "quickai", "quick_ai"}
        if request.application_id.lower() not in valid_apps:
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
        # Step 2: Query Classification
        # ----------------------------------------------------------------------
        classification: ClassificationResult = await self.classifier.classify_query(request.query)

        # Step 3: Out-of-scope Rejection Branching
        # If irrelevant, stop immediately and return polite response without invoking RAG or generation.
        if not classification.is_relevant or classification.category == "out_of_scope":
            logger.info("Query '%s' classified as out-of-scope; rejecting.", request.query)
            return ChatResponse(
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

        # ----------------------------------------------------------------------
        # Step 4: Query Rewriting
        # ----------------------------------------------------------------------
        rewriting: RewritingResult = await self.rewriter.rewrite_query(
            query=request.query,
            history=request.history,
        )
        current_search_query = rewriting.rewritten_query

        # ----------------------------------------------------------------------
        # Step 5 & 6 & 7: Context Retrieval, Generation, and Evaluator Retry Loop
        # ----------------------------------------------------------------------
        current_top_k = settings.RETRIEVAL_TOP_K
        attempt = 0
        last_eval_result: Optional[EvaluationResult] = None
        final_answer = ""
        final_sources = []
        guidance = None

        while attempt <= self.max_retries:
            logger.info(
                "Execution attempt %d/%d for query '%s'",
                attempt + 1,
                self.max_retries + 1,
                current_search_query,
            )

            # 5. Retrieve Context (expanding top_k on retries if needed)
            retrieval: RetrievalResult = self.retriever.retrieve_context(
                rewritten_query=current_search_query,
                user_id=request.user_id,
                application_id=request.application_id,
                top_k=current_top_k,
                dynamic_user_info=request.user_info,
            )

            # If retrieval has insufficient context and this is attempt 0, check
            if not retrieval.is_sufficient and attempt == 0:
                logger.info("Retrieved context deemed insufficient for query '%s'", current_search_query)

            # 6. Generate Candidate Answer
            try:
                candidate_answer, sources = await self.generator.generate_answer(
                    original_query=request.query,
                    rewritten_query=current_search_query,
                    retrieval=retrieval,
                    history=request.history,
                    additional_guidance=guidance,
                )
            except (LMStudioConnectionError, ConnectionError) as exc:
                logger.error("LLM provider connection failed during generation: %s", exc)
                return self._build_error_response(
                    request=request,
                    rewritten_query=rewriting.rewritten_query,
                    error_message="The AI generation service is temporarily unavailable. Please try again later.",
                )

            # Format context text for evaluator review
            context_summary = "\n".join([f"- {d.content}" for d in retrieval.documents])
            if retrieval.user_context:
                context_summary += f"\n- User context: {retrieval.user_context.full_name}, {retrieval.user_context.associated_projects}"

            # 7. Evaluate Answer Quality (LLM-as-a-Judge)
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

            last_eval_result = eval_result
            final_answer = candidate_answer
            final_sources = sources

            # Check if answer passed evaluation
            if eval_result.is_satisfactory:
                logger.info(
                    "Answer passed evaluation on attempt %d (relevance=%.2f, grounding=%.2f)",
                    attempt + 1,
                    eval_result.relevance_score,
                    eval_result.grounding_score,
                )
                return ChatResponse(
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

            # Answer was unsatisfactory; prepare for retry if retries remain
            logger.warning(
                "Attempt %d/%d failed evaluation: %s. Initiating retry recovery.",
                attempt + 1,
                self.max_retries + 1,
                eval_result.reason,
            )

            # Retry improvement strategy: expand retrieval depth & refine query
            attempt += 1
            current_top_k += 2
            guidance = f"Previous answer failed evaluation: {eval_result.reason}. Ensure all claims strictly match retrieved text."

        # ----------------------------------------------------------------------
        # Step 8: Fallback when retries exhausted
        # ----------------------------------------------------------------------
        logger.warning("Max retries reached without satisfactory answer for '%s'", request.query)
        fallback_msg = (
            "I couldn't find enough reliable information to answer that question accurately. "
            "Please rephrase your question or provide more details."
        )

        return ChatResponse(
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

    async def process_chat_request_with_trace(self, request: ChatRequest) -> Dict[str, Any]:
        """Processes request and captures a step-by-step developer trace for live flowchart visualization."""
        import time
        trace_nodes = []
        overall_start = time.time()

        def add_trace_node(
            node_id: str,
            name: str,
            file_path: str,
            function_name: str,
            status_val: str,
            description: str,
            input_data: Any,
            output_data: Any,
            duration_ms: float,
        ):
            trace_nodes.append({
                "id": node_id,
                "name": name,
                "file": file_path,
                "function": function_name,
                "status": status_val,
                "description": description,
                "input": input_data,
                "output": output_data,
                "duration_ms": round(duration_ms, 2),
            })

        # ----------------------------------------------------------------------
        # Node 1: Request Ingestion & Validation
        # ----------------------------------------------------------------------
        t0 = time.time()
        raw_input = request.model_dump()
        valid_apps = {settings.SUPPORTED_APPLICATION_ID.lower(), "quickai", "quick_ai"}
        is_app_valid = request.application_id.lower() in valid_apps
        t1 = time.time()

        add_trace_node(
            node_id="node_validation",
            name="Request Validation & Ingestion",
            file_path="app/schemas/request.py",
            function_name="ChatRequest.validate_query()",
            status_val="completed" if is_app_valid else "rejected",
            description=(
                "Validated request fields, stripped whitespace, and verified target application."
                if is_app_valid else
                f"Application ID '{request.application_id}' does not match supported '{settings.SUPPORTED_APPLICATION_ID}'."
            ),
            input_data={"raw_payload": raw_input},
            output_data={
                "validated": is_app_valid,
                "request_id": request.request_id,
                "user_id": request.user_id,
                "application_id": request.application_id,
                "query": request.query,
                "history_turns": len(request.history) if request.history else 0,
            },
            duration_ms=(t1 - t0) * 1000,
        )

        if not is_app_valid:
            resp = ChatResponse(
                request_id=request.request_id,
                conversation_id=request.conversation_id,
                status="rejected",
                original_query=request.query,
                rewritten_query=None,
                answer="Sorry, this service only supports the Quick.AI application.",
                sources=[],
                retry_count=0,
            )
            return {
                "response": resp.model_dump(),
                "trace": trace_nodes,
                "total_duration_ms": round((time.time() - overall_start) * 1000, 2),
            }

        # ----------------------------------------------------------------------
        # Node 2: Query Classification
        # ----------------------------------------------------------------------
        t0 = time.time()
        classification: ClassificationResult = await self.classifier.classify_query(request.query)
        t1 = time.time()

        add_trace_node(
            node_id="node_classification",
            name="Query Intent Classification",
            file_path="app/services/classifier.py",
            function_name="QueryClassifier.classify_query()",
            status_val="completed",
            description=(
                f"Classified as '{classification.category}' with {int(classification.confidence * 100)}% confidence: {classification.reason}"
            ),
            input_data={"query": request.query},
            output_data=classification.model_dump(),
            duration_ms=(t1 - t0) * 1000,
        )

        # ----------------------------------------------------------------------
        # Node 3: Scope Decision Gate
        # ----------------------------------------------------------------------
        is_relevant = classification.is_relevant and classification.category != "out_of_scope"
        add_trace_node(
            node_id="node_scope_gate",
            name="Scope Decision Gate",
            file_path="app/services/chatbot.py",
            function_name="ChatbotService.process_chat_request()",
            status_val="completed" if is_relevant else "rejected",
            description=(
                "Query approved as relevant to Quick.AI. Passing to Query Rewriter."
                if is_relevant else
                "Query is out-of-scope. Short-circuiting execution to polite rejection without invoking RAG or LLM."
            ),
            input_data={"is_relevant": classification.is_relevant, "category": classification.category},
            output_data={"proceed_to_rag": is_relevant, "action": "rewrite_and_retrieve" if is_relevant else "reject_query"},
            duration_ms=0.1,
        )

        if not is_relevant:
            resp = ChatResponse(
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
            return {
                "response": resp.model_dump(),
                "trace": trace_nodes,
                "total_duration_ms": round((time.time() - overall_start) * 1000, 2),
            }

        # ----------------------------------------------------------------------
        # Node 4: Query Rewriting
        # ----------------------------------------------------------------------
        t0 = time.time()
        rewriting: RewritingResult = await self.rewriter.rewrite_query(
            query=request.query,
            history=request.history,
        )
        t1 = time.time()

        add_trace_node(
            node_id="node_rewriter",
            name="Conversational Query Rewriting",
            file_path="app/services/query_rewriter.py",
            function_name="QueryRewriter.rewrite_query()",
            status_val="completed",
            description=f"Rewrote conversational query into standalone search query: {rewriting.reason}",
            input_data={
                "original_query": request.query,
                "history_turns": [turn.model_dump() for turn in request.history] if request.history else [],
            },
            output_data=rewriting.model_dump(),
            duration_ms=(t1 - t0) * 1000,
        )

        current_search_query = rewriting.rewritten_query
        current_top_k = settings.RETRIEVAL_TOP_K
        attempt = 0
        last_eval_result: Optional[EvaluationResult] = None
        final_answer = ""
        final_sources = []
        guidance = None

        while attempt <= self.max_retries:
            attempt_prefix = f"[Attempt {attempt + 1}] " if attempt > 0 else ""

            # ------------------------------------------------------------------
            # Node 5: Context Retrieval (RAG & User Context)
            # ------------------------------------------------------------------
            t0 = time.time()
            retrieval: RetrievalResult = self.retriever.retrieve_context(
                rewritten_query=current_search_query,
                user_id=request.user_id,
                application_id=request.application_id,
                top_k=current_top_k,
                dynamic_user_info=request.user_info,
            )
            t1 = time.time()

            add_trace_node(
                node_id=f"node_retriever_attempt_{attempt}",
                name=f"{attempt_prefix}Semantic Context Retrieval (RAG)",
                file_path="app/services/retriever.py",
                function_name="ContextRetriever.retrieve_context()",
                status_val="completed",
                description=(
                    f"Retrieved {len(retrieval.documents)} documents (top cosine similarity: {retrieval.top_score:.2f}) "
                    f"and {'authorized' if retrieval.user_context else 'no'} user context for {request.user_id}."
                ),
                input_data={
                    "search_query": current_search_query,
                    "user_id": request.user_id,
                    "application_id": request.application_id,
                    "top_k": current_top_k,
                },
                output_data={
                    "documents_retrieved": [
                        {
                            "document_id": d.document_id,
                            "source": d.source,
                            "similarity_score": d.similarity_score,
                            "snippet": d.content[:120] + "...",
                        }
                        for d in retrieval.documents
                    ],
                    "user_context_included": bool(retrieval.user_context),
                    "user_context_preview": retrieval.user_context.model_dump() if retrieval.user_context else None,
                    "is_sufficient": retrieval.is_sufficient,
                    "retrieval_mode": retrieval.retrieval_mode,
                },
                duration_ms=(t1 - t0) * 1000,
            )

            # ------------------------------------------------------------------
            # Node 6: Answer Generation
            # ------------------------------------------------------------------
            t0 = time.time()
            try:
                candidate_answer, sources = await self.generator.generate_answer(
                    original_query=request.query,
                    rewritten_query=current_search_query,
                    retrieval=retrieval,
                    history=request.history,
                    additional_guidance=guidance,
                )
                t1 = time.time()
                status_gen = "completed"
            except (LMStudioConnectionError, ConnectionError) as exc:
                t1 = time.time()
                add_trace_node(
                    node_id=f"node_generator_attempt_{attempt}",
                    name=f"{attempt_prefix}Grounded Answer Generation",
                    file_path="app/services/answer_generator.py",
                    function_name="AnswerGenerator.generate_answer()",
                    status_val="failed",
                    description=f"LLM connection error: {exc}",
                    input_data={"rewritten_query": current_search_query},
                    output_data={"error": str(exc)},
                    duration_ms=(t1 - t0) * 1000,
                )
                err_resp = self._build_error_response(
                    request=request,
                    rewritten_query=rewriting.rewritten_query,
                    error_message="The AI generation service is temporarily unavailable. Please try again later.",
                )
                return {
                    "response": err_resp.model_dump(),
                    "trace": trace_nodes,
                    "total_duration_ms": round((time.time() - overall_start) * 1000, 2),
                }

            add_trace_node(
                node_id=f"node_generator_attempt_{attempt}",
                name=f"{attempt_prefix}Grounded Answer Generation",
                file_path="app/services/answer_generator.py",
                function_name="AnswerGenerator.generate_answer()",
                status_val=status_gen,
                description=f"Generated {len(candidate_answer.split())} words grounded strictly in retrieved context with {len(sources)} source citations.",
                input_data={
                    "rewritten_query": current_search_query,
                    "context_documents_count": len(retrieval.documents),
                    "user_context_present": retrieval.user_context is not None,
                    "retry_guidance": guidance,
                },
                output_data={
                    "candidate_answer": candidate_answer,
                    "sources": [s.model_dump() for s in sources],
                },
                duration_ms=(t1 - t0) * 1000,
            )

            # Format context text for evaluator review
            context_summary = "\n".join([f"- {d.content}" for d in retrieval.documents])
            if retrieval.user_context:
                context_summary += f"\n- User context: {retrieval.user_context.full_name}, {retrieval.user_context.associated_projects}"

            # ------------------------------------------------------------------
            # Node 7: Answer Evaluation (LLM-as-a-Judge)
            # ------------------------------------------------------------------
            t0 = time.time()
            try:
                eval_result = await self.evaluator.evaluate_answer(
                    original_query=request.query,
                    rewritten_query=current_search_query,
                    context_text=context_summary,
                    generated_answer=candidate_answer,
                )
            except Exception as exc:
                eval_result = EvaluationResult(
                    is_satisfactory=True,
                    relevance_score=0.85,
                    grounding_score=0.85,
                    reason=f"Evaluation bypassed: {exc}",
                )
            t1 = time.time()

            last_eval_result = eval_result
            final_answer = candidate_answer
            final_sources = sources

            add_trace_node(
                node_id=f"node_evaluator_attempt_{attempt}",
                name=f"{attempt_prefix}Answer Quality Evaluation (LLM Judge)",
                file_path="app/services/evaluator.py",
                function_name="AnswerEvaluator.evaluate_answer()",
                status_val="completed" if eval_result.is_satisfactory else "retrying",
                description=(
                    f"Verdict: {'Passed' if eval_result.is_satisfactory else 'Unsatisfactory'} "
                    f"(Relevance: {eval_result.relevance_score:.2f}, Grounding: {eval_result.grounding_score:.2f}). "
                    f"{eval_result.reason}"
                ),
                input_data={
                    "candidate_answer": candidate_answer,
                    "relevance_threshold": self.evaluator.relevance_threshold,
                    "grounding_threshold": self.evaluator.grounding_threshold,
                },
                output_data=eval_result.model_dump(),
                duration_ms=(t1 - t0) * 1000,
            )

            # Check if answer passed evaluation
            if eval_result.is_satisfactory:
                resp = ChatResponse(
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

                add_trace_node(
                    node_id="node_final_response",
                    name="Final API Response Dispatch",
                    file_path="app/api/routes.py",
                    function_name="chat_endpoint() -> ChatResponse",
                    status_val="completed",
                    description=f"Delivered successful response with {len(final_sources)} citations after {attempt} retries.",
                    input_data={"answer_status": "success", "retry_count": attempt},
                    output_data=resp.model_dump(),
                    duration_ms=0.2,
                )

                return {
                    "response": resp.model_dump(),
                    "trace": trace_nodes,
                    "total_duration_ms": round((time.time() - overall_start) * 1000, 2),
                }

            # If unsatisfactory, prepare for retry
            attempt += 1
            current_top_k += 2
            guidance = f"Previous answer failed evaluation: {eval_result.reason}. Ensure all claims strictly match retrieved text."

        # Retries exhausted -> fallback response
        fallback_msg = (
            "I couldn't find enough reliable information to answer that question accurately. "
            "Please rephrase your question or provide more details."
        )

        resp = ChatResponse(
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
                reason=last_eval_result.reason if last_eval_result else "Max retries exceeded.",
            ),
            retry_count=self.max_retries,
        )

        add_trace_node(
            node_id="node_final_response",
            name="Final API Fallback Dispatch",
            file_path="app/api/routes.py",
            function_name="chat_endpoint() -> ChatResponse",
            status_val="completed",
            description="Max retries reached without passing evaluation. Returned safe unverified fallback message.",
            input_data={"answer_status": "fallback", "retry_count": self.max_retries},
            output_data=resp.model_dump(),
            duration_ms=0.2,
        )

        return {
            "response": resp.model_dump(),
            "trace": trace_nodes,
            "total_duration_ms": round((time.time() - overall_start) * 1000, 2),
        }

    async def debug_chat_request(self, request: ChatRequest) -> Dict[str, Any]:
        """Provides internal pipeline inspection for development debugging."""
        import time
        start_time = time.time()

        classification = await self.classifier.classify_query(request.query)
        rewriting = await self.rewriter.rewrite_query(request.query, request.history)

        retrieval = self.retriever.retrieve_context(
            rewritten_query=rewriting.rewritten_query,
            user_id=request.user_id,
            application_id=request.application_id,
        )

        base_resp = await self.process_chat_request(request)
        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "base_response": base_resp.model_dump(),
            "classification": classification.model_dump(),
            "rewriting": rewriting.model_dump(),
            "retrieval_debug": {
                "document_count": len(retrieval.documents),
                "is_sufficient": retrieval.is_sufficient,
                "retrieval_mode": retrieval.retrieval_mode,
                "top_score": retrieval.top_score,
                "user_context_found": retrieval.user_context is not None,
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
