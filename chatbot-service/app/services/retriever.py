"""Quick.AI Context Retrieval Service.

Implements semantic RAG search across application documentation, release logs,
and authorized user accounts under strict privacy isolation boundaries:
1. Application Knowledge Base: FAISS Vector index (IndexFlatIP) with dense neural embeddings.
2. User Context Isolation: Account quota, usage, and past creations records
   strictly scoped to authenticated user and application identity.
"""

import json
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import numpy as np
from pydantic import BaseModel, Field

from app.core.config import settings
from app.utils.logging import logger

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False


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
    """Authorized user-specific record containing account details and past creations."""

    user_id: str
    application_id: str
    full_name: str
    email: Optional[str] = None
    plan: str = "free"
    free_usage: Optional[Union[int, str]] = None
    max_free_usage: Optional[Union[int, str]] = None
    remaining_free_usage: Optional[Union[int, str]] = None
    total_creations: int = 0
    recent_creations: List[Dict[str, Any]] = Field(default_factory=list)
    associated_projects: List[Dict[str, Any]] = Field(default_factory=list)
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)
    relevant_historical_changes: List[str] = Field(default_factory=list)
    feature_history: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    job_applications: List[Dict[str, Any]] = Field(default_factory=list)


class RetrievalResult(BaseModel):
    """Consolidated context retrieval payload containing matched documents and user state."""

    query: str
    documents: List[RetrievedDocument] = Field(default_factory=list)
    user_context: Optional[UserContextRecord] = None
    is_sufficient: bool = True
    retrieval_mode: str = "faiss_index"
    top_score: float = 0.0


# ------------------------------------------------------------------------------
# Embedding Model Abstractions & Implementations
# ------------------------------------------------------------------------------

class BaseEmbeddingModel(ABC):
    """Abstract interface for generating dense semantic vector embeddings."""

    @abstractmethod
    def embed_text(self, text: str) -> np.ndarray:
        """Embeds a single text string into a 1D normalized vector."""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Embeds a list of strings into a 2D matrix of shape (N, dimension)."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Identifier of the embedding model."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Dimension of the embedding vector."""
        pass


class MockEmbeddingModel(BaseEmbeddingModel):
    """Deterministic, zero-dependency embedding model.

    Generates dense, L2-normalized vectors based on deterministic token hashing
    and character n-gram projections. Enables fully offline testing without external weights.
    """

    def __init__(self, dimension: int = 128) -> None:
        self._dim = dimension

    @property
    def name(self) -> str:
        return "mock_vector_index"

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_text(self, text: str) -> np.ndarray:
        """Computes deterministic normalized vector from word tokens and character trigrams."""
        vec = np.zeros(self._dim, dtype=np.float32)
        words = re.findall(r"\w+", text.lower())
        if not words:
            return vec

        # Project token hashes deterministically onto vector dimensions
        for word in words:
            h = hash(word)
            idx = abs(h) % self._dim
            sign = 1.0 if (h % 2 == 0) else -1.0
            vec[idx] += sign

        # Project character trigrams for soft morphological matching
        for word in words:
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    trigram = word[i : i + 3]
                    th = hash(trigram)
                    idx = abs(th) % self._dim
                    vec[idx] += 0.5 * (1.0 if th % 2 == 0 else -1.0)

        # L2-normalize vector to unit length for cosine dot product
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec /= norm
        return vec

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """Embeds multiple texts into an (N, D) normalized matrix."""
        return np.vstack([self.embed_text(t) for t in texts])


class SentenceTransformerEmbeddingModel(BaseEmbeddingModel):
    """Local, offline neural dense embedding model powered by SentenceTransformers.

    Defaults to 'BAAI/bge-small-en-v1.5' (384-dimensional unit-normalized embeddings).
    """

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5") -> None:
        from sentence_transformers import SentenceTransformer
        self.model_name = model_name
        get_dim_fn = getattr(self._model, "get_embedding_dimension", getattr(self._model, "get_sentence_embedding_dimension", lambda: 384))
        self._dim = int(get_dim_fn())
        logger.info("Loaded SentenceTransformer model '%s' (dim=%d)", model_name, self._dim)

    @property
    def name(self) -> str:
        return f"sentence_transformers_{self.model_name.replace('/', '_')}"

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_text(self, text: str) -> np.ndarray:
        emb = self._model.encode([text], normalize_embeddings=True)
        return np.asarray(emb[0], dtype=np.float32)

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self._dim), dtype=np.float32)
        emb = self._model.encode(texts, normalize_embeddings=True)
        return np.asarray(emb, dtype=np.float32)


class OpenRouterEmbeddingModel(BaseEmbeddingModel):
    """OpenRouter OpenAI-compatible cloud embedding model."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        from openai import OpenAI
        self.api_key = api_key or settings.OPENROUTER_API_KEY or ""
        self.model = model or settings.EMBEDDING_MODEL
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
        )
        self._dim = 1024

    @property
    def name(self) -> str:
        return f"openrouter_{self.model}"

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_text(self, text: str) -> np.ndarray:
        batch = self.embed_batch([text])
        return batch[0] if len(batch) > 0 else np.zeros(self._dim, dtype=np.float32)

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self._dim), dtype=np.float32)
        try:
            res = self.client.embeddings.create(
                model=self.model,
                input=texts,
                encoding_format="float",
            )
            vectors = [item.embedding for item in res.data]
            arr = np.asarray(vectors, dtype=np.float32)
            # L2 normalize
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms
            self._dim = arr.shape[1]
            return arr
        except Exception as exc:
            logger.error("OpenRouter embedding failed: %s", exc)
            raise


