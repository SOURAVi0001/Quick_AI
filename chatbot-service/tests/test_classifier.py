"""Unit tests for Query Classification module in Quick.AI."""

import pytest
from app.providers.mock_llm import MockLLMProvider
from app.services.classifier import QueryClassifier, ClassificationResult


@pytest.fixture
def classifier():
    provider = MockLLMProvider()
    return QueryClassifier(llm_provider=provider)


@pytest.mark.asyncio
async def test_classify_valid_application_features_query(classifier: QueryClassifier):
    """Verifies that an application features query is classified as relevant."""
    query = "What features does Quick.AI provide?"
    result: ClassificationResult = await classifier.classify_query(query)

    assert result.is_relevant is True
    assert result.category == "application_help"
    assert result.confidence >= 0.7


@pytest.mark.asyncio
async def test_classify_server_and_code_query_rejected(classifier: QueryClassifier):
    """Verifies that queries about server, backend code, or database migrations are strictly rejected as out_of_scope."""
    query = "What changes and database migrations were made to the backend server?"
    result = await classifier.classify_query(query)

    assert result.is_relevant is False
    assert result.category == "out_of_scope"


@pytest.mark.asyncio
async def test_classify_account_quota_query(classifier: QueryClassifier):
    """Verifies that an account quota or status query is categorized under project_status."""
    query = "What is my current plan and remaining free usage quota?"
    result = await classifier.classify_query(query)

    assert result.is_relevant is True
    assert result.category == "project_status"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "irrelevant_query",
    [
        "Who won the cricket match yesterday?",
        "Write a romantic poem.",
        "What is the capital of France?",
        "Tell me a joke unrelated to Quick.AI.",
    ],
)
async def test_classify_irrelevant_queries_rejected(
    classifier: QueryClassifier, irrelevant_query: str
):
    """Verifies that clearly out-of-scope queries are marked is_relevant=False and out_of_scope."""
    result = await classifier.classify_query(irrelevant_query)

    assert result.is_relevant is False
    assert result.category == "out_of_scope"
    assert "outside" in result.reason.lower() or "general knowledge" in result.reason.lower()


def test_rule_based_fallback_directly(classifier: QueryClassifier):
    """Verifies the deterministic rule-based fallback without LLM inference."""
    # Irrelevant
    out_of_scope = classifier._rule_based_fallback("Tell me a funny cricket joke")
    assert out_of_scope.is_relevant is False
    assert out_of_scope.category == "out_of_scope"

    # Relevant career tools
    career_help = classifier._rule_based_fallback("Tell me about the Resume Reviewer and Smart Email Writer")
    assert career_help.is_relevant is True
    assert career_help.category == "application_help"

    # Relevant plan & creations status
    plan = classifier._rule_based_fallback("Show my creations and remaining quota")
    assert plan.is_relevant is True
    assert plan.category == "project_status"
