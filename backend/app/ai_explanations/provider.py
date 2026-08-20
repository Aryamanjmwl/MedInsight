import json
import os
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol, cast

import openai
from openai import OpenAI
from pydantic import ValidationError

from .models import BiomarkerExplanation, BiomarkerExplanationContext
from .prompt import EXPLANATION_INSTRUCTIONS

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_AI_MODEL = "openai/gpt-oss-20b"
AI_TIMEOUT_SECONDS = 20.0
AI_MAX_RETRIES = 1
AI_MAX_OUTPUT_TOKENS = 900


class AIConfigurationError(Exception):
    pass


class AIProviderError(Exception):
    pass


class AIProviderTimeoutError(AIProviderError):
    pass


class AIInvalidResponseError(AIProviderError):
    pass


class ExplanationProvider(Protocol):
    def explain(self, context: BiomarkerExplanationContext) -> BiomarkerExplanation:
        ...


@dataclass(frozen=True)
class AISettings:
    api_key: str | None
    model: str


def get_ai_settings() -> AISettings:
    key = os.getenv("GROQ_API_KEY", "").strip() or None
    model = os.getenv("MEDINSIGHT_AI_MODEL", DEFAULT_AI_MODEL).strip()
    return AISettings(api_key=key, model=model or DEFAULT_AI_MODEL)


class GroqExplanationProvider:
    def __init__(
        self,
        settings: AISettings | None = None,
        client_factory: Callable[..., object] = OpenAI,
    ) -> None:
        self.settings = settings or get_ai_settings()
        self.client_factory = client_factory

    def explain(self, context: BiomarkerExplanationContext) -> BiomarkerExplanation:
        if self.settings.api_key is None:
            raise AIConfigurationError("AI explanations are not configured.")

        client = self.client_factory(
            api_key=self.settings.api_key,
            base_url=GROQ_BASE_URL,
            timeout=AI_TIMEOUT_SECONDS,
            max_retries=AI_MAX_RETRIES,
        )
        try:
            response = client.responses.parse(  # type: ignore[attr-defined]
                model=self.settings.model,
                instructions=EXPLANATION_INSTRUCTIONS,
                input=[
                    {
                        "role": "user",
                        "content": json.dumps(context.model_dump(mode="json")),
                    }
                ],
                text_format=BiomarkerExplanation,
                store=False,
                max_output_tokens=AI_MAX_OUTPUT_TOKENS,
            )
        except openai.APITimeoutError as error:
            raise AIProviderTimeoutError from error
        except (ValidationError, json.JSONDecodeError) as error:
            raise AIInvalidResponseError from error
        except (
            openai.AuthenticationError,
            openai.PermissionDeniedError,
            openai.RateLimitError,
            openai.APIConnectionError,
            openai.InternalServerError,
        ) as error:
            raise AIProviderError from error
        except openai.APIError as error:
            raise AIProviderError from error

        parsed = getattr(response, "output_parsed", None)
        try:
            if isinstance(parsed, BiomarkerExplanation):
                return parsed
            return BiomarkerExplanation.model_validate(parsed)
        except ValidationError as error:
            raise AIInvalidResponseError from error


def get_explanation_provider() -> ExplanationProvider:
    return cast(ExplanationProvider, GroqExplanationProvider())
