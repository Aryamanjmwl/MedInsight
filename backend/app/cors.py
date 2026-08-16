import os
from collections.abc import Sequence

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

CORS_ORIGINS_ENV_VAR = "MEDINSIGHT_CORS_ORIGINS"
DEFAULT_CORS_ORIGINS = (
    "http://localhost:8081",
    "http://127.0.0.1:8081",
)
CORS_ALLOWED_METHODS = ("GET", "POST", "OPTIONS")
CORS_ALLOWED_HEADERS = ("Accept", "Content-Type")


def parse_cors_origins(value: str) -> list[str]:
    """Parse a comma-separated origin list while preserving input order."""
    origins: list[str] = []
    seen: set[str] = set()

    for item in value.split(","):
        origin = item.strip()
        if origin == "*":
            raise ValueError("Wildcard CORS origins are not supported.")
        if origin and origin not in seen:
            seen.add(origin)
            origins.append(origin)

    return origins


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv(CORS_ORIGINS_ENV_VAR)
    if configured_origins is None:
        return list(DEFAULT_CORS_ORIGINS)
    return parse_cors_origins(configured_origins)


def configure_cors(
    application: FastAPI,
    allowed_origins: Sequence[str] | None = None,
) -> None:
    origins = get_cors_origins() if allowed_origins is None else list(allowed_origins)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=list(CORS_ALLOWED_METHODS),
        allow_headers=list(CORS_ALLOWED_HEADERS),
    )
