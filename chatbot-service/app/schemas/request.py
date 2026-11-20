"""Pydantic request schemas and input validation for the Chatbot API."""

import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    """Represents a prior conversation turn."""

    role: str = Field(..., description="Role of the sender: 'user' or 'assistant'")
    content: str = Field(..., description="Message text content")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        role = value.strip().lower()
        if role not in ("user", "assistant"):
            raise ValueError("Role must be 'user' or 'assistant'")
        return role

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message content cannot be empty")
        return trimmed


class ChatRequest(BaseModel):
    """Incoming chat request payload.

    NOTE ON SECURITY:
    In production environments, `user_id` MUST NEVER be blindly trusted from the request body.
    User identity should be extracted or verified via signed authentication tokens (e.g., JWT).
    """

    request_id: str = Field(
        default_factory=lambda: f"req_{uuid.uuid4().hex[:8]}",
        min_length=1,
        max_length=100,
        description="Unique identifier for tracking the request",
        examples=["req_1001"],
    )
    user_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Identifier of the user requesting context",
        examples=["user_2yMX02PRbyMtQK6PebpjnxvRNIA"],
    )
    application_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Target application identifier (e.g., 'quickai')",
        examples=["quickai"],
    )
    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User's natural language question",
        examples=["What are the features of Quick.AI?"],
    )
    conversation_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional conversation thread ID for session tracking",
        examples=["conv_1001"],
    )
    history: Optional[List[ChatMessage]] = Field(
        default=None,
        description="Optional previous chat history turns for conversational context",
    )
    user_info: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional user information payload provided directly in JSON format (plan, free_usage, creations, etc.)",
    )

    @field_validator("request_id", "user_id", "application_id")
    @classmethod
    def validate_identifiers(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Identifier field cannot be blank or contain only whitespace")
        return trimmed

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Query cannot be empty or contain only whitespace")
        return trimmed
