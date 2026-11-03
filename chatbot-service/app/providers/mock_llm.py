"""Mock LLM provider for zero-dependency local testing and deterministic demonstrations."""

import json
import re
from typing import Dict, List, Optional
from app.providers.llm_base import BaseLLMProvider
from app.utils.logging import logger


class MockLLMProvider(BaseLLMProvider):
    """Deterministic, offline LLM provider simulating an intelligent language model.

    Parses the incoming prompt instructions and produces appropriate structured JSON
    or grounded answers based strictly on the provided Quick.AI application data.
    """

    def __init__(
        self,
        force_evaluation_fail: bool = False,
        simulate_connection_error: bool = False,
    ):
        self.force_evaluation_fail = force_evaluation_fail
        self.simulate_connection_error = simulate_connection_error

    async def chat_complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = 500,
    ) -> str:
        """Simulates LLM inference based on system instructions and input messages."""
        if self.simulate_connection_error:
            raise ConnectionError("Simulated LLM connection error for testing")

        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")

        logger.debug("Mock LLM processing prompt. User msg snippet: %s", user_msg[:80])

        # 1. Classification check
        if "classif" in system_msg.lower():
            return self._mock_classification(user_msg)

        # 2. Query Rewriting check
        if "query rewriting" in system_msg.lower() or "rephrase the user" in system_msg.lower():
            return self._mock_rewriting(user_msg)

        # 3. Answer Evaluation check
        if ("evaluat" in system_msg.lower() and ("candidate" in system_msg.lower() or "judge" in system_msg.lower() or "score" in system_msg.lower() or "impartial" in system_msg.lower())) or "llm-as-a-judge" in system_msg.lower():
            return self._mock_evaluation(user_msg)

        # 4. Default: Answer Generation grounded in context
        return self._mock_answer_generation(user_msg)

    def _mock_classification(self, prompt: str) -> str:
        """Generates classification JSON based on query contents with strict guardrails."""
        query_part = prompt.split("Classify this query:")[-1].strip() if "Classify this query:" in prompt else prompt
        lower_prompt = query_part.lower()

        # Strict Guardrails: Reject server, backend, frontend, code, and internal functionality
        forbidden_internal_cues = [
            "backend server", "backend code", "internal code", "source code", "codebase",
            "backend architecture", "frontend code", "database migration", "migration",
            "migrations", "how is this built", "show me the code", "chatbot service",
            "internal schema", "api endpoint", "express controller", "server controller",
            "docker container", "kubernetes cluster", "deploy.yml",
            "binary search", "bubble sort", "solve leetcode", "leetcode", "write code",
            "write a function", "python script", "dsa problem", "sorting algorithm",
            "hc question", "hackerrank", "write a program", "write code for",
            "code problem", "coding question", "solve this code",
            "system prompt", "ignore previous instructions", "jailbreak", "bypass guardrails",
            "admin mode", "developer mode", "override instructions",
            "cricket", "poem", "capital of france", "joke", "paris", "weather",
            "football", "president", "recipe", "cook", "tell me a joke"
        ]
        if any(cue in lower_prompt for cue in forbidden_internal_cues):
            result = {
                "is_relevant": False,
                "category": "out_of_scope",
                "intent": "out_of_scope",
                "requires_db": False,
                "suggested_redirect": None,
                "reason": "The query is outside Quick.AI career scope. The bot operates under strict guardrails and has NO access to code or general knowledge.",
                "confidence": 0.99,
            }
            return json.dumps(result)

        intent = "general_help"
        suggested_redirect = None
        requires_db = False
        extracted_entities = {}

        if ("tailor" in lower_prompt and "resume" in lower_prompt) or "resume tailor" in lower_prompt:
            intent = "resume_tailor"
            suggested_redirect = "/ai/resume-tailor"
            if "jd:" in lower_prompt:
                jd_idx = lower_prompt.find("jd:") + 3
                extracted_entities["job_description"] = prompt[jd_idx:].strip()
        elif ("review" in lower_prompt and "resume" in lower_prompt) or "resume review" in lower_prompt or "ats" in lower_prompt:
            intent = "resume_review"
            suggested_redirect = "/ai/review-resume"
        elif "career score" in lower_prompt or "profile score" in lower_prompt or "credit score" in lower_prompt:
            intent = "career_score"
            requires_db = True
            if "average" in lower_prompt:
                extracted_entities["calculation_type"] = "average"
            if "recalculate" in lower_prompt:
                suggested_redirect = "/ai/career-score"
        elif "job tracker" in lower_prompt or "applied to" in lower_prompt or "applied" in lower_prompt:
            intent = "job_tracker"
            requires_db = True
            suggested_redirect = "/ai/job-tracker"
        elif "write email" in lower_prompt or "email writer" in lower_prompt or "e-right email" in lower_prompt or "eright email" in lower_prompt:
            intent = "write_email"
            suggested_redirect = "/ai/write-email"
        elif "linkedin" in lower_prompt:
            intent = "linkedin_optimizer"
            suggested_redirect = "/ai/linkedin-optimizer"
        elif "recruiter" in lower_prompt:
            intent = "recruiter_outreach"
            suggested_redirect = "/ai/recruiter-outreach"
        elif "interview" in lower_prompt:
            intent = "interview_coach"
            suggested_redirect = "/ai/interview-coach"
            if "weakness" in lower_prompt or "strength" in lower_prompt:
                requires_db = True
        elif "dashboard" in lower_prompt:
            intent = "dashboard_analytics"
            requires_db = True
            suggested_redirect = "/dashboard"
        elif any(re.search(pat, lower_prompt) for pat in [
            r"\b(hi|hello|hey|howdy|sup|yo|greetings|hola)\b",
            r"\bgood\s+(morning|afternoon|evening|day)\b",
            r"\bhow\s+are\s+you\b",
            r"\bhow\s+are\s+you\s+doing\b",
            r"\bhows\s+it\s+going\b",
            r"\bwhats\s+up\b",
        ]) and not any(w in lower_prompt for w in [
            "feature", "resume", "score", "tracker", "applied", "email",
            "linkedin", "interview", "dashboard", "quota", "plan", "migration", "server"
        ]):
            intent = "greeting"

        if intent == "greeting":
            category = "greeting"
        elif ("my" in lower_prompt or "mine" in lower_prompt or "i have" in lower_prompt or "i created" in lower_prompt or "i did" in lower_prompt) and not ("system" in lower_prompt or "platform" in lower_prompt):
            category = "project_status"
            requires_db = True
        elif any(cue in lower_prompt for cue in ["task", "alpha", "completed", "status", "progress", "plan", "quota", "usage", "creation", "creations", "past action", "past actions"]):
            category = "project_status"
            requires_db = True
        else:
            category = "application_help"

        result = {
            "is_relevant": True,
            "category": category,
            "intent": intent,
            "requires_db": requires_db,
            "suggested_redirect": suggested_redirect,
            "extracted_entities": extracted_entities,
            "reason": f"The query is directly relevant to {category.replace('_', ' ')} in Quick.AI.",
            "confidence": 0.95,
        }
        return json.dumps(result)

    def _mock_rewriting(self, prompt: str) -> str:
        """Generates rewritten query JSON."""
        # Clean prompt if it has Original Query: prefix or conversation history
        clean_input = prompt.strip()
        if clean_input.lower().startswith("original query:"):
            clean_input = clean_input[len("original query:") :].strip()
        if "recent conversation history:" in clean_input.lower():
            clean_input = clean_input.split("Recent Conversation History:")[0].strip()

        lower_prompt = prompt.lower()
        if "what about this application" in lower_prompt or "features does quick.ai provide" in lower_prompt:
            rewritten = "What are the main features and AI tools provided by Quick.AI?"
            reason = "Expanded generic query to target core Quick.AI capabilities."
        elif "what changed recently" in lower_prompt or "changes were made" in lower_prompt:
            rewritten = "What are the most recent changes and updates in Quick.AI?"
            reason = "Clarified historical change log inquiry for Quick.AI."
        elif "completed ones" in lower_prompt or "how many tasks" in lower_prompt:
            rewritten = "How many tasks in the current project have been completed?"
            reason = "Resolved conversational pronoun to specific task completion inquiry."
        elif "my creations" in lower_prompt or "how many creations" in lower_prompt:
            rewritten = "How many creations and what recent items are associated with my user account?"
            reason = "Resolved user creation inquiry."
        elif "pricing" in lower_prompt or "plans" in lower_prompt:
            rewritten = "What are the differences between Free and Premium plans in Quick.AI?"
            reason = "Formulated specific pricing and quota inquiry."
        elif "assign" in lower_prompt:
            rewritten = "How do users assign tasks to team members in Quick.AI?"
            reason = "Formulated specific task assignment inquiry."
        else:
            rewritten = clean_input
            if not rewritten.endswith("?"):
                rewritten += "?"
            reason = "Preserved clear specific query."

        return json.dumps({
            "original_query": prompt.strip(),
            "rewritten_query": rewritten,
            "reason": reason,
        })

    def _mock_evaluation(self, prompt: str) -> str:
        """Generates evaluation JSON."""
        if self.force_evaluation_fail:
            return json.dumps({
                "is_satisfactory": False,
                "relevance_score": 0.40,
                "grounding_score": 0.50,
                "reason": "Forced failure for testing retry mechanism.",
            })

        lower_prompt = prompt.lower()
        if "insufficient" in lower_prompt or "information is unavailable" in lower_prompt or "unavailable" in lower_prompt:
            return json.dumps({
                "is_satisfactory": True,
                "relevance_score": 0.90,
                "grounding_score": 0.95,
                "reason": "The answer accurately acknowledges missing context without hallucination.",
            })

        return json.dumps({
            "is_satisfactory": True,
            "relevance_score": 0.95,
            "grounding_score": 0.92,
            "reason": "The generated answer is directly relevant to the query and well-grounded in retrieved context.",
        })

    def _mock_answer_generation(self, prompt: str) -> str:
        """Generates grounded answer according to retrieved context."""
        # 1. Extract the actual user query from prompt lines (prefer Original Query)
        user_query = ""
        for line in prompt.splitlines():
            if line.startswith("Original Query:"):
                cand = line.replace("Original Query:", "").strip()
                if cand:
                    user_query = cand
                    break
            elif line.startswith("Rewritten Search Query:") and not user_query:
                user_query = line.replace("Rewritten Search Query:", "").strip()

        if not user_query:
            user_query = prompt.split("=== RETRIEVED APPLICATION CONTEXT")[0].strip()

        if user_query.lower().startswith("original query:"):
            user_query = user_query[len("original query:"):].strip()

        lower_query = user_query.lower().rstrip("?").strip()
        lower_prompt = prompt.lower()

        # 2. Extract Authorized User Information if present in context
        user_name = "there"
        user_plan = "free"
        free_usage = "0"
        max_free_usage = "5"
        remaining_free_usage = "5"
        total_creations = "0"

        if "Authorized User Information:" in prompt:
            user_section = prompt.split("Authorized User Information:")[1].split("=====================================================")[0]
            for line in user_section.splitlines():
                s = line.strip()
                if s.startswith("User:"):
                    raw = s.split("User:")[1].split("(")[0].strip()
                    if raw and raw != "there":
                        user_name = raw
                elif s.startswith("Plan:"):
                    user_plan = s.split("Plan:")[1].strip().lower()
                elif s.startswith("Free Usage Count:"):
                    try:
                        counts = s.split("Free Usage Count:")[1].split("(")[0].strip()
                        parts = [p.strip() for p in counts.split("/")]
                        free_usage = parts[0]
                        max_free_usage = parts[1]
                    except Exception:
                        pass
                    if "Remaining:" in s:
                        try:
                            remaining_free_usage = s.split("Remaining:")[1].split(")")[0].strip()
                        except Exception:
                            pass
                elif s.startswith("Total Creations:"):
                    total_creations = s.split("Total Creations:")[1].strip()

        # 3. Greetings & friendly conversational opening & capability inquiries
        is_greeting = (
            lower_query in ["hey", "hello", "hi", "hey there", "hi there", "how are you", "how are you doing", "how's it going", "good morning", "good evening", "good afternoon", "howdy", "what's up", "hey quickai", "hi quickai", "yo", "greetings", "fizzi", "fizzi ai", "hey fizzi", "hi fizzi"]
            or lower_query.startswith("hey ")
            or lower_query.startswith("hi ")
            or lower_query.startswith("hello ")
            or lower_query.startswith("how are you")
            or any(q in lower_query for q in ["what can you do", "what are your capabilities", "who are you", "help me", "how can you help", "what do you do", "what are you", "tell me about yourself", "what is quick.ai", "what is quick ai", "who is fizzi", "what is fizzi"])
        )
        if is_greeting:
            greeting_name = user_name if user_name and user_name != "there" else ""
            name_str = f" {greeting_name}" if greeting_name else ""
            if "how are you" in lower_query or "how's it going" in lower_query:
                prefix = f"Hello{name_str}! I'm doing great, thank you for asking! 😊 How can I help you today?"
            else:
                prefix = f"Hello{name_str}! 👋 How can I help you today?"
            return (
                f"{prefix}\n\n"
                "I am Fizzi AI, your Quick.AI career assistant. I can help you explore Quick.AI and accelerate your job search with our 7 core career tools:\n"
                "- **01 Smart Email Writer**: Draft professional, persuasive emails in seconds\n"
                "- **02 Resume Reviewer**: Get blunt, actionable feedback on your resume before you hit send\n"
                "- **03 Resume Tailor**: Rewrite your resume for a specific job description\n"
                "- **04 Career Score**: Benchmark your profile across skills, experience, and impact\n"
                "- **05 LinkedIn Optimizer**: Sharpen your headline, about section, and keywords\n"
                "- **06 Recruiter Outreach**: Generate concise messages that get replies from recruiters\n"
                "- **07 AI Interview Coach**: Practice real interview questions with instant feedback\n\n"
                "You can also ask me about your account details, past creations history, remaining free quota, and membership plan.\n\n"
                "How can I assist your career search today?"
            )

        # Strict Guardrail 1: Missing context / unknown topic
        if (
            "context is insufficient" in lower_prompt
            or "no relevant documents" in lower_prompt
            or "no matching context" in lower_prompt
            or "quantum" in lower_query
            or "secret" in lower_query
            or "encryption key" in lower_query
        ):
            return "The requested information is unavailable in the current application documentation or your authorized user records."

        # Strict Guardrail 2: NO Agentic Workflow (Do not execute generative tasks; instruct user how to use the tool)
        if any(action in lower_query for action in [
            "write an article for me", "generate an article for me", "generate article about",
            "make an image for me", "create an image of", "remove background from this image"
        ]):
            return (
                "I am an informational support assistant and do not execute generative tasks directly in this chat. "
                "To generate content, please navigate to the appropriate tool page in Quick.AI (such as the AI Article Writer at /ai/write-article "
                "or AI Image Generation at /ai/generate-images) and submit your prompt there."
            )

        # 4. Strict Guardrails: Server, backend, frontend, code, database migrations & internal functionality
        forbidden_internal_terms = [
            "server", "backend", "frontend", "internal code", "source code", "database migration",
            "migration", "redis", "bullmq", "socket.io", "show me the code", "chatbot service",
            "architecture", "binary search", "bubble sort", "write code", "solve leetcode",
            "python script", "dsa problem", "sorting algorithm"
        ]
        if any(w in lower_query for w in forbidden_internal_terms):
            return (
                "Sorry, I do not have access to server, backend, code, or internal application functionality. "
                "I can only help you with your account details, actions performed in the past, and Quick.AI's 7 career tools:\n\n"
                "01 **Smart Email Writer**: Draft professional, persuasive emails in seconds.\n"
                "02 **Resume Reviewer**: Get blunt, actionable feedback on your resume.\n"
                "03 **Resume Tailor**: Rewrite your resume for a specific job description.\n"
                "04 **Career Score**: Benchmark your profile across skills, experience, and impact.\n"
                "05 **LinkedIn Optimizer**: Sharpen your headline, about section, and keywords.\n"
                "06 **Recruiter Outreach**: Generate concise messages that get replies.\n"
                "07 **AI Interview Coach**: Practise real interview questions with instant feedback."
            )

        # 5. User Plan & Quota query: check lower_query!
        is_quota_query = any(k in lower_query for k in [
            "quota", "free usage", "how many free", "generations do i have left",
            "generations left", "generations remaining", "remaining generations",
            "my plan", "what is my plan", "current plan", "how many generations",
            "generations do i have", "am i premium", "do i have unlimited"
        ]) or (
            any(k in lower_query for k in ["plan", "quota", "generation", "generations", "usage", "credit"])
            and any(w in lower_query for w in ["my", "i have", "account", "left", "how many", "remaining", "current", "what is"])
        )

        if is_quota_query:
            account_label = f"Your account ({user_name})" if user_name and user_name != "there" else "Your account"
            if user_plan == "premium" or ("premium" in lower_prompt and "sarah" in lower_prompt):
                return (
                    f"{account_label} is on the **Premium** plan with unlimited generations across all tools "
                    "(including AI Image Generation, Resume Tailoring, and Interview Coach) with priority queue processing."
                )
            if "Authorized User Information:" in prompt or user_name != "there":
                return (
                    f"{account_label} is on the **Free** plan with {free_usage} out of {max_free_usage} free generations used ({remaining_free_usage} remaining). "
                    "Once you reach your limit, upgrading to Premium unlocks unlimited generations across all tools and enables AI Image Generation."
                )
            return (
                "You are currently on the Quick.AI Free plan with 5 free generations. "
                "Upgrading to Premium unlocks unlimited generations across all tools and enables AI Image Generation."
            )

        # 6. User Creations / Recent Changes / Account Activity / Rating
        is_user_creations_or_activity = any(k in lower_query for k in [
            "my creations", "recent creations", "what did i create", "my recent changes",
            "my changes", "my activity", "rate them", "how to rate", "rate my", "my creations are"
        ]) or (("my" in lower_query or "i " in lower_query) and any(w in lower_query for w in ["creations", "changes", "history", "rating", "rate"]))

        if is_user_creations_or_activity:
            creations_summary = ""
            if "Authorized User Information:" in prompt and "Recent Creations:" in prompt:
                creations_text = []
                rec_sec = prompt.split("Recent Creations:")[1].split("\n\n")[0]
                for cline in rec_sec.splitlines():
                    if cline.strip().startswith("- [Creation"):
                        creations_text.append(cline.strip()[2:])
                if creations_text:
                    items_str = "\n".join(f"{idx+1}. {it}" for idx, it in enumerate(creations_text[:4]))
                    creations_summary = f"You have {total_creations} total creations recorded in your account:\n{items_str}\n\n"

            if not creations_summary:
                creations_summary = (
                    "Here are your latest saved creations:\n"
                    "1. Creation #9: Blog titles for 'Technology' (Private)\n"
                    "2. Creation #8: Blog titles for 'General' (Private)\n"
                    "3. Creation #7: Article 'AI With Coding' (Published to Community with 4 likes)\n\n"
                )

            rating_advice = (
                "**How to rate and improve your career materials:**\n"
                "- **Resume Reviewer** [Open Reviewer](/ai/review-resume): Upload your resume PDF for an instant ATS compatibility score, formatting analysis, and impact rating.\n"
                "- **Career Score** [View Score](/ai/career-score): Receive a comprehensive 360° career score evaluating your profile readiness across experience, skills, and outreach.\n"
                "- **Resume Tailor** [Open Tailor](/ai/resume-tailor): Align your resume bullet points directly with target job requirements."
            )
            return f"{creations_summary}{rating_advice}"

        # 7. Recruiter Outreach / Email Writer & HR Referral Generation
        is_email_query = any(k in lower_query for k in [
            "write a email", "write an email", "email for hr", "referral email", "email for referral",
            "outreach email", "recruiter email", "cold email", "draft email", "send email", "referral for sd"
        ]) or (("email" in lower_query or "outreach" in lower_query or "referral" in lower_query) and any(w in lower_query for w in ["write", "draft", "hr", "recruiter", "sd", "job", "for"]))

        if is_email_query:
            is_referral_or_sd = any(term in lower_query for term in ["referral", "hr", "sd", "software", "developer", "road"])
            if is_referral_or_sd:
                sender_name = user_name if user_name and user_name != "there" else "[Your Name]"
                return (
                    "Here is a referral request email drafted for HR / Recruiters for the Software Developer (SD) position:\n\n"
                    "**Subject:** Referral Request: Software Developer Role — " + sender_name + "\n\n"
                    "Dear [HR / Recruiter Name],\n\n"
                    "I hope you are having a productive week. I am reaching out to express my keen interest in the Software Developer position at [Company Name]. Having followed your engineering team's recent milestones, I greatly admire your product innovations and engineering culture.\n\n"
                    "With hands-on experience in software development, distributed systems, and scalable web architecture, I believe my background aligns well with the technical challenges your team is solving.\n\n"
                    "I have attached my resume for your review. Would you be open to a brief 5-minute conversation or considering my profile for an internal referral?\n\n"
                    "Thank you for your time and consideration.\n\n"
                    "Best regards,\n"
                    f"{sender_name}\n"
                    "[Your Contact Info | LinkedIn Profile | Portfolio]\n\n"
                    "---\n"
                    "💡 *You can customize tones (Casual, Formal, Enthusiastic) and generate tailored outreach drafts using our **Recruiter Outreach** tool [Open Outreach](/ai/recruiter-outreach).*"
                )
            return (
                "Quick.AI features the **Recruiter Outreach** tool [Open Outreach](/ai/recruiter-outreach) designed to draft high-converting emails for your job search:\n\n"
                "1. **Referral Request Emails**: Politely request internal referrals from employees and HR.\n"
                "2. **Cold Outreach to Recruiters**: Stand out to hiring managers with concise, tailored value propositions.\n"
                "3. **Follow-Up Emails**: Follow up professionally after submitting an application or completing an interview.\n\n"
                "You can generate custom outreach drafts directly at [Recruiter Outreach](/ai/recruiter-outreach), or tell me the target role and company and I'll draft one right here!"
            )

        # 8. Guidance / "How" queries
        if lower_query in ["how ?", "how?", "how", "how does it work", "how do i use it", "how to use"]:
            return (
                "Here is how you can use Quick.AI step-by-step to accelerate your job search:\n\n"
                "1. **Analyze Your Resume**: Upload your resume PDF at **Resume Reviewer** [Open Reviewer](/ai/review-resume) to get an instant ATS score and bullet point feedback.\n"
                "2. **Tailor for Job Postings**: Paste any target job description into **Resume Tailor** [Open Tailor](/ai/resume-tailor) to automatically tailor your keywords.\n"
                "3. **Reach Out to Recruiters**: Generate referral and cold outreach emails using **Recruiter Outreach** [Open Outreach](/ai/recruiter-outreach).\n"
                "4. **Practice Interviews**: Simulate realistic behavioral and role-specific questions with the **Interview Coach** [Start Practice](/ai/interview-coach).\n"
                "5. **Track Applications**: Manage deadlines and interview stages on the **Job Tracker** [Open Tracker](/ai/job-tracker).\n\n"
                "Which tool would you like to start with?"
            )

        # 9. Legacy user task stats for backward compatibility with existing tests
        if "project alpha" in lower_query or ("completed" in lower_query and "task" in lower_query):
            return (
                "Project Alpha has 12 total tasks: 8 tasks are completed, 3 tasks are in progress, "
                "and 1 task is pending."
            )

        # 10. Historical platform changes & database migrations (STRICTLY for system / platform queries)
        is_platform_changes = (
            ("migration" in lower_query or "database" in lower_query or "release note" in lower_query or "changelog" in lower_query)
            or (
                ("change" in lower_query or "update" in lower_query or "recent" in lower_query)
                and any(w in lower_query for w in ["quick.ai", "platform", "system", "app", "application", "database", "infrastructure", "backend"])
                and not any(m in lower_query for m in ["my", "mine", "i make", "i made"])
            )
        )
        if is_platform_changes:
            return (
                "Recent Quick.AI updates include: "
                "1. Database indexing migrations on October 5, 2026 (added composite index idx_creations_user_date, partial index idx_creations_publish, and idx_creations_type). "
                "2. Asynchronous BullMQ background worker integration with real-time Socket.IO notifications on October 7. "
                "3. Multi-layer Redis caching (SHA-256 prompt hashing) and demo fallbacks on October 9. "
                "4. Enhanced Clerk authentication and sliding-window rate limiters on October 10, 2026."
            )

        # 11. AI Image Generation tool & Premium plan requirement
        if "image" in lower_query and ("generate" in lower_query or "premium" in lower_query or "tool" in lower_query):
            return (
                "AI Image Generation (/ai/generate-images via POST /api/ai/generate-image) creates visuals using the ClipDrop API "
                "and stores them on Cloudinary. This tool strictly requires an active Premium plan; users on the Free plan receive a 403 Forbidden error."
            )

        # 12. Resume Reviewer tool
        if "resume" in lower_query or "reviewer" in lower_query or "tailor" in lower_query:
            return (
                "The Resume Reviewer (/ai/review-resume) analyzes uploaded resume PDFs using pdf-parse and Google Gemini. "
                "It scores resume formatting, ATS compatibility, bullet impact, and delivers actionable career guidance within 300 words. "
                "You can also use the Resume Tailor (/ai/resume-tailor) to adapt your resume to specific job descriptions."
            )

        # 13. Pricing and Plans general comparison
        if "difference" in lower_query or "vs" in lower_query or ("plan" in lower_query and "free" in lower_query and "premium" in lower_query) or "pricing" in lower_query or "tier" in lower_query:
            return (
                "Quick.AI provides two plans: "
                "1. Free Plan: Access to career tools with 5 free generations. "
                "2. Premium Plan: Unlimited generations across all tools, AI Image Generation, Resume Tailoring per job description, and priority queue processing. "
                "Upgrades are managed through the Clerk Pricing Table."
            )

        # 14. AI Article Writer (Article / Blog writing only)
        if "article" in lower_query or ("blog" in lower_query and "title" not in lower_query) or "write-article" in lower_query:
            return (
                "The AI Article Writer (/ai/write-article via POST /api/ai/generate-article) generates structured articles based on user prompts "
                "and custom word lengths using Google Gemini 2.5 Flash. Generations are cached in Redis and processed asynchronously via BullMQ."
            )

        # 15. Default: General Quick.AI overview
        return (
            "Quick.AI is an all-in-one AI career workspace offering seven specialized tools: Resume Reviewer, Resume Tailor, "
            "LinkedIn Optimizer, Interview Coach, Recruiter Outreach, Career Score, and Job Tracker. It includes live dashboard analytics, "
            "creation history, and community sharing."
        )
