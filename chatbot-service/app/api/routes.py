"""API route definitions for the Chatbot backend service."""

from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import settings
from app.schemas.request import ChatRequest
from app.schemas.response import (
    ChatDebugResponse,
    ChatResponse,
    HealthResponse,
    InfoResponse,
)
from app.services.chatbot import ChatbotService
from app.providers.llm_base import BaseLLMProvider
from app.providers.mock_llm import MockLLMProvider
from app.providers.lm_studio import LMStudioProvider
from app.utils.logging import logger


api_router = APIRouter()


# ------------------------------------------------------------------------------
# Dependency Injection
# ------------------------------------------------------------------------------

def get_llm_provider() -> BaseLLMProvider:
    """Dependency provider yielding the configured LLM implementation."""
    provider_type = settings.LLM_PROVIDER.lower().strip()
    if provider_type == "lm_studio":
        return LMStudioProvider()
    return MockLLMProvider()


def get_chatbot_service(
    llm_provider: BaseLLMProvider = Depends(get_llm_provider),
) -> ChatbotService:
    """Dependency provider yielding an initialized ChatbotService instance."""
    return ChatbotService(llm_provider=llm_provider)


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------

@api_router.post(
    "/api/v1/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit query to intelligent chatbot",
    description="Processes query through classification, rewriting, RAG retrieval, LLM generation, and evaluation.",
)
async def chat_endpoint(
    request: ChatRequest,
    service: ChatbotService = Depends(get_chatbot_service),
) -> ChatResponse:
    """Handles chat request and returns structured response."""
    try:
        response = await service.process_chat_request(request)
        return response
    except Exception as exc:
        logger.exception("Unhandled error processing chat request: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred while processing the request.",
        )


@api_router.post(
    "/api/v1/chat/trace",
    status_code=status.HTTP_200_OK,
    summary="Interactive live data flow trace",
    description="Processes query and returns both the final chat response and a complete node-by-node execution trace for visual flowcharts.",
)
async def chat_trace_endpoint(
    request: ChatRequest,
    service: ChatbotService = Depends(get_chatbot_service),
):
    """Returns final response along with full node inputs, outputs, files, and functions."""
    try:
        trace_data = await service.process_chat_request_with_trace(request)
        return trace_data
    except Exception as exc:
        logger.exception("Error in trace endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@api_router.get(
    "/api/v1/data/dummy",
    status_code=status.HTTP_200_OK,
    summary="Inspect dummy data sources",
    description="Returns raw dummy knowledge base documents and user context records for UI developer inspection.",
)
async def get_dummy_data():
    """Returns knowledge base documents and user context records."""
    import json
    kb = []
    uc = {}
    if settings.KNOWLEDGE_BASE_PATH.exists():
        with open(settings.KNOWLEDGE_BASE_PATH, "r", encoding="utf-8") as f:
            kb = json.load(f)
    if settings.USER_CONTEXT_PATH.exists():
        with open(settings.USER_CONTEXT_PATH, "r", encoding="utf-8") as f:
            uc = json.load(f)
    return {
        "knowledge_base": kb,
        "user_context": uc,
        "summary": {
            "knowledge_base_documents_count": len(kb),
            "users_count": len(uc),
        },
    }


@api_router.post(
    "/api/v1/chat/debug",
    status_code=status.HTTP_200_OK,
    summary="Development debug chat pipeline",
    description="Returns detailed intermediate pipeline stages. Only available in non-production environments.",
)
async def chat_debug_endpoint(
    request: ChatRequest,
    service: ChatbotService = Depends(get_chatbot_service),
):
    """Returns granular debug logs for classification, retrieval, and evaluation."""
    if settings.APP_ENV.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debug endpoint is disabled in production.",
        )

    try:
        debug_info = await service.debug_chat_request(request)
        return debug_info
    except Exception as exc:
        logger.exception("Error in debug endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@api_router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service health check",
)
async def health_check() -> HealthResponse:
    """Returns the service operational status."""
    return HealthResponse(
        status="healthy",
        service="quickai-chatbot-backend",
        version="1.0.0",
    )


@api_router.get(
    "/api/v1/info",
    response_model=InfoResponse,
    status_code=status.HTTP_200_OK,
    summary="Service configuration info",
)
async def service_info() -> InfoResponse:
    """Returns public service metadata and configured provider mode."""
    return InfoResponse(
        service_name="Quick.AI Intelligent Support Assistant",
        version="1.0.0",
        supported_application_id=settings.SUPPORTED_APPLICATION_ID,
        llm_provider=settings.LLM_PROVIDER,
        max_retries=settings.MAX_RETRIES,
        retrieval_top_k=settings.RETRIEVAL_TOP_K,
    )
