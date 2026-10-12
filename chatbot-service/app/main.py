"""FastAPI Application Entry Point for ProjectHub Chatbot Backend."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import api_router
from app.core.config import settings
from app.utils.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Starting Quick.AI Chatbot Service (Env: %s)", settings.APP_ENV)
    logger.info("Configured LLM Provider: %s", settings.LLM_PROVIDER)
    logger.info("Supported Application: %s", settings.SUPPORTED_APPLICATION_ID)
    yield
    logger.info("Shutting down Quick.AI Chatbot Service.")


def create_application() -> FastAPI:
    """Factory creating and configuring the FastAPI app instance."""
    app = FastAPI(
        title="Quick.AI Chatbot Backend Service",
        description=(
            "Independent modular RAG chatbot backend for Quick.AI providing query classification, "
            "conversational rewriting, dual-source context retrieval, grounded LLM generation, "
            "and LLM-as-a-judge quality evaluation with strict guardrails."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    # Enable CORS for external web applications
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom validation error handler for consistent error format
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning("Request validation failed on %s", request.url.path)
        formatted_errors = [
            {"loc": err.get("loc"), "msg": err.get("msg"), "type": err.get("type")}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "status": "validation_error",
                "message": "Invalid request parameters.",
                "details": formatted_errors,
            },
        )

    # Mount API routers
    app.include_router(api_router)

    # Mount static frontend client directory if present
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    client_dir = Path(__file__).resolve().parent.parent / "client"
    if client_dir.exists():
        app.mount("/client", StaticFiles(directory=client_dir), name="client")

        @app.get("/", include_in_schema=False)
        async def serve_index():
            index_file = client_dir / "index.html"
            if index_file.exists():
                return FileResponse(index_file)
            return {"message": "ProjectHub Chatbot Backend is running."}

    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=(settings.APP_ENV.lower() == "development"),
    )
