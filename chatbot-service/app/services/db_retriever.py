"""Database Retrieval and Context Augmentation Service for Quick.AI Career Workspace.

Provides two specialized nodes executed when a user query requires database access (`requires_db: True`):
1. DatabaseTableSelector (Node 1): Analyzes database schema and user query to identify which
   table(s) must be queried (including cross-tool/relational queries needing multiple tables).
2. DatabaseContextBuilder (Node 2): Fetches user records from the PostgreSQL database (with
   safe payload fallback), extracts relational metrics/history, and builds an augmented context
   for grounded answer generation.
"""

import json
from typing import Any, Dict, List, Optional
from datetime import datetime
import asyncpg

from app.core.config import settings
from app.services.classifier import ClassificationResult
from app.utils.logging import logger


# ------------------------------------------------------------------------------
# Database Schema Metadata & Mapping
# ------------------------------------------------------------------------------

DATABASE_SCHEMA_METADATA: Dict[str, Dict[str, Any]] = {
    "career_score": {
        "table": "creations",
        "type_filter": "career-score",
        "description": "Historical and latest Career Profile Scores, category breakdown (resume, linkedin, interview, jobs), and radar metrics.",
        "columns": ["id", "user_id", "type", "content", "created_at"],
    },
    "resume_review": {
        "table": "creations",
        "type_filter": "resume-review",
        "description": "ATS compatibility analysis, formatting scores, strengths, weaknesses, and improvement suggestions.",
        "columns": ["id", "user_id", "type", "prompt", "content", "created_at"],
    },
    "resume_tailor": {
        "table": "creations",
        "type_filter": "resume-tailor",
        "description": "Customized resume bullets tailored to specific job descriptions, skill matching scores.",
        "columns": ["id", "user_id", "type", "prompt", "content", "created_at"],
    },
    "linkedin": {
        "table": "creations",
        "type_filter": "linkedin-optimizer",
        "description": "LinkedIn profile optimizations, headlines, summary/about section, experience bullets, and skill keywords.",
        "columns": ["id", "user_id", "type", "prompt", "content", "created_at"],
    },
    "recruiter_outreach": {
        "table": "creations",
        "type_filter": "recruiter-outreach",
        "description": "Personalized cold messages, LinkedIn connection notes, and recruiter follow-up emails.",
        "columns": ["id", "user_id", "type", "prompt", "content", "created_at"],
    },
    "interview_coach": {
        "table": "creations",
        "type_filter": "interview-session",
        "description": "Mock interview sessions, questions asked, answers given, strengths, weaknesses, and coaching feedback.",
        "columns": ["id", "user_id", "type", "prompt", "content", "created_at"],
    },
    "email": {
        "table": "creations",
        "type_filter": "email",
        "description": "Smart Email Writer drafts and correspondence.",
        "columns": ["id", "user_id", "type", "prompt", "content", "created_at"],
    },
    "job_tracker": {
        "table": "job_applications",
        "type_filter": None,
        "description": "Tracked job applications: company name, role, status (Saved, Applied, Interviewing, Offered, Rejected), applied_date, next_action.",
        "columns": ["id", "user_id", "company", "role", "status", "applied_date", "next_action", "next_action_date", "notes", "recruiter_name"],
    },
    "job_activities": {
        "table": "job_application_activities",
        "type_filter": None,
        "description": "Timeline of status changes and notes for tracked job applications.",
        "columns": ["id", "user_id", "application_id", "type", "previous_status", "new_status", "note", "created_at"],
    },
    "job_insights": {
        "table": "job_search_insights",
        "type_filter": None,
        "description": "Aggregated job search analysis, application velocity, and pipeline conversion insights.",
        "columns": ["id", "user_id", "summary", "analysis_json", "data_quality", "created_at"],
    },
    "user_account": {
        "table": "user_account",
        "type_filter": None,
        "description": "Subscription tier (Free vs Premium) and remaining creation credits/quota.",
        "columns": ["user_id", "plan", "free_usage", "remaining_free_usage"],
    },
}


# ------------------------------------------------------------------------------
# Node 1: Database Table Selector
# ------------------------------------------------------------------------------

