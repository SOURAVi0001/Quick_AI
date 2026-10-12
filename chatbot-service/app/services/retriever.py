"""Context retrieval service implementing semantic RAG and user context isolation.

Supports dual-source retrieval:
1. Application Knowledge Base (vector search over documentation & change logs)
2. User Context Store (strictly filtered by authenticated user identity and application)
"""

import json
import math
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
from pydantic import BaseModel, Field

from app.core.config import settings
from app.utils.logging import logger


class RetrievedDocument(BaseModel):
    """Represents a retrieved application document with similarity score."""

    document_id: str
    application_id: str
    source: str
    content: str
    updated_at: str
    metadata: Optional[Dict[str, Any]] = None
    similarity_score: float = Field(..., ge=0.0, le=1.0)


class UserContextRecord(BaseModel):
    """Authorized user-specific records."""

    user_id: str
    application_id: str
    full_name: str
    role: str = "Member"
    email: Optional[str] = None
    plan: str = "free"
    free_usage: Union[int, str] = 0
    max_free_usage: Union[int, str] = 5
    remaining_free_usage: Union[int, str] = 5
    total_creations: int = 0
    recent_creations: List[Dict[str, Any]] = Field(default_factory=list)
    associated_projects: List[Dict[str, Any]] = Field(default_factory=list)
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)
    relevant_historical_changes: List[str] = Field(default_factory=list)


class RetrievalResult(BaseModel):
    """Consolidated context retrieval payload."""

    query: str
    documents: List[RetrievedDocument] = Field(default_factory=list)
    user_context: Optional[UserContextRecord] = None
    is_sufficient: bool = True
    retrieval_mode: str = "mock_vector_index"
    top_score: float = 0.0


# ------------------------------------------------------------------------------
# Embedding Model Abstraction
# ------------------------------------------------------------------------------

class BaseEmbeddingModel(ABC):
    """Abstract interface for generating vector embeddings."""

    @abstractmethod
    def embed_text(self, text: str) -> np.ndarray:
        """Embeds a single string into a 1D normalized numpy array."""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Embeds a list of strings into a 2D matrix of shape (N, D)."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Returns the identifier of the embedding model."""
        pass


class MockEmbeddingModel(BaseEmbeddingModel):
    """Deterministic, zero-dependency embedding model.

    Generates dense normalized semantic vectors based on character and token n-grams.
    Clearly identified as 'mock_vector_index' so mock retrieval is not disguised
    as a black-box deep learning model.
    """

    def __init__(self, dimension: int = 128):
        self.dimension = dimension

    @property
    def name(self) -> str:
        return "mock_vector_index"

    def embed_text(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dimension, dtype=np.float32)
        words = re.findall(r"\w+", text.lower())
        if not words:
            return vec

        # Project token hashes deterministically onto vector space
        for word in words:
            h = hash(word)
            idx = abs(h) % self.dimension
            sign = 1.0 if (h % 2 == 0) else -1.0
            vec[idx] += sign

        # Add subword / character trigram projections for soft semantic matching
        for word in words:
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    trigram = word[i : i + 3]
                    th = hash(trigram)
                    idx = abs(th) % self.dimension
                    vec[idx] += 0.5 * (1.0 if th % 2 == 0 else -1.0)

        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec /= norm
        return vec

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        return np.vstack([self.embed_text(t) for t in texts])


# ------------------------------------------------------------------------------
# In-Memory Vector Store
# ------------------------------------------------------------------------------

