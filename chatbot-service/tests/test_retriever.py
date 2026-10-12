"""Unit tests for the RAG Context Retrieval module in Quick.AI."""

import pytest
from app.services.retriever import ContextRetriever, MockEmbeddingModel


@pytest.fixture
def retriever():
    return ContextRetriever()


def test_retriever_indexing(retriever: ContextRetriever):
    """Verifies that Quick.AI knowledge documents are successfully indexed in memory."""
    assert len(retriever._raw_kb_data) >= 10
    assert retriever.vector_store.embeddings is not None


def test_retrieve_relevant_application_documents(retriever: ContextRetriever):
    """Verifies retrieval of relevant documentation for AI tools."""
    result = retriever.retrieve_context(
        rewritten_query="How does the AI Article Writer work in Quick.AI?",
        user_id="user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        application_id="quickai",
        top_k=3,
    )

    assert len(result.documents) > 0
    assert len(result.documents) <= 3
    assert result.documents[0].similarity_score > 0.0
    content_blob = " ".join([d.content for d in result.documents])
    assert "article" in content_blob.lower() or "gemini" in content_blob.lower()


def test_retrieve_user_specific_context_filtering(retriever: ContextRetriever):
    """Verifies that authorized user data for Alex Johnson is retrieved when query is user-relevant."""
    result = retriever.retrieve_context(
        rewritten_query="What is my current plan and remaining free usage quota?",
        user_id="user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        application_id="quickai",
    )

    assert result.user_context is not None
    assert result.user_context.user_id == "user_2yMX02PRbyMtQK6PebpjnxvRNIA"
    assert result.user_context.full_name == "Alex Johnson"
    assert result.user_context.plan == "free"
    assert result.user_context.free_usage == 3
    assert result.user_context.remaining_free_usage == 2
    assert len(result.user_context.recent_creations) >= 3


def test_retrieve_dynamic_user_info_json(retriever: ContextRetriever):
    """Verifies that dynamic user info passed in JSON format is prioritized and retrieved."""
    dynamic_info = {
        "user_id": "custom_user_99",
        "application_id": "quickai",
        "full_name": "Taylor Swift",
        "plan": "premium",
        "free_usage": 0,
        "max_free_usage": "unlimited",
        "remaining_free_usage": "unlimited",
        "total_creations": 42,
        "recent_creations": [
            {"id": 101, "type": "image", "prompt": "Neon concert stage", "publish": True}
        ],
    }

    result = retriever.retrieve_context(
        rewritten_query="What is my account plan and creations?",
        user_id="custom_user_99",
        application_id="quickai",
        dynamic_user_info=dynamic_info,
    )

    assert result.user_context is not None
    assert result.user_context.user_id == "custom_user_99"
    assert result.user_context.full_name == "Taylor Swift"
    assert result.user_context.plan == "premium"
    assert result.user_context.total_creations == 42


def test_prevention_of_unauthorized_user_access(retriever: ContextRetriever):
    """Verifies that an unknown user or mismatched application receives NO user context."""
    # Unknown user
    result_unknown = retriever.retrieve_context(
        rewritten_query="Show my account creations and usage",
        user_id="unknown_attacker_999",
        application_id="quickai",
    )
    assert result_unknown.user_context is None

    # Mismatched application ID
    result_mismatched = retriever.retrieve_context(
        rewritten_query="Show my account creations and usage",
        user_id="user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        application_id="other_random_app",
    )
    assert result_mismatched.user_context is None


def test_retrieve_historical_changes(retriever: ContextRetriever):
    """Verifies retrieval of historical change log records."""
    result = retriever.retrieve_context(
        rewritten_query="What career tools updates and release changes were introduced recently?",
        user_id="user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        application_id="quickai",
        top_k=5,
    )

    change_sources = [d.source for d in result.documents if d.source == "application_change_log"]
    assert len(change_sources) > 0


def test_top_k_parameter_enforcement(retriever: ContextRetriever):
    """Verifies that retriever respects custom top_k values."""
    for k in (1, 2, 4):
        result = retriever.retrieve_context(
            rewritten_query="Quick.AI features",
            user_id="user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            application_id="quickai",
            top_k=k,
        )
        assert len(result.documents) <= k