class DatabaseTableSelector:
    """Analyzes the query and database schema to determine which table(s) must be fetched."""

    def select_tables(
        self,
        query: str,
        classification: Optional[ClassificationResult] = None,
    ) -> List[str]:
        """Identifies single or multiple database tables required to resolve the query."""
        selected: List[str] = []
        lower = query.lower()

        # 1. Honor explicit table list from classifier if provided
        if classification and classification.required_tables:
            for tbl in classification.required_tables:
                norm = tbl.lower().strip()
                if norm in DATABASE_SCHEMA_METADATA and norm not in selected:
                    selected.append(norm)

        # 2. Check for domain keywords across the query
        if any(w in lower for w in ["career score", "profile score", "credit score"]):
            if "career_score" not in selected:
                selected.append("career_score")

        if any(w in lower for w in ["linkedin", "headline"]):
            if "linkedin" not in selected:
                selected.append("linkedin")

        # Explicit cross-tool comparison between LinkedIn and Resume/CV
        if "linkedin" in lower and ("resume" in lower or "cv" in lower):
            if "linkedin" not in selected:
                selected.append("linkedin")
            if "resume_review" not in selected:
                selected.append("resume_review")

        if any(w in lower for w in ["job", "application", "applied", "company", "companies", "tracker", "interviewing", "offer", "rejected"]):
            if "job_tracker" not in selected:
                selected.append("job_tracker")

        if any(w in lower for w in ["mock interview", "interview coach", "interview question", "interview feedback", "my weakness", "my strength"]):
            if "interview_coach" not in selected:
                selected.append("interview_coach")

        if any(w in lower for w in ["review resume", "resume review", "ats score", "ats compatibility"]) or (
            ("resume" in lower or "cv" in lower) and any(w in lower for w in [
                "drawback", "draw back", "drawbacks", "weakness", "weaknesses",
                "flaw", "flaws", "improve", "improvement", "improvements",
                "wrong", "mistake", "feedback", "ats", "critique", "review", "score",
                "missing", "present", "gap", "difference", "compare", "comparison", "vs"
            ])
        ):
            if "resume_review" not in selected:
                selected.append("resume_review")

        if any(w in lower for w in ["tailor resume", "resume tailor", "job description", "tailored resume"]):
            if "resume_tailor" not in selected:
                selected.append("resume_tailor")

        if any(w in lower for w in ["recruiter", "outreach", "cold message"]):
            if "recruiter_outreach" not in selected:
                selected.append("recruiter_outreach")

        if any(w in lower for w in ["quota", "credits", "my plan", "usage", "remaining usage"]):
            if "user_account" not in selected:
                selected.append("user_account")

        # 3. Overall dashboard / cross-tool aggregation queries need all primary tables
        if any(w in lower for w in ["dashboard", "overall progress", "total creations", "across all tools", "all my stats", "compare my"]):
            for key in ["career_score", "job_tracker", "resume_review", "interview_coach", "linkedin"]:
                if key not in selected:
                    selected.append(key)

        # 4. Fallback based on primary intent
        if not selected and classification:
            intent_map = {
                "career_score": ["career_score"],
                "job_tracker": ["job_tracker"],
                "interview_coach": ["interview_coach"],
                "resume_review": ["resume_review"],
                "resume_tailor": ["resume_tailor"],
                "linkedin_optimizer": ["linkedin"],
                "recruiter_outreach": ["recruiter_outreach"],
                "write_email": ["email"],
                "account_status": ["user_account"],
                "dashboard_analytics": ["career_score", "job_tracker", "resume_review"],
            }
            selected = intent_map.get(classification.intent, ["career_score"])

        logger.info(
            "DatabaseTableSelector identified tables: %s (needs_multi_db: %s)",
            selected,
            len(selected) > 1,
        )
        return selected


# ------------------------------------------------------------------------------
# Node 2: Database Data Retriever & Dynamic Context Builder
# ------------------------------------------------------------------------------

