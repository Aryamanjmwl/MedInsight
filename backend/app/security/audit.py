import hashlib
import json
import logging
from uuid import UUID


logger = logging.getLogger("medinsight.security")
logger.setLevel(logging.INFO)


def _user_reference(user_id: UUID) -> str:
    """Return a stable pseudonymous reference without logging the raw user UUID."""
    digest = hashlib.sha256(str(user_id).encode("utf-8")).hexdigest()
    return digest[:16]


def log_security_event(
    event: str,
    *,
    user_id: UUID | None = None,
    outcome: str = "success",
    reason: str | None = None,
) -> None:
    """Emit a structured security event without report content, tokens, or email."""
    payload: dict[str, str] = {
        "event": event,
        "outcome": outcome,
    }
    if user_id is not None:
        payload["user_ref"] = _user_reference(user_id)
    if reason is not None:
        payload["reason"] = reason

    logger.info("security_event %s", json.dumps(payload, separators=(",", ":")))