# ------------------------------------------------------------------------------
# FAISS Vector Store
# ------------------------------------------------------------------------------

class FAISSVectorStore:
    """Production-grade vector index powered by FAISS (IndexFlatIP) with L2 normalization."""

    def __init__(self, embedding_model: BaseEmbeddingModel) -> None:
        self.embedding_model = embedding_model
        self.documents: List[Dict[str, Any]] = []
        self.index = None
        self._fallback_embeddings = None
        self._dim = embedding_model.dimension

    @property
    def embeddings(self):
        """Backward-compatible property returning the underlying vector store."""
        return self.index if self.index is not None else self._fallback_embeddings

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Indexes application documents and populates the FAISS index."""
        if not documents:
            self.documents = []
            self.index = None
            return

        self.documents = list(documents)
        texts = [doc["content"] for doc in documents]
        embeddings = self.embedding_model.embed_batch(texts)

        if not FAISS_AVAILABLE:
            logger.warning("FAISS is not installed; operating in in-memory matrix fallback mode.")
            self._fallback_embeddings = embeddings
            return

        dim = embeddings.shape[1]
        self._dim = dim
        self.index = faiss.IndexFlatIP(dim)
        # Normalize vectors for Cosine Similarity equivalence in IndexFlatIP
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings)
        logger.info(
            "FAISS IndexFlatIP populated with %d documents (dim=%d, model=%s)",
            self.index.ntotal,
            dim,
            self.embedding_model.name,
        )

    def search(
        self,
        query: str,
        application_id: str,
        top_k: int = 5,
    ) -> List[RetrievedDocument]:
        """Executes cosine similarity search over indexed documents for target application."""
        if not self.documents:
            return []

        query_vec = self.embedding_model.embed_text(query).astype(np.float32)
        q_norm = np.linalg.norm(query_vec)
        if q_norm < 1e-9:
            return []

        query_batch = np.array([query_vec], dtype=np.float32)

        # FAISS search branch
        if FAISS_AVAILABLE and self.index is not None:
            faiss.normalize_L2(query_batch)
            # Retrieve extra candidates to allow post-filtering by application_id
            search_k = min(len(self.documents), max(top_k * 3, 10))
            scores, indices = self.index.search(query_batch, search_k)

            results: List[RetrievedDocument] = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0 or idx >= len(self.documents):
                    continue
                doc = self.documents[idx]
                if doc.get("application_id") != application_id:
                    continue

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
                if len(results) >= top_k:
                    break

            return results

        # In-Memory fallback if FAISS is not present
        if hasattr(self, "_fallback_embeddings") and self._fallback_embeddings is not None:
            norm_q = query_vec / q_norm
            scores = np.dot(self._fallback_embeddings, norm_q)
            results = []
            for idx, score in enumerate(scores):
                doc = self.documents[idx]
                if doc.get("application_id") != application_id:
                    continue
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
            results.sort(key=lambda d: d.similarity_score, reverse=True)
            return results[:top_k]

        return []


# Keep alias for backward compatibility
InMemoryVectorStore = FAISSVectorStore


# ------------------------------------------------------------------------------
# Markdown Documentation Chunker
# ------------------------------------------------------------------------------

def parse_markdown_documentation(doc_path: Path) -> List[Dict[str, Any]]:
    """Chunks structured markdown documentation into granular semantic blocks."""
    if not doc_path.exists():
        return []

    try:
        content = doc_path.read_text(encoding="utf-8")
        # Split on H2 (## ) and H3 (### ) headers
        sections = re.split(r'\n(?=#{2,3}\s+)', content)
        chunks: List[Dict[str, Any]] = []

        for idx, sec in enumerate(sections):
            text = sec.strip()
            if not text or len(text) < 50:
                continue

            first_line = text.split("\n")[0].replace("#", "").strip()
            chunks.append({
                "document_id": f"doc_guide_{idx}",
                "application_id": "quickai",
                "source": doc_path.name,
                "content": text,
                "updated_at": "2026-10-19",
                "metadata": {"title": first_line, "type": "documentation_guide"},
            })

        logger.info("Parsed %d semantic chunks from %s", len(chunks), doc_path.name)
        return chunks
    except Exception as exc:
        logger.warning("Failed to chunk markdown documentation at %s: %s", doc_path, exc)
        return []


# ------------------------------------------------------------------------------
# Model Factory
# ------------------------------------------------------------------------------

def get_default_embedding_model() -> BaseEmbeddingModel:
    """Instantiates embedding model based on settings with graceful fallbacks."""
    provider = settings.EMBEDDING_PROVIDER.lower().strip()

    if provider in ("sentence_transformers", "bge", "local"):
        try:
            return SentenceTransformerEmbeddingModel()
        except Exception as exc:
            logger.warning("Failed to load SentenceTransformer (%s); falling back to Mock", exc)

    elif provider == "openrouter" and settings.OPENROUTER_API_KEY:
        try:
            return OpenRouterEmbeddingModel()
        except Exception as exc:
            logger.warning("Failed to initialize OpenRouter embedding (%s); trying SentenceTransformer", exc)
            try:
                return SentenceTransformerEmbeddingModel()
            except Exception:
                pass

    return MockEmbeddingModel()


# ------------------------------------------------------------------------------
# Context Retriever Orchestrator
# ------------------------------------------------------------------------------

class ContextRetriever:
    """Coordinates dual-source retrieval across knowledge base and user account data."""

    def __init__(
        self,
        knowledge_base_path: Optional[Path] = None,
        user_context_path: Optional[Path] = None,
        embedding_model: Optional[BaseEmbeddingModel] = None,
        documentation_path: Optional[Path] = None,
    ) -> None:
        self.kb_path = knowledge_base_path or settings.KNOWLEDGE_BASE_PATH
        self.user_path = user_context_path or settings.USER_CONTEXT_PATH
        self.doc_path = documentation_path or settings.DOCUMENTATION_PATH

        self.embedding_model = embedding_model or get_default_embedding_model()
        self.vector_store = FAISSVectorStore(self.embedding_model)

        self._raw_kb_data: List[Dict[str, Any]] = []
        self._raw_user_data: Dict[str, Dict[str, Any]] = {}

        self._load_datasets()

    def _load_datasets(self) -> None:
        """Loads knowledge base JSON and markdown documentation into FAISS index."""
        all_docs: List[Dict[str, Any]] = []

        # 1. Load structured JSON knowledge base
        if self.kb_path.exists():
            with open(self.kb_path, "r", encoding="utf-8") as f:
                self._raw_kb_data = json.load(f)
            all_docs.extend(self._raw_kb_data)
        else:
            logger.warning("Knowledge base file not found at %s", self.kb_path)

        # 2. Ingest markdown documentation chunks if available
        if self.doc_path.exists():
            guide_chunks = parse_markdown_documentation(self.doc_path)
            all_docs.extend(guide_chunks)
        else:
            alt_path = self.kb_path.parent.parent.parent / "docs" / "quickai_documentation.md"
            if alt_path.exists():
                guide_chunks = parse_markdown_documentation(alt_path)
                all_docs.extend(guide_chunks)

        # 3. Add to FAISS Vector Store
        self.vector_store.add_documents(all_docs)

        # 4. Load User context JSON
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

        # 1. Semantic search across application documentation & change logs
        retrieved_docs = self.vector_store.search(
            query=rewritten_query,
            application_id=application_id,
            top_k=k,
        )

        # 2. Retrieve authorized user-specific context if query is account-related
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

        # Prioritize request-supplied dynamic user context if valid
        if dynamic_user_info and isinstance(dynamic_user_info, dict):
            provided_id = str(dynamic_user_info.get("user_id", "")).strip()
            if not provided_id or provided_id == user_id:
                user_data = dynamic_user_info.copy()
                user_data.setdefault("user_id", user_id)
                user_data.setdefault("application_id", application_id)

        # Fall back to loaded dataset
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

        # Accurate regex word boundary matching for user account cues (avoids matching 'i' in words)
        user_keyword_regex = re.compile(
            r"\b(my|mine|me|i|myself|account|profile|plan|tier|subscription|upgrade|"
            r"usage|quota|limit|allowance|remaining|left|credit|credits|creation|creations|"
            r"generation|generations|created|total|history|activity|recent|status|publish|liked|completed)\b",
            re.IGNORECASE,
        )
        is_query_user_relevant = bool(user_keyword_regex.search(query))

        if not is_query_user_relevant and not dynamic_user_info:
            return None

        return UserContextRecord(
            user_id=user_data.get("user_id", user_id),
            application_id=user_data.get("application_id", application_id),
            full_name=user_data.get("full_name", "User"),
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
            feature_history=user_data.get("feature_history", {}),
            job_applications=user_data.get("job_applications", []),
        )