class DatabaseContextBuilder:
    """Fetches user records from PostgreSQL and builds relational augmented context."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        self.database_url = database_url or settings.DATABASE_URL
        self._pool: Optional[asyncpg.Pool] = None

    async def get_connection_pool(self) -> Optional[asyncpg.Pool]:
        """Lazy initializer for asyncpg connection pool."""
        if self._pool is None and self.database_url:
            try:
                self._pool = await asyncpg.create_pool(
                    dsn=self.database_url,
                    min_size=1,
                    max_size=5,
                    command_timeout=10,
                )
                logger.info("Connected to PostgreSQL via asyncpg pool.")
            except Exception as exc:
                logger.warning("Failed to initialize asyncpg pool (%s). Will use payload fallback.", exc)
                self._pool = None
        return self._pool

    async def fetch_user_records(
        self,
        user_id: str,
        tables: List[str],
        fallback_user_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Retrieves user records for all selected tables from PostgreSQL or payload fallback."""
        records: Dict[str, Any] = {}
        pool = await self.get_connection_pool()

        if pool is not None and user_id:
            try:
                async with pool.acquire() as conn:
                    for table_key in tables:
                        records[table_key] = await self._query_table(conn, user_id, table_key)
                if any(bool(v) for v in records.values()):
                    return records
            except Exception as exc:
                logger.warning("Direct DB query failed (%s); falling back to payload context.", exc)

        # Fallback / supplement from user_info payload
        if fallback_user_info:
            fallback_records = self._extract_from_payload(fallback_user_info, tables)
            for k, v in fallback_records.items():
                if not records.get(k):
                    records[k] = v

        return records

    async def _query_table(
        self,
        conn: asyncpg.Connection,
        user_id: str,
        table_key: str,
    ) -> List[Dict[str, Any]]:
        """Executes targeted SQL query against Neon PostgreSQL for the specific table."""
        meta = DATABASE_SCHEMA_METADATA.get(table_key)
        if not meta:
            return []

        table_name = meta["table"]
        type_filter = meta["type_filter"]

        if table_name == "creations":
            if type_filter:
                rows = await conn.fetch(
                    """
                    SELECT id, type, prompt, content, created_at
                    FROM creations
                    WHERE user_id = $1 AND type = $2
                    ORDER BY created_at DESC
                    LIMIT 20
                    """,
                    user_id,
                    type_filter,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, type, prompt, content, created_at
                    FROM creations
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 25
                    """,
                    user_id,
                )
            return [self._format_creation_row(r) for r in rows]

        elif table_name == "job_applications":
            rows = await conn.fetch(
                """
                SELECT id, company, role, status, applied_date, next_action, next_action_date, notes, recruiter_name, created_at
                FROM job_applications
                WHERE user_id = $1
                ORDER BY updated_at DESC
                LIMIT 50
                """,
                user_id,
            )
            return [dict(r) for r in rows]

        elif table_name == "job_application_activities":
            rows = await conn.fetch(
                """
                SELECT id, application_id, type, previous_status, new_status, note, created_at
                FROM job_application_activities
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 30
                """,
                user_id,
            )
            return [dict(r) for r in rows]

        elif table_name == "job_search_insights":
            rows = await conn.fetch(
                """
                SELECT id, summary, analysis_json, data_quality, created_at
                FROM job_search_insights
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 5
                """,
                user_id,
            )
            return [dict(r) for r in rows]

        return []

    def _format_creation_row(self, row: Any) -> Dict[str, Any]:
        """Parses JSON content string inside creations table into structured dictionary."""
        d = dict(row)
        content_val = d.get("content")
        if isinstance(content_val, str):
            try:
                d["parsed_content"] = json.loads(content_val)
            except Exception:
                d["parsed_content"] = content_val
        else:
            d["parsed_content"] = content_val
        return d

    def _extract_from_payload(
        self,
        user_info: Dict[str, Any],
        tables: List[str],
    ) -> Dict[str, Any]:
        """Extracts table data from request.user_info when direct DB connection is offline."""
        records: Dict[str, Any] = {}
        feature_history = user_info.get("feature_history", {})
        job_applications = user_info.get("job_applications", [])

        type_to_feature = {
            "career_score": "career_score",
            "resume_review": "resume_review",
            "resume_tailor": "resume_tailor",
            "linkedin": "linkedin",
            "recruiter_outreach": "recruiter_outreach",
            "interview_coach": "interview_coach",
            "email": "email",
        }

        for table_key in tables:
            if table_key in type_to_feature:
                feat_key = type_to_feature[table_key]
                items = feature_history.get(feat_key, [])
                parsed_items = []
                for item in items:
                    if isinstance(item, dict):
                        content_val = item.get("content")
                        if isinstance(content_val, str):
                            try:
                                item["parsed_content"] = json.loads(content_val)
                            except Exception:
                                item["parsed_content"] = content_val
                    parsed_items.append(item)
                records[table_key] = parsed_items
            elif table_key == "job_tracker":
                records["job_tracker"] = job_applications
            elif table_key == "user_account":
                records["user_account"] = [{
                    "plan": user_info.get("plan", "free"),
                    "free_usage": user_info.get("free_usage", 0),
                    "remaining_free_usage": user_info.get("remaining_free_usage", 5),
                }]

        # Supplement from recent_creations if feature_history was empty for any requested table
        recent_creations = user_info.get("recent_creations", [])
        if recent_creations:
            creation_type_map = {
                "career-score": "career_score",
                "career_score": "career_score",
                "resume-review": "resume_review",
                "resume_review": "resume_review",
                "resume-tailor": "resume_tailor",
                "resume_tailor": "resume_tailor",
                "linkedin-optimizer": "linkedin",
                "linkedin": "linkedin",
                "recruiter-outreach": "recruiter_outreach",
                "recruiter_outreach": "recruiter_outreach",
                "interview-session": "interview_coach",
                "interview_coach": "interview_coach",
                "email": "email",
            }
            for c in recent_creations:
                if isinstance(c, dict):
                    mapped = creation_type_map.get(c.get("type", ""))
                    if mapped and mapped in tables:
                        if not records.get(mapped):
                            records[mapped] = []
                        c_copy = dict(c)
                        c_val = c_copy.get("content")
                        if isinstance(c_val, str):
                            try:
                                c_copy["parsed_content"] = json.loads(c_val)
                            except Exception:
                                c_copy["parsed_content"] = c_val
                        else:
                            c_copy["parsed_content"] = c_val
                        records[mapped].append(c_copy)

        return records

    def build_relational_context(
        self,
        records: Dict[str, Any],
        query: str,
    ) -> str:
        """Constructs an integrated, relational text summary of fetched database records."""
        sections: List[str] = []
        lower = query.lower()

        # 1. Career Profile Score Analysis
        if "career_score" in records and records["career_score"]:
            cs_list = records["career_score"]
            latest = cs_list[0]
            parsed = latest.get("parsed_content") or {}
            score_val = (parsed.get("overallScore") or parsed.get("score") or "N/A") if isinstance(parsed, dict) else "N/A"
            categories = (parsed.get("categoryScores") or parsed.get("categories") or {}) if isinstance(parsed, dict) else {}

            # Calculate mathematical statistics if requested
            all_scores = []
            for item in cs_list:
                p = item.get("parsed_content") or {}
                if isinstance(p, dict):
                    s = p.get("overallScore") or p.get("score")
                    if isinstance(s, (int, float)):
                        all_scores.append(s)

            avg_score = (sum(all_scores) / len(all_scores)) if all_scores else None

            cs_lines = [
                f"[DATABASE TABLE: creations (type='career-score')]",
                f"- Latest Career Profile Score: {score_val}/100",
            ]
            if categories:
                cs_lines.append(f"- Category Breakdown: {json.dumps(categories)}")
            if avg_score is not None and ("average" in lower or "mean" in lower or "history" in lower):
                cs_lines.append(f"- Historical Average Score (across {len(all_scores)} entries): {avg_score:.1f}/100")
                cs_lines.append(f"- Score History Values: {all_scores}")

            sections.append("\n".join(cs_lines))

        # 2. Job Tracker Analysis
        if "job_tracker" in records and records["job_tracker"]:
            apps = records["job_tracker"]
            status_counts: Dict[str, int] = {}
            for app in apps:
                st = app.get("status", "Saved")
                status_counts[st] = status_counts.get(st, 0) + 1

            app_lines = [
                f"[DATABASE TABLE: job_applications] (Total Tracked: {len(apps)})",
                f"- Status Distribution: {json.dumps(status_counts)}",
                "- Recent Tracked Applications:",
            ]
            for app in apps[:10]:
                company = app.get("company", "Unknown")
                role = app.get("role", "Unknown")
                st = app.get("status", "Saved")
                applied = app.get("applied_date") or app.get("created_at") or "Not dated"
                next_act = app.get("next_action") or "None"
                app_lines.append(f"  * Company: {company} | Role: {role} | Status: {st} | Applied: {applied} | Next Action: {next_act}")

            sections.append("\n".join(app_lines))

        # 3. Resume Review Analysis
        if "resume_review" in records and records["resume_review"]:
            reviews = records["resume_review"]
            rr_lines = [f"[DATABASE TABLE: creations (type='resume-review')] (Found {len(reviews)} reviews)"]
            for idx, r in enumerate(reviews[:3], 1):
                p = r.get("parsed_content")
                if p is None:
                    p = r.get("content") or {}
                created = r.get("created_at")
                date_str = f" ({created})" if created else ""

                if isinstance(p, dict):
                    ats = p.get("atsScore") or p.get("score") or "N/A"
                    strengths = p.get("strengths") or []
                    improvements = p.get("improvements") or p.get("weaknesses") or p.get("drawbacks") or []
                    advice = p.get("actionableAdvice") or p.get("recommendations") or []
                    rr_lines.append(f"  * Review #{idx}{date_str}: ATS Score: {ats}")
                    if strengths:
                        rr_lines.append(f"    - Strengths: {strengths if isinstance(strengths, str) else json.dumps(strengths[:5])}")
                    if improvements:
                        rr_lines.append(f"    - Weaknesses / Drawbacks / Areas for Improvement: {improvements if isinstance(improvements, str) else json.dumps(improvements[:5])}")
                    if advice:
                        rr_lines.append(f"    - Actionable Advice: {advice if isinstance(advice, str) else json.dumps(advice[:5])}")
                elif isinstance(p, str):
                    clean_text = p.strip()
                    rr_lines.append(f"  * Review #{idx}{date_str} Assessment & Drawbacks:\n{clean_text[:2500]}")
            sections.append("\n".join(rr_lines))

        # 4. Resume Tailor Analysis
        if "resume_tailor" in records and records["resume_tailor"]:
            tailors = records["resume_tailor"]
            rt_lines = [f"[DATABASE TABLE: creations (type='resume-tailor')] (Found {len(tailors)} tailored resumes)"]
            for idx, t in enumerate(tailors[:3], 1):
                p = t.get("parsed_content")
                if p is None:
                    p = t.get("content") or {}
                if isinstance(p, dict):
                    match = p.get("matchScore") or "N/A"
                    skills = p.get("matchedSkills") or p.get("skills") or []
                    rt_lines.append(f"  * Tailor #{idx}: Match Score: {match}% | Key Skills: {skills[:4]}")
                elif isinstance(p, str):
                    rt_lines.append(f"  * Tailor #{idx} Content:\n{p[:1000]}")
            sections.append("\n".join(rt_lines))

        # 5. LinkedIn Optimizer Analysis
        if "linkedin" in records and records["linkedin"]:
            opts = records["linkedin"]
            li_lines = [f"[DATABASE TABLE: creations (type='linkedin-optimizer')] (Found {len(opts)} optimizations)"]
            for idx, o in enumerate(opts[:3], 1):
                p = o.get("parsed_content")
                if p is None:
                    p = o.get("content") or {}
                if isinstance(p, dict):
                    headline = p.get("headline") or (p.get("headlines")[0] if isinstance(p.get("headlines"), list) and p.get("headlines") else "Optimized Headline")
                    li_lines.append(f"  * Optimization #{idx}: Headline: '{headline}'")
                elif isinstance(p, str):
                    li_lines.append(f"  * Optimization #{idx}: {p[:300]}")
            sections.append("\n".join(li_lines))

        # 6. AI Interview Coach Analysis
        if "interview_coach" in records and records["interview_coach"]:
            sessions = records["interview_coach"]
            ic_lines = [f"[DATABASE TABLE: creations (type='interview-session')] (Found {len(sessions)} sessions)"]
            for idx, s in enumerate(sessions[:3], 1):
                p = s.get("parsed_content")
                if p is None:
                    p = s.get("content") or {}
                if isinstance(p, dict):
                    score = p.get("score") or p.get("overallScore") or "N/A"
                    strengths = p.get("strengths") or []
                    weaknesses = p.get("weaknesses") or p.get("areasForImprovement") or []
                    ic_lines.append(f"  * Session #{idx}: Score: {score} | Strengths: {strengths[:3]} | Weaknesses: {weaknesses[:3]}")
                elif isinstance(p, str):
                    ic_lines.append(f"  * Session #{idx}: {p[:1000]}")
            sections.append("\n".join(ic_lines))

        # 7. Recruiter Outreach Analysis
        if "recruiter_outreach" in records and records["recruiter_outreach"]:
            outreach = records["recruiter_outreach"]
            ro_lines = [f"[DATABASE TABLE: creations (type='recruiter-outreach')] (Found {len(outreach)} messages)"]
            for idx, o in enumerate(outreach[:3], 1):
                p = o.get("parsed_content")
                if p is None:
                    p = o.get("content") or {}
                if isinstance(p, dict):
                    subj = p.get("subject") or "Outreach Message"
                    ro_lines.append(f"  * Message #{idx}: Subject: '{subj}'")
                elif isinstance(p, str):
                    ro_lines.append(f"  * Message #{idx}: {p[:300]}")
            sections.append("\n".join(ro_lines))

        # 8. User Account Analysis
        if "user_account" in records and records["user_account"]:
            acc = records["user_account"][0]
            sections.append(
                f"[DATABASE TABLE: user_account]\n"
                f"- Plan: {acc.get('plan', 'free').upper()} | Free Usage: {acc.get('free_usage', 0)}/5 credits | Remaining: {acc.get('remaining_free_usage', 5)} credits"
            )

        if not sections:
            return "No previous user database records found for the requested features."

        return "\n\n".join(sections)

    def build_augmented_prompt(
        self,
        system_prompt: str,
        user_query: str,
        db_context: str,
        retrieval_context: str = "",
    ) -> str:
        """Combines system instructions, database records, and retrieval text into an augmented prompt."""
        prompt_parts = [
            system_prompt,
            "\n### VERIFIED USER DATABASE CONTEXT:",
            "Use the following real user database records to accurately answer the user's inquiry.",
            "If the user asks for calculations (like average scores, trends, or counts), perform the math based strictly on this verified data.",
            db_context,
        ]

        if retrieval_context.strip():
            prompt_parts.extend([
                "\n### PLATFORM KNOWLEDGE BASE CONTEXT:",
                retrieval_context,
            ])

        prompt_parts.extend([
            "\n### USER INQUIRY:",
            user_query,
            "\nAnswer clearly, accurately referencing the user's specific database history:",
        ])

        return "\n".join(prompt_parts)


# ------------------------------------------------------------------------------
# Combined Database Retrieval Service Facade
# ------------------------------------------------------------------------------

class DatabaseRetrievalService:
    """Unified service orchestrating table selection and database context synthesis."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        self.selector = DatabaseTableSelector()
        self.builder = DatabaseContextBuilder(database_url=database_url)

    def select_tables(
        self,
        query: str,
        classification: Optional[ClassificationResult] = None,
    ) -> List[str]:
        """Node 1: Selects which database tables are needed."""
        return self.selector.select_tables(query=query, classification=classification)

    async def fetch_and_build_context(
        self,
        user_id: str,
        query: str,
        tables: List[str],
        fallback_user_info: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Node 2: Fetches records and formats relational database context."""
        records = await self.builder.fetch_user_records(
            user_id=user_id,
            tables=tables,
            fallback_user_info=fallback_user_info,
        )
        return self.builder.build_relational_context(records=records, query=query)
