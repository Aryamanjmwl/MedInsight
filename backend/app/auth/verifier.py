import os
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Protocol
from uuid import UUID

import jwt
from jwt import PyJWKClient

from .models import AuthenticatedUser

SUPABASE_URL_ENV_VAR = "SUPABASE_URL"
SUPABASE_AUDIENCE_ENV_VAR = "SUPABASE_JWT_AUDIENCE"
DEFAULT_AUDIENCE = "authenticated"
ALLOWED_ALGORITHMS = ("RS256", "ES256")


class AuthenticationConfigurationError(RuntimeError):
    pass


class InvalidAccessTokenError(ValueError):
    pass


class JWKClient(Protocol):
    def get_signing_key_from_jwt(self, token: str) -> Any: ...


@dataclass(frozen=True)
class SupabaseJWTSettings:
    issuer: str
    audience: str
    jwks_url: str

    @classmethod
    def from_environment(cls) -> "SupabaseJWTSettings":
        raw_url = os.getenv(SUPABASE_URL_ENV_VAR, "").strip().rstrip("/")
        if not raw_url:
            raise AuthenticationConfigurationError(
                f"{SUPABASE_URL_ENV_VAR} is required for authenticated endpoints."
            )
        issuer = f"{raw_url}/auth/v1"
        return cls(
            issuer=issuer,
            audience=os.getenv(SUPABASE_AUDIENCE_ENV_VAR, DEFAULT_AUDIENCE),
            jwks_url=f"{issuer}/.well-known/jwks.json",
        )


class SupabaseJWTVerifier:
    def __init__(
        self,
        settings: SupabaseJWTSettings,
        jwk_client: JWKClient | None = None,
    ) -> None:
        self.settings = settings
        self.jwk_client = jwk_client or PyJWKClient(
            settings.jwks_url,
            cache_keys=True,
            lifespan=600,
        )

    def verify(self, token: str) -> AuthenticatedUser:
        try:
            signing_key = self.jwk_client.get_signing_key_from_jwt(token)
            claims: Mapping[str, Any] = jwt.decode(
                token,
                signing_key.key,
                algorithms=list(ALLOWED_ALGORITHMS),
                audience=self.settings.audience,
                issuer=self.settings.issuer,
                options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            )
            user_id = UUID(str(claims["sub"]))
        except (jwt.PyJWTError, KeyError, TypeError, ValueError) as error:
            raise InvalidAccessTokenError("Invalid access token.") from error

        email = claims.get("email")
        return AuthenticatedUser(
            id=user_id,
            email=email if isinstance(email, str) else None,
        )


@lru_cache(maxsize=1)
def get_jwt_verifier() -> SupabaseJWTVerifier:
    return SupabaseJWTVerifier(SupabaseJWTSettings.from_environment())
