"""Demonstration script showcasing core scenarios of the Quick.AI Chatbot Service.

Scenarios tested:
1. Relevant application query (Recent DB migrations & features)
2. Strict Guardrail: Irrelevant query rejected politely without RAG
3. User-specific authorized context (Alex Johnson's plan, quota, and creations)
4. Dynamic User Info JSON payload (Providing user info directly in JSON format)
5. Strict Guardrail: No Agentic Workflow (Directs user to tool page instead of executing generation)
6. Strict Guardrail: Missing context / unknown info
7. Conversational query with message history

Usage:
    Ensure backend server is running:
        .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
    Then run:
        .venv/bin/python run_demo.py
"""

import json
import time
import httpx

BASE_URL = "http://127.0.0.1:8000"
CHAT_ENDPOINT = f"{BASE_URL}/api/v1/chat"


def print_banner(title: str):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def send_chat_request(scenario_name: str, payload: dict):
    print_banner(scenario_name)
    print(f"Request Payload:\n{json.dumps(payload, indent=2)}")

    try:
        start = time.time()
        response = httpx.post(CHAT_ENDPOINT, json=payload, timeout=30.0)
        elapsed = round((time.time() - start) * 1000, 2)

        print(f"\nResponse [Status Code: {response.status_code}] (Latency: {elapsed}ms):")
        print(json.dumps(response.json(), indent=2))
    except Exception as exc:
        print(f"\n[ERROR] Failed to reach chatbot endpoint: {exc}")
        print("Please ensure the service is running (e.g. uvicorn app.main:app --port 8000)")


def main():
    print("Testing Quick.AI Grounded Chatbot Backend Service with Strict Guardrails...")

    # 1. Relevant application query
    send_chat_request(
        scenario_name="Scenario 1: Relevant Application Query (Recent DB Migrations & Changes)",
        payload={
            "request_id": "req_demo_01",
            "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            "application_id": "quickai",
            "query": "What database migrations and recent changes were made to Quick.AI?",
            "conversation_id": "conv_demo_01",
        },
    )

    # 2. Irrelevant query rejected immediately (Strict Scope Guardrail)
    send_chat_request(
        scenario_name="Scenario 2: Out-of-Scope Query (Strict Guardrail Rejection)",
        payload={
            "request_id": "req_demo_02",
            "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            "application_id": "quickai",
            "query": "Who won the cricket match yesterday and what is the weather in Paris?",
            "conversation_id": "conv_demo_02",
        },
    )

    # 3. User-specific authorized context
    send_chat_request(
        scenario_name="Scenario 3: User-Specific Account Quota & Plan Status",
        payload={
            "request_id": "req_demo_03",
            "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            "application_id": "quickai",
            "query": "What is my current plan and how many free generations do I have remaining?",
            "conversation_id": "conv_demo_03",
        },
    )

    # 4. Dynamic User Info JSON Format
    send_chat_request(
        scenario_name="Scenario 4: Dynamic User Info Provided in JSON Format",
        payload={
            "request_id": "req_demo_04",
            "user_id": "user_vip_007",
            "application_id": "quickai",
            "query": "Can you check my account plan and remaining usage from my profile data?",
            "conversation_id": "conv_demo_04",
            "user_info": {
                "user_id": "user_vip_007",
                "application_id": "quickai",
                "full_name": "VIP Enterprise User",
                "plan": "premium",
                "free_usage": 0,
                "max_free_usage": "unlimited",
                "remaining_free_usage": "unlimited",
                "total_creations": 99,
            },
        },
    )

    # 5. Strict Guardrail: No Agentic Workflow
    send_chat_request(
        scenario_name="Scenario 5: No-Agentic Workflow Guardrail (Instructs tool navigation)",
        payload={
            "request_id": "req_demo_05",
            "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            "application_id": "quickai",
            "query": "Write a 500-word article about machine learning for me right now.",
            "conversation_id": "conv_demo_05",
        },
    )

    # 6. Strict Guardrail: Missing Context / Unknown Information
    send_chat_request(
        scenario_name="Scenario 6: Missing Context Handling (Anti-Hallucination Guardrail)",
        payload={
            "request_id": "req_demo_06",
            "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            "application_id": "quickai",
            "query": "What is the secret quantum encryption key used by the database server?",
            "conversation_id": "conv_demo_06",
        },
    )

    # 7. Conversational query with history
    send_chat_request(
        scenario_name="Scenario 7: Conversational Query with Chat History",
        payload={
            "request_id": "req_demo_07",
            "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
            "application_id": "quickai",
            "query": "And what about the completed ones?",
            "conversation_id": "conv_demo_07",
            "history": [
                {
                    "role": "user",
                    "content": "How many tasks does Project Alpha have?",
                },
                {
                    "role": "assistant",
                    "content": "Project Alpha has 12 total tasks: 8 completed, 3 in progress, and 1 pending.",
                },
            ],
        },
    )

    print("\n" + "=" * 80)
    print("  All 7 Quick.AI demonstration scenarios executed successfully!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
