"""Unit tests for Database Retrieval and Relational Context Service."""

import pytest
from app.services.classifier import ClassificationResult
from app.services.db_retriever import (
    DatabaseTableSelector,
    DatabaseContextBuilder,
    DatabaseRetrievalService,
    DATABASE_SCHEMA_METADATA,
)


def test_schema_metadata_complete():
    """Verifies that all primary database entities are documented in schema metadata."""
    expected_tables = [
        "career_score", "resume_review", "resume_tailor", "linkedin",
        "recruiter_outreach", "interview_coach", "email", "job_tracker",
        "job_activities", "job_insights", "user_account"
    ]
    for tbl in expected_tables:
        assert tbl in DATABASE_SCHEMA_METADATA
        assert "table" in DATABASE_SCHEMA_METADATA[tbl]
        assert "columns" in DATABASE_SCHEMA_METADATA[tbl]


def test_select_single_table_career_score():
    """Verifies table selection for a single-domain career score query."""
    selector = DatabaseTableSelector()
    classification = ClassificationResult(
        is_relevant=True,
        category="project_status",
        intent="career_score",
        requires_db=True,
        reason="Career score query.",
        confidence=0.95,
    )
    tables = selector.select_tables("What is my latest career score?", classification)
    assert "career_score" in tables
    assert len(tables) == 1


def test_select_single_table_job_tracker():
    """Verifies table selection for job tracker inquiries."""
    selector = DatabaseTableSelector()
    classification = ClassificationResult(
        is_relevant=True,
        category="project_status",
        intent="job_tracker",
        requires_db=True,
        reason="Job tracker query.",
        confidence=0.95,
    )
    tables = selector.select_tables("Which companies have I applied to?", classification)
    assert "job_tracker" in tables


def test_select_multi_tables_relational_query():
    """Verifies relational queries needing multiple tables (e.g. LinkedIn + Career Score)."""
    selector = DatabaseTableSelector()
    classification = ClassificationResult(
        is_relevant=True,
        category="project_status",
        intent="career_score",
        requires_db=True,
        needs_multi_db=True,
        required_tables=["career_score", "linkedin"],
        reason="Relational query across LinkedIn and career score.",
        confidence=0.95,
    )
    query = "How do my LinkedIn optimizations impact my overall career profile score?"
    tables = selector.select_tables(query, classification)

    assert "career_score" in tables
    assert "linkedin" in tables
    assert len(tables) >= 2


def test_select_multi_tables_interview_and_resume():
    """Verifies multi-table selection for interview feedback and resume review."""
    selector = DatabaseTableSelector()
    query = "Compare my mock interview weaknesses with my resume review feedback."
    tables = selector.select_tables(query)

    assert "interview_coach" in tables
    assert "resume_review" in tables
    assert len(tables) >= 2


def test_build_relational_context_career_score_average():
    """Verifies statistical calculation (average) over career score records."""
    builder = DatabaseContextBuilder()
    mock_records = {
        "career_score": [
            {
                "parsed_content": {
                    "overallScore": 85,
                    "categoryScores": {"resume": 80, "linkedin": 90},
                }
            },
            {
                "parsed_content": {
                    "overallScore": 75,
                    "categoryScores": {"resume": 70, "linkedin": 80},
                }
            },
        ]
    }
    context = builder.build_relational_context(
        records=mock_records,
        query="What is the average of my previous career scores?",
    )

    assert "85/100" in context
    assert "80.0/100" in context  # (85 + 75) / 2 = 80.0
    assert "creations (type='career-score')" in context


def test_build_relational_context_job_tracker_status():
    """Verifies job tracker applications context and status distribution."""
    builder = DatabaseContextBuilder()
    mock_records = {
        "job_tracker": [
            {"company": "Google", "role": "SWE", "status": "Interviewing", "applied_date": "2026-10-01"},
            {"company": "Meta", "role": "Fullstack", "status": "Applied", "applied_date": "2026-10-05"},
            {"company": "Amazon", "role": "Backend", "status": "Applied", "applied_date": "2026-10-08"},
        ]
    }
    context = builder.build_relational_context(
        records=mock_records,
        query="Which companies did I apply to?",
    )

    assert "Google" in context
    assert "Meta" in context
    assert "Amazon" in context
    assert "Applied" in context


def test_build_augmented_prompt():
    """Verifies synthesis of system prompt, DB records, and user query into augmented prompt."""
    builder = DatabaseContextBuilder()
    system_prompt = "You are Fizzi AI."
    user_query = "What companies did I apply to?"
    db_context = "[DATABASE TABLE: job_applications]\n* Company: Google | Status: Interviewing"

    augmented = builder.build_augmented_prompt(
        system_prompt=system_prompt,
        user_query=user_query,
        db_context=db_context,
        retrieval_context="Quick.AI Job Tracker documentation.",
    )

    assert "You are Fizzi AI." in augmented
    assert "VERIFIED USER DATABASE CONTEXT:" in augmented
    assert "Google | Status: Interviewing" in augmented
    assert "What companies did I apply to?" in augmented


@pytest.mark.asyncio
async def test_facade_service_fallback_extraction():
    """Verifies DatabaseRetrievalService retrieves from user_info payload fallback."""
    service = DatabaseRetrievalService()
    fallback_user_info = {
        "plan": "premium",
        "feature_history": {
            "career_score": [
                {"content": '{"overallScore": 92, "categoryScores": {"resume": 90}}'}
            ],
            "linkedin": [
                {"content": '{"headline": "Senior AI Platform Engineer"}'}
            ]
        },
        "job_applications": [
            {"company": "OpenAI", "role": "Research Engineer", "status": "Offered"}
        ]
    }

    tables = ["career_score", "linkedin", "job_tracker"]
    context = await service.fetch_and_build_context(
        user_id="user_test_123",
        query="What is my career score, linkedin headline, and job offers?",
        tables=tables,
        fallback_user_info=fallback_user_info,
    )

    assert "92/100" in context
    assert "Senior AI Platform Engineer" in context
    assert "OpenAI" in context
    assert "Offered" in context
