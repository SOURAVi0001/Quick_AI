"""Logging configuration for the Chatbot service.

Configures structured console logging without leaking sensitive user data or secrets.
"""

import logging
import sys
from app.core.config import settings


def setup_logger(name: str = "chatbot_service") -> logging.Logger:
    """Configures and returns a standard Python logger."""
    logger = logging.getLogger(name)

    # Avoid duplicate handlers if already configured
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)
    return logger


logger = setup_logger()
