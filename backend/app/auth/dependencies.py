from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..security.audit import log_security_event
from .models import AuthenticatedUser
from .verifier import (
    AuthenticationConfigurationError,
    InvalidAccessTokenError,
    SupabaseJWTVerifier,
    get_jwt_verifier,
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        log_security_event("auth_rejected", outcome="failure", reason="missing_bearer")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid Bearer access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        verifier: SupabaseJWTVerifier = get_jwt_verifier()
        return verifier.verify(credentials.credentials)
    except AuthenticationConfigurationError as error:
        log_security_event(
            "auth_rejected",
            outcome="failure",
            reason="server_not_configured",
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on this server.",
        ) from error
    except InvalidAccessTokenError as error:
        log_security_event("auth_rejected", outcome="failure", reason="invalid_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The access token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