class InMemoryVectorStore:
    """Simple in-memory vector index supporting cosine similarity search."""

    def __init__(self, embedding_model: BaseEmbeddingModel):
        self.embedding_model = embedding_model
        self.documents: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Indexes application documents and computes their vector embeddings."""
        self.documents = documents
        if not documents:
            self.embeddings = None
            return

        texts = [doc["content"] for doc in documents]
        self.embeddings = self.embedding_model.embed_batch(texts)
        logger.info(
            "Indexed %d documents using embedding model: %s",
            len(documents),
            self.embedding_model.name,
        )

    def search(
        self,
        query: str,
        application_id: str,
        top_k: int = 5,
    ) -> List[RetrievedDocument]:
        """Performs cosine similarity search over indexed documents."""
        if self.embeddings is None or len(self.documents) == 0:
            return []

        query_vec = self.embedding_model.embed_text(query)
        q_norm = np.linalg.norm(query_vec)
        if q_norm < 1e-9:
            return []

        # Cosine similarity dot product: embeddings are already L2-normalized
        scores = np.dot(self.embeddings, query_vec)

        # Build candidate results filtered by application_id
        results: List[RetrievedDocument] = []
        for idx, score in enumerate(scores):
            doc = self.documents[idx]
            if doc.get("application_id") != application_id:
                continue

            # Convert to float and clip to [0.0, 1.0]
            sim = float(max(0.0, min(1.0, score)))
            results.append(
                RetrievedDocument(
                    document_id=doc["document_id"],
                    application_id=doc["application_id"],
                    source=doc.get("source", "application_documentation"),
                    content=doc["content"],
                    updated_at=doc.get("updated_at", ""),
                    metadata=doc.get("metadata"),
                    similarity_score=round(sim, 4),
                )
            )

        # Sort descending by similarity score and take top_k
        results.sort(key=lambda d: d.similarity_score, reverse=True)
        return results[:top_k]


# ------------------------------------------------------------------------------
# Context Retriever Orchestrator
# ------------------------------------------------------------------------------

class ContextRetriever:
    """Coordinates semantic retrieval across knowledge base and authorized user data."""

    def __init__(
        self,
        knowledge_base_path: Optional[Path] = None,
        user_context_path: Optional[Path] = None,
        embedding_model: Optional[BaseEmbeddingModel] = None,
    ):
        self.kb_path = knowledge_base_path or settings.KNOWLEDGE_BASE_PATH
        self.user_path = user_context_path or settings.USER_CONTEXT_PATH

        # Initialize embedding model (Mock by default, replaceable with SentenceTransformers)
        self.embedding_model = embedding_model or MockEmbeddingModel()
        self.vector_store = InMemoryVectorStore(self.embedding_model)

        # In-memory stores
        self._raw_kb_data: List[Dict[str, Any]] = []
        self._raw_user_data: Dict[str, Dict[str, Any]] = {}

        self._load_datasets()

    def _load_datasets(self) -> None:
        """Loads dummy data from JSON files and populates vector index."""
        if self.kb_path.exists():
            with open(self.kb_path, "r", encoding="utf-8") as f:
                self._raw_kb_data = json.load(f)
            self.vector_store.add_documents(self._raw_kb_data)
        else:
            logger.warning("Knowledge base file not found at %s", self.kb_path)

        if self.user_path.exists():
            with open(self.user_path, "r", encoding="utf-8") as f:
                self._raw_user_data = json.load(f)
        else:
            logger.warning("User context file not found at %s", self.user_path)

    def retrieve_context(
        self,
        rewritten_query: str,
        user_id: str,
        application_id: str,
        top_k: Optional[int] = None,
        min_threshold: Optional[float] = None,
        dynamic_user_info: Optional[Dict[str, Any]] = None,
    ) -> RetrievalResult:
        """Executes retrieval for both application knowledge and authorized user context."""
        k = top_k or settings.RETRIEVAL_TOP_K
        threshold = min_threshold or settings.RETRIEVAL_MIN_SIMILARITY_THRESHOLD

        logger.info(
            "Retrieving context for query='%s', user_id='%s', app='%s', top_k=%d",
            rewritten_query,
            user_id,
            application_id,
            k,
        )

        # 1. Semantic search on application documents
        retrieved_docs = self.vector_store.search(
            query=rewritten_query,
            application_id=application_id,
            top_k=k,
        )

        # 2. Retrieve authorized user-specific context (dynamic or stored)
        user_record = self._get_authorized_user_context(
            user_id=user_id,
            application_id=application_id,
            query=rewritten_query,
            dynamic_user_info=dynamic_user_info,
        )

        # 3. Determine if sufficient context was found
        top_score = retrieved_docs[0].similarity_score if retrieved_docs else 0.0
        has_sufficient_docs = top_score >= threshold
        has_user_info = user_record is not None

        # If neither application docs exceed threshold nor user context is relevant,
        # we mark context as insufficient rather than fabricating answers
        is_sufficient = has_sufficient_docs or has_user_info

        return RetrievalResult(
            query=rewritten_query,
            documents=retrieved_docs,
            user_context=user_record,
            is_sufficient=is_sufficient,
            retrieval_mode=self.embedding_model.name,
            top_score=top_score,
        )

    def _get_authorized_user_context(
        self,
        user_id: str,
        application_id: str,
        query: str,
        dynamic_user_info: Optional[Dict[str, Any]] = None,
    ) -> Optional[UserContextRecord]:
        """Retrieves and filters user records strictly matching user_id and application_id."""
        user_data = None
        if dynamic_user_info and isinstance(dynamic_user_info, dict):
            # If dynamic user info was provided in request, verify user_id match
            provided_id = str(dynamic_user_info.get("user_id", "")).strip()
            if not provided_id or provided_id == user_id:
                user_data = dynamic_user_info.copy()
                if "user_id" not in user_data:
                    user_data["user_id"] = user_id
                if "application_id" not in user_data:
                    user_data["application_id"] = application_id

        if not user_data:
            user_data = self._raw_user_data.get(user_id)

        if not user_data:
            return None

        # Verify application isolation
        doc_app = str(user_data.get("application_id", "")).lower()
        target_app = str(application_id).lower()
        if doc_app and target_app and doc_app != target_app:
            logger.warning("User %s does not belong to application %s", user_id, application_id)
            return None

        # Check if query pertains to user stats, creations, plans, usage, activity
        query_lower = query.lower()
        user_related_terms = [
            "task", "tasks", "alpha", "completed", "progress", "my", "mine", "me",
            "status", "recent", "activity", "pending", "member", "project",
            "plan", "free", "premium", "usage", "quota", "limit", "creation",
            "creations", "article", "image", "title", "resume", "history",
            "account", "profile", "alex", "sarah", "alice", "remaining", "total",
            "publish", "liked", "generation", "generations", "left", "credit", "credits",
            "tier", "upgrade", "subscription", "allowance", "how many"
        ]
        is_query_user_relevant = any(term in query_lower for term in user_related_terms)

        if not is_query_user_relevant and not dynamic_user_info:
            return None

        return UserContextRecord(
            user_id=user_data.get("user_id", user_id),
            application_id=user_data.get("application_id", application_id),
            full_name=user_data.get("full_name", "User"),
            role=user_data.get("role", "Member"),
            email=user_data.get("email"),
            plan=user_data.get("plan", "free"),
            free_usage=user_data.get("free_usage", 0),
            max_free_usage=user_data.get("max_free_usage", 5),
            remaining_free_usage=user_data.get("remaining_free_usage", 5),
            total_creations=user_data.get("total_creations", len(user_data.get("recent_creations", []))),
            recent_creations=user_data.get("recent_creations", []),
            associated_projects=user_data.get("associated_projects", []),
            recent_activity=user_data.get("recent_activity", []),
            relevant_historical_changes=user_data.get("relevant_historical_changes", []),
        )
