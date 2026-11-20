"""Pydantic response schemas for the Chatbot API endpoints."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SourceItem(BaseModel):
    """Citation or reference source supporting the generated answer."""

    document_id: str = Field(..., description="Unique ID of the cited document or record")
    source: str = Field(..., description="Origin of the context (e.g. 'application_documentation', 'application_change_log', 'user_context')")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Optional metadata or tags")


class EvaluationSummary(BaseModel):
    """Structured evaluation metrics of the generated answer."""

    is_satisfactory: bool = Field(..., description="True if answer satisfies relevance and grounding thresholds")
    relevance_score: float = Field(..., description="Relevance score (0.0 to 1.0) indicating query coverage")
    grounding_score: float = Field(..., description="Grounding score (0.0 to 1.0) indicating factual alignment with context")
    reason: Optional[str] = Field(default=None, description="Summary rationale for evaluation result")


class ChatResponse(BaseModel):
    """Standard API response for the chatbot service."""

    request_id: str = Field(..., description="Echoed request identifier")
    conversation_id: Optional[str] = Field(default=None, description="Echoed conversation thread ID")
    status: str = Field(
        ...,
        description="Response status: 'success', 'rejected', 'insufficient_context', 'fallback', or 'error'",
        examples=["success", "rejected"],
    )
    original_query: str = Field(..., description="Original user query as submitted")
    rewritten_query: Optional[str] = Field(default=None, description="Rewritten standalone search query")
    answer: str = Field(..., description="Final answer or polite rejection message")
    sources: List[SourceItem] = Field(default_factory=list, description="Citations supporting the answer")
    evaluation: Optional[EvaluationSummary] = Field(default=None, description="Quality evaluation metrics if performed")
    retry_count: int = Field(default=0, description="Number of recovery retries attempted")


class ChatDebugResponse(BaseModel):
    """Detailed pipeline inspection response for development debugging."""

    base_response: ChatResponse
    classification: Dict[str, Any]
    retrieval_debug: Dict[str, Any]
    evaluation_debug: Optional[Dict[str, Any]] = None
    execution_time_ms: float


class HealthResponse(BaseModel):
    """Service health status response."""

    status: str = "healthy"
    service: str = "quickai-chatbot-backend"
    version: str = "1.0.0"


class InfoResponse(BaseModel):
    """Service metadata and configuration info."""

    service_name: str = "Quick.AI Intelligent Support Assistant"
    version: str = "1.0.0"
    supported_application_id: str
    llm_provider: str
    max_retries: int
    retrieval_top_k: int
