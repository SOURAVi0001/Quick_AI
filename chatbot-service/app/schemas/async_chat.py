"""Pydantic schemas for asynchronous chat submission, status, and result retrieval."""

import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.request import ChatMessage
from app.schemas.response import ChatResponse, EvaluationSummary, SourceItem


class ChatSubmitRequest(BaseModel):
    """Payload submitted to asynchronously accept a chat request into the durable ledger."""

    request_id: str = Field(
        default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}",
        min_length=1,
        max_length=100,
        description="Unique request tracking identifier",
    )
    idempotency_key: str = Field(
        ...,
        min_length=1,
        max_length=150,
        description="Client-provided idempotency key scoped to user_id",
    )
    user_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Authenticated user identity",
    )
    conversation_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Conversation thread identifier",
    )
    application_id: str = Field(
        default="quickai",
        min_length=1,
        max_length=50,
        description="Target application identifier",
    )
    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User natural language question",
    )
    history: Optional[List[ChatMessage]] = Field(
        default=None,
        description="Optional recent chat conversation history turns",
    )
    user_info: Optional[Dict[str, Any]] = Field(
        default=None,
        description="User metadata (e.g. plan, quota limits)",
    )

    @field_validator("idempotency_key", "user_id", "conversation_id", "application_id")
    @classmethod
    def validate_non_blank_strings(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Field cannot be blank or contain only whitespace.")
        return trimmed

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Query cannot be empty or contain only whitespace.")
        return trimmed


class ChatSubmitResponse(BaseModel):
    """Immediate response confirming durable request acceptance."""

    request_id: str = Field(..., description="Durable request identifier")
    conversation_id: str = Field(..., description="Conversation thread identifier")
    status: str = Field(
        ...,
        description="Current request status: 'queued', 'processing', or 'completed'",
    )
    is_duplicate: bool = Field(
        default=False,
        description="True if request was recognized as a duplicate submission",
    )
    message: str = Field(..., description="Status summary message")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")
    result: Optional[ChatResponse] = Field(
        default=None,
        description="Cached final response if duplicate was already completed",
    )


class ChatStatusResponse(BaseModel):
    """Current processing state of an asynchronous chat request."""

    request_id: str
    conversation_id: str
    status: str
    current_node: Optional[str] = None
    retry_count: int = 0
    error_category: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class ChatResultResponse(BaseModel):
    """Terminal result of an asynchronous chat request."""

    request_id: str
    conversation_id: str
    status: str
    original_query: str
    answer: Optional[str] = None
    sources: List[SourceItem] = Field(default_factory=list)
    evaluation: Optional[EvaluationSummary] = None
    retry_count: int = 0
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None