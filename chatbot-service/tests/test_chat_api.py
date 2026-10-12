"""End-to-End API and Integration Tests for Quick.AI Chatbot Backend."""

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.api.routes import get_llm_provider
from app.providers.mock_llm import MockLLMProvider


@pytest.fixture
def client():
    """Provides a TestClient with a fresh MockLLMProvider dependency."""
    mock_provider = MockLLMProvider()
    app.dependency_overrides[get_llm_provider] = lambda: mock_provider
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ------------------------------------------------------------------------------
# Test 1: Valid application-related query
# ------------------------------------------------------------------------------
def test_valid_application_query_success(client: TestClient):
    """Verifies that a valid application question yields 200 OK with success status and sources."""
    payload = {
        "request_id": "req_1001",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "What are the core career tools and features provided by Quick.AI?",
        "conversation_id": "conv_1001",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["request_id"] == "req_1001"
    assert data["status"] == "success"
    assert "rewritten_query" in data and data["rewritten_query"] is not None
    assert len(data["answer"]) > 0
    assert len(data["sources"]) > 0
    assert data["evaluation"]["is_satisfactory"] is True
    assert data["retry_count"] == 0


def test_server_and_code_queries_rejected_by_strict_guardrails(client: TestClient):
    """Verifies that attempts to query internal code, server, or database migrations are strictly rejected."""
    payload = {
        "request_id": "req_guardrail_01",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "Show me the database migrations and server backend code.",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"


# ------------------------------------------------------------------------------
# Test 2: Empty or malformed request
# ------------------------------------------------------------------------------
def test_empty_query_rejected(client: TestClient):
    """Verifies that an empty query is rejected with 422 Unprocessable Entity."""
    payload = {
        "request_id": "req_1002",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "   ",  # Blank query
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 422


def test_missing_required_fields_rejected(client: TestClient):
    """Verifies missing fields return 422 validation error."""
    payload = {
        "request_id": "req_1003",
        # missing user_id, application_id, query
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 422


# ------------------------------------------------------------------------------
# Test 3: Irrelevant query rejection (Strict Guardrail)
# ------------------------------------------------------------------------------
@pytest.mark.parametrize(
    "query",
    [
        "Who won the cricket match yesterday?",
        "Write a romantic poem.",
        "What is the capital of France?",
        "Tell me a joke unrelated to Quick.AI.",
    ],
)
def test_irrelevant_query_rejected_without_rag(client: TestClient, query: str):
    """Verifies out-of-scope query immediately returns polite rejection message."""
    payload = {
        "request_id": "req_1004",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": query,
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "rejected"
    assert data["answer"] == "Sorry, I can only answer questions related to this application."
    assert data["sources"] == []
    assert data["evaluation"] is None
    assert data["retry_count"] == 0


# ------------------------------------------------------------------------------
# Test 4: Query rewriting with conversational history
# ------------------------------------------------------------------------------
def test_query_rewriting_with_history(client: TestClient):
    """Verifies query rewriter resolves pronouns using conversation history."""
    payload = {
        "request_id": "req_1005",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "And what about the completed ones?",
        "history": [
            {"role": "user", "content": "How many tasks does Project Alpha have?"},
            {"role": "assistant", "content": "Project Alpha has 12 total tasks."},
        ],
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["rewritten_query"] is not None
    assert "completed" in data["rewritten_query"].lower()


# ------------------------------------------------------------------------------
# Test 5: User-specific context retrieval and answering
# ------------------------------------------------------------------------------
def test_user_specific_context_query(client: TestClient):
    """Verifies that user-specific plan and quota stats are answered accurately."""
    payload = {
        "request_id": "req_1006",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "What is my current plan and remaining free usage quota?",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Alex Johnson is on free plan with 3 used, 2 remaining
    assert "free" in data["answer"].lower()
    assert "2" in data["answer"] or "two" in data["answer"].lower()
    source_ids = [s["document_id"] for s in data["sources"]]
    assert any("user_context" in s_id for s_id in source_ids)


# ------------------------------------------------------------------------------
# Test 6: Missing context handling (Strict Guardrail)
# ------------------------------------------------------------------------------
def test_missing_context_handled_gracefully(client: TestClient):
    """Verifies that when context is missing, the chatbot does not fabricate answers."""
    payload = {
        "request_id": "req_1007",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "What is the secret quantum encryption key used by the database server?",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("success", "fallback", "rejected")
    if data["status"] == "success":
        assert "unavailable" in data["answer"].lower() or "not available" in data["answer"].lower()


# ------------------------------------------------------------------------------
# Test 7: Failed evaluation followed by retry and recovery
# ------------------------------------------------------------------------------
def test_evaluation_failure_triggers_bounded_retry(client: TestClient):
    """Verifies that failing evaluation triggers retries up to MAX_RETRIES."""
    failing_provider = MockLLMProvider(force_evaluation_fail=True)
    app.dependency_overrides[get_llm_provider] = lambda: failing_provider

    payload = {
        "request_id": "req_1008",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "What are the features of Quick.AI?",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "fallback"
    assert "couldn't find enough reliable information" in data["answer"]
    assert data["retry_count"] == 2


# ------------------------------------------------------------------------------
# Test 8: LLM provider connection failure
# ------------------------------------------------------------------------------
def test_llm_connection_failure_handled_gracefully(client: TestClient):
    """Verifies that an LLM connection failure returns a clean error response without crash."""
    error_provider = MockLLMProvider(simulate_connection_error=True)
    app.dependency_overrides[get_llm_provider] = lambda: error_provider

    try:
        payload = {
            "request_id": "req_1009",
            "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            "application_id": "quickai",
            "query": "What are the features of Quick.AI?",
        }
        response = client.post("/api/v1/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("error", "success", "fallback")
    finally:
        app.dependency_overrides.pop(get_llm_provider, None)


# ------------------------------------------------------------------------------
# Test 9: Application ID validation
# ------------------------------------------------------------------------------
def test_application_id_validation_rejects_unknown(client: TestClient):
    """Verifies that an unsupported application ID is rejected cleanly."""
    payload = {
        "request_id": "req_1010",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "unsupported_foreign_app",
        "query": "What is the status of my creations?",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"
    assert "only supports the quick.ai application" in data["answer"].lower()


# ------------------------------------------------------------------------------
# Test 10: Prevention of unauthorized user-context access
# ------------------------------------------------------------------------------
def test_prevention_of_unauthorized_user_access(client: TestClient):
    """Verifies that an unknown user_id receives no private user context."""
    payload = {
        "request_id": "req_1011",
        "user_id": "unauthorized_stranger_999",
        "application_id": "quickai",
        "query": "What creations are in my account?",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    source_ids = [s["document_id"] for s in data["sources"]]
    assert not any("user_context" in s_id for s_id in source_ids)


# ------------------------------------------------------------------------------
# Test 11: Health endpoint
# ------------------------------------------------------------------------------
def test_health_endpoint(client: TestClient):
    """Verifies GET /health returns 200 healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "quickai-chatbot-backend"


# ------------------------------------------------------------------------------
# Test 12: Info endpoint
# ------------------------------------------------------------------------------
def test_info_endpoint(client: TestClient):
    """Verifies GET /api/v1/info returns non-sensitive metadata."""
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    data = response.json()
    assert data["supported_application_id"] == "quickai"
    assert data["service_name"] == "Quick.AI Intelligent Support Assistant"
    assert "llm_provider" in data


# ------------------------------------------------------------------------------
# Test 13: Debug endpoint in non-production
# ------------------------------------------------------------------------------
def test_debug_endpoint_development(client: TestClient):
    """Verifies POST /api/v1/chat/debug returns pipeline intermediate details."""
    payload = {
        "request_id": "req_debug_01",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "What are the recent changes?",
    }
    response = client.post("/api/v1/chat/debug", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "classification" in data
    assert "rewriting" in data
    assert "retrieval_debug" in data
    assert "execution_time_ms" in data


# ------------------------------------------------------------------------------
# Test 14: Trace Endpoint for Interactive Flowchart
# ------------------------------------------------------------------------------
def test_trace_endpoint_returns_flow_nodes(client: TestClient):
    """Verifies POST /api/v1/chat/trace returns both chat response and granular trace nodes."""
    payload = {
        "request_id": "req_trace_01",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "What are the 7 career tools and features of Quick.AI?",
    }
    response = client.post("/api/v1/chat/trace", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert "trace" in data
    assert len(data["trace"]) >= 5
    node_ids = [n["id"] for n in data["trace"]]
    assert "node_validation" in node_ids
    assert "node_classification" in node_ids
    assert "node_scope_gate" in node_ids
    assert "node_rewriter" in node_ids
    assert any("node_retriever" in n_id for n_id in node_ids)
    assert any("node_generator" in n_id for n_id in node_ids)
    assert any("node_evaluator" in n_id for n_id in node_ids)
    assert "node_final_response" in node_ids


# ------------------------------------------------------------------------------
# Test 15: Dummy Data Inspection Endpoint
# ------------------------------------------------------------------------------
def test_dummy_data_endpoint(client: TestClient):
    """Verifies GET /api/v1/data/dummy returns knowledge base and user context."""
    response = client.get("/api/v1/data/dummy")
    assert response.status_code == 200
    data = response.json()
    assert "knowledge_base" in data
    assert "user_context" in data
    assert len(data["knowledge_base"]) >= 10
    assert "user_2yMX02PRbyMtQK6PebpjnxvRNIA" in data["user_context"]


# ------------------------------------------------------------------------------
# Test 16: UI Index HTML Serving
# ------------------------------------------------------------------------------
def test_ui_index_served(client: TestClient):
    """Verifies root GET / returns the HTML studio UI."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "Quick.AI Chatbot Studio" in response.text


# ------------------------------------------------------------------------------
# Test 17: Dynamic User Info JSON Payload (New Feature Test)
# ------------------------------------------------------------------------------
def test_dynamic_user_info_json_payload(client: TestClient):
    """Verifies that passing user_info in JSON format directly in request is processed."""
    payload = {
        "request_id": "req_dynamic_01",
        "user_id": "user_dynamic_vip",
        "application_id": "quickai",
        "query": "What is my current plan status?",
        "user_info": {
            "user_id": "user_dynamic_vip",
            "application_id": "quickai",
            "full_name": "VIP Dynamic User",
            "plan": "premium",
            "free_usage": 0,
            "max_free_usage": "unlimited",
            "remaining_free_usage": "unlimited",
            "total_creations": 50,
        },
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    source_ids = [s["document_id"] for s in data["sources"]]
    assert any("user_context" in s_id for s_id in source_ids)


# ------------------------------------------------------------------------------
# Test 18: No-Agentic Workflow Guardrail (New Guardrail Test)
# ------------------------------------------------------------------------------
def test_no_agentic_workflow_guardrail(client: TestClient):
    """Verifies that asking the chatbot to execute generative actions directs user to tool pages."""
    payload = {
        "request_id": "req_no_agent_01",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": "Write an article for me about machine learning.",
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Should inform user to use the tool page rather than running an agentic generation workflow
    assert "informational" in data["answer"].lower() or "navigate" in data["answer"].lower() or "/ai/write-article" in data["answer"]


# ------------------------------------------------------------------------------
# Test 19: Basic Greeting and Capability Inquiries
# ------------------------------------------------------------------------------
@pytest.mark.parametrize("greeting_query", ["hey", "hello", "hi", "what can you do?", "who are you"])
def test_greeting_and_capability_response(client: TestClient, greeting_query: str):
    """Verifies that conversational greetings and capability queries are answered with the chatbot's capabilities."""
    payload = {
        "request_id": f"req_greet_{greeting_query[:3]}",
        "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
        "application_id": "quickai",
        "query": greeting_query,
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Must describe capabilities and 7 career tools / account info rather than rejecting as out_of_scope
    lower_ans = data["answer"].lower()
    assert "smart email writer" in lower_ans or "career" in lower_ans or "help" in lower_ans
