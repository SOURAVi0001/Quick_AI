# Quick.AI Intelligent Chatbot Backend Service

A modular, production-grade, Python-based Chatbot backend powered by Retrieval-Augmented Generation (RAG) and Large Language Models (LLMs), configured specifically for the **Quick.AI** content generation platform. Designed as an independent microservice that connects cleanly to external web applications via REST APIs.

---

## Table of Contents

- [1. Architecture and Pipeline](#1-architecture-and-pipeline)
- [2. Strict Guardrails & No-Agentic-Workflow Design](#2-strict-guardrails--no-agentic-workflow-design)
- [3. User Info JSON Format Support](#3-user-info-json-format-support)
- [4. Quick.AI Knowledge Base Coverage](#4-quickai-knowledge-base-coverage)
- [5. Project Structure](#5-project-structure)
- [6. Technology Stack](#6-technology-stack)
- [7. Setup and Installation](#7-setup-and-installation)
- [8. Running the Service & Live Studio UI](#8-running-the-service--live-studio-ui)
- [9. Running the Automated Tests](#9-running-the-automated-tests)
- [10. Running the Interactive Demo Script](#10-running-the-interactive-demo-script)
- [11. API Reference and Example Calls](#11-api-reference-and-example-calls)
- [12. Switching LLM Providers (Mock vs LM Studio)](#12-switching-llm-providers-mock-vs-lm-studio)

---

## 1. Architecture and Pipeline

The chatbot processes requests through an explicit, 8-stage pipeline:

```
[Quick.AI Web Application / Client]
          │  POST /api/v1/chat  (or POST /api/v1/chat/trace)
          ▼
1. [Request Validation] ───────► Rejects blank queries, validates application_id ("quickai")
          │
          ▼
2. [Query Classification] ─────► Is query related to Quick.AI or user account?
          │                          │
          │                          ├─► NO  ──► Immediate Polite Rejection (Strict Scope Guardrail)
          ▼ (YES)                                 ("Sorry, I can only answer questions related to this application.")
3. [Query Rewriting] ──────────► Resolves conversational pronouns & history into a standalone query
          │
          ▼
4. [Context Retrieval (RAG)] ──► Dual-source retrieval:
          │                        ├── A. Quick.AI Knowledge Base (Vector similarity search over tools & DB migrations)
          │                        └── B. Authorized User Context (Dynamic JSON or user_context.json)
          │
          ▼
5. [Answer Generation] ────────► LLM synthesizes response grounded strictly in authorized context
          │                      (Enforces NO-AGENTIC-WORKFLOW: guides user to tool pages)
          ▼
6. [Answer Evaluation] ────────► LLM-as-a-Judge scores Relevance & Grounding against thresholds (>= 0.75)
          │
          ├──► Unsatisfactory & retries remain ──► Retry Loop (MAX_RETRIES=2): Expand context & regenerate
          │
          ▼ (Satisfactory OR Retries Exhausted)
7. [Final Structured Response] ─► Returns JSON containing answer, source citations, evaluation scores
```

---

## 2. Strict Guardrails & No-Agentic-Workflow Design

The chatbot is strictly bounded by deterministic guardrails:

1. **NO AGENTIC WORKFLOW**:
   - The chatbot is purely an **informational Q&A assistant**.
   - It **does not execute actions**, trigger background jobs, write articles on the fly, generate images, or alter database records on behalf of the user.
   - If a user asks *"Write an article for me about AI"* or *"Remove the background from this image"*, the chatbot politely declines direct generation and instead provides actionable guidance on how and where to use the respective Quick.AI tool page (e.g. `/ai/write-article`, `/ai/remove-background`).

2. **STRICT SCOPE REJECTION**:
   - Questions about general knowledge, sports, trivia, geography, poetry, cooking recipes, or unrelated coding tasks are intercepted at Stage 2 and immediately rejected without consuming RAG compute or generation tokens.

3. **FACTUAL GROUNDING & ANTI-HALLUCINATION**:
   - All factual claims must be verifiable in the retrieved Quick.AI documentation or the authorized user records.
   - If information is not found in the context (e.g. unknown encryption keys or unsupported tools like video generation), the chatbot explicitly states that the information is unavailable.

4. **USER DATA PRIVACY & AUTHORIZATION**:
   - Only the authenticated user's account details, creations, and quota are accessible.
   - Private creations belonging to other user IDs are never disclosed.
   - Prompt injection attacks and attempts to bypass instructions are treated as untrusted data and ignored.

---

## 3. User Info JSON Format Support

The chatbot accepts user information in standard JSON format through two mechanisms:

### Method A: Dynamic JSON Payload in `ChatRequest`
Callers can supply user information directly in the HTTP request payload under `user_info`:

```json
{
  "request_id": "req_1001",
  "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
  "application_id": "quickai",
  "query": "What is my current plan and remaining free usage quota?",
  "user_info": {
    "user_id": "user_2yMX02PRbyMtQK6PebpjnxvRNIA",
    "application_id": "quickai",
    "full_name": "Alex Johnson",
    "email": "alex.johnson@example.com",
    "plan": "free",
    "free_usage": 3,
    "max_free_usage": 5,
    "remaining_free_usage": 2,
    "total_creations": 3,
    "recent_creations": [
      {
        "id": 9,
        "type": "blog-title",
        "prompt": "Generate a blog title for Technology",
        "publish": false,
        "likes_count": 0
      },
      {
        "id": 7,
        "type": "article",
        "prompt": "Write an article about AI With Coding",
        "publish": true,
        "likes_count": 4
      }
    ],
    "recent_activity": [
      {
        "action": "Generated blog title for 'Technology'",
        "timestamp": "2026-10-09T11:09:50Z"
      }
    ]
  }
}
```

### Method B: Pre-Stored JSON in `app/data/user_context.json`
If `user_info` is not provided in the request body, the retriever looks up the user record by `user_id` from `app/data/user_context.json`.

---

## 4. Quick.AI Knowledge Base Coverage

The knowledge base (`app/data/knowledge_base.json`) models the Quick.AI system architecture and features:

| Document ID | Category | Summary |
| :--- | :--- | :--- |
| `doc_quickai_overview` | Overview | All-in-one AI SaaS platform (React 19, Express 5, Neon Postgres, Redis, BullMQ, Clerk, Socket.IO) |
| `doc_tool_article_writer` | AI Tools | AI Article Writer (`/ai/write-article`): custom length, Gemini 2.5 Flash, Redis SHA-256 caching, BullMQ async |
| `doc_tool_blog_titles` | AI Tools | Blog Title Generator (`/ai/blog-titles`): Top 5 catchy titles, counts toward 5 free usage quota |
| `doc_tool_image_generation` | AI Tools | AI Image Generation (`/ai/generate-images`): ClipDrop + Cloudinary. **Requires Premium Plan** |
| `doc_tool_bg_removal` | AI Tools | Background Removal (`/ai/remove-background`): Cloudinary `background_removal` transformation |
| `doc_tool_object_removal` | AI Tools | Object Removal (`/ai/remove-object`): Cloudinary generative removal `gen_remove:<object>` |
| `doc_tool_resume_reviewer` | AI Tools | Resume Reviewer (`/ai/review-resume`): PDF text extraction via `pdf-parse`, Gemini analysis within 300 words |
| `doc_dashboard_and_creations` | User Features | Dashboard (`/ai`): Total creations, active plan badge, cached in Redis for 5 min (`user:creations:{userId}`) |
| `doc_community_and_social` | User Features | Community Showcase (`/ai/community`): Public gallery (`publish=true`), like/unlike creation system |
| `doc_plans_and_pricing` | Billing | Free tier (5 free generations limit) vs Premium tier (unlimited, unlocks image generation). Clerk PricingTable |
| `doc_architecture_and_queue` | Architecture | Decoupled async architecture: BullMQ background worker + Socket.IO real-time notification |
| `change_001_db_migrations` | Change Log | Database indexing migration (`scripts/migrate.js`): composite index `idx_creations_user_date`, partial index `idx_creations_publish`, `idx_creations_type` |
| `change_002_async_worker` | Change Log | BullMQ worker & Socket.IO room alerts deployed |
| `change_003_caching_and_fallbacks` | Change Log | Multi-layer Redis caching (SHA-256 hash) & `demoFallbacks.js` resilience |
| `change_004_security_ratelimit` | Change Log | Clerk Express authentication, plan checks, and sliding-window rate limiters |

---

## 5. Project Structure

```
chatbot-service/
├── app/
│   ├── main.py                     # FastAPI app factory, CORS, static client mounting
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py               # REST endpoints (/chat, /chat/trace, /data/dummy, /health, /info)
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py               # Settings (SUPPORTED_APPLICATION_ID="quickai", thresholds)
│   ├── data/
│   │   ├── knowledge_base.json     # Quick.AI documentation and database migration logs
│   │   └── user_context.json       # User JSON records (Alex Johnson, Sarah Connor, Alice Smith)
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── llm_base.py             # Abstract BaseLLMProvider interface
│   │   ├── lm_studio.py            # LM Studio OpenAI-compatible async HTTP provider
│   │   └── mock_llm.py             # Deterministic offline mock LLM provider with Quick.AI guardrails
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request.py              # ChatRequest schema supporting optional dynamic user_info JSON
│   │   └── response.py             # ChatResponse, SourceItem, EvaluationSummary schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── answer_generator.py     # Grounded answer synthesis enforcing NO-AGENTIC-WORKFLOW
│   │   ├── chatbot.py              # Main orchestrator pipeline and live trace generator
│   │   ├── classifier.py           # Quick.AI scope classification and out-of-scope filter
│   │   ├── evaluator.py            # LLM-as-a-Judge answer quality evaluation
│   │   ├── query_rewriter.py       # Conversational query disambiguation
│   │   └── retriever.py            # Dual-source RAG and dynamic user JSON context retriever
│   └── utils/
│       ├── __init__.py
│       └── logging.py              # Structured logging configuration
├── client/
│   ├── index.html                  # Quick.AI Chatbot Studio & Live RAG Flow Visualizer UI
│   ├── app.js                      # Client logic, user switcher, preset queries, flow debugger
│   └── styles.css                  # Studio styling, glassmorphism, responsive split-screen
├── tests/
│   ├── __init__.py
│   ├── test_classifier.py          # Unit tests for Quick.AI query classification & fallbacks
│   ├── test_retriever.py           # Unit tests for vector search, user isolation, and dynamic JSON
│   └── test_chat_api.py            # 18 end-to-end integration tests (all scenarios & guardrails)
├── run_demo.py                     # Runnable demo script demonstrating 7 core scenarios
├── requirements.txt                # Production dependencies
└── README.md
```

---

## 6. Setup and Installation

### Step 1: Navigate and activate environment
```bash
cd chatbot-service
source .venv/bin/activate
```

### Step 2: Install dependencies (if needed)
```bash
pip install -r requirements.txt
```

---

## 7. Running the Service & Live Studio UI

Start the FastAPI ASGI server:
```bash
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Then open your browser at:
👉 **`http://127.0.0.1:8000/`**

Features of the Studio UI:
- **Interactive Chat Interface**: Select from preset test queries or submit custom questions.
- **User Context Switcher**: Switch on the fly between Alex Johnson (Free: 3/5 usage), Sarah Connor (Premium: Unlimited), and Alice Smith.
- **Live Data Flow Graph**: Visualizes each stage of the pipeline (`Request Validation` -> `Query Classification` -> `Scope Decision Gate` -> `Query Rewriting` -> `Context Retrieval` -> `Answer Generation` -> `LLM-as-a-Judge Evaluation` -> `Final Response`).
- **Data & User Info Explorer Modal**: Inspect the full Quick.AI knowledge base and user JSON profiles.

---

## 8. Running the Automated Tests

Run the complete test suite with pytest:
```bash
.venv/bin/pytest -v
```

All 37 test cases validate:
- Valid Quick.AI queries and historical migration logs
- Out-of-scope question immediate rejection
- User-specific plan and quota isolation
- Dynamic user info JSON payload passing
- No-agentic-workflow guardrails (directing users to tool pages)
- Missing context handling without hallucination
- Bounded retry loops and LLM-as-a-Judge evaluations

---

## 9. Running the Interactive Demo Script

Run the standalone demonstration script:
```bash
.venv/bin/python run_demo.py
```

This runs 7 scenarios directly through the REST API:
1. Scenario 1: Recent Database Migrations & Performance Changes
2. Scenario 2: Out-of-Scope Query (Strict Guardrail Rejection)
3. Scenario 3: User-Specific Account Quota & Plan Status (Alex Johnson)
4. Scenario 4: Dynamic User Info Provided in JSON Format (VIP user payload)
5. Scenario 5: No-Agentic Workflow Guardrail (Instructs tool navigation)
6. Scenario 6: Missing Context Handling (Anti-Hallucination Guardrail)
7. Scenario 7: Conversational Query with Chat History Disambiguation

---

## 10. Switching LLM Providers (Mock vs LM Studio)

By default, the service runs in **Mock mode** (`LLM_PROVIDER="mock"`), requiring zero API keys and zero local GPU resources while providing full deterministic responses.

To connect to LM Studio (or any OpenAI-compatible server):
1. Start LM Studio and load a model (e.g. `Meta-Llama-3.1-8B-Instruct`).
2. Start the Local Inference Server on port `1234`.
3. In `chatbot-service/.env`:
   ```bash
   LLM_PROVIDER=lm_studio
   LLM_BASE_URL=http://localhost:1234/v1
   LLM_API_KEY=lm-studio
   LLM_MODEL=local-model
   ```
4. Restart the service. The pipeline will automatically switch to your local LLM.
