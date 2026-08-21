import math
import time
from collections import deque
from dataclasses import dataclass
from threading import Lock
from typing import Callable
from uuid import UUID

from fastapi import HTTPException, status

from .audit import log_security_event


@dataclass(frozen=True)
class RateLimitRule:
    limit: int
    window_seconds: int

    def __post_init__(self) -> None:
        if self.limit <= 0 or self.window_seconds <= 0:
            raise ValueError("Rate-limit values must be positive.")


class RateLimitExceeded(Exception):
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__("Rate limit exceeded.")


class InMemorySlidingWindowRateLimiter:
    """Small per-process limiter for authenticated, user-scoped API operations.

    The public deployment currently runs as a single backend instance, so this
    provides useful abuse protection without adding a separate datastore. If the
    backend is horizontally scaled, replace this with a shared limiter such as
    Redis so limits remain coordinated across instances.
    """

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._events: dict[tuple[str, str], deque[float]] = {}
        self._lock = Lock()
        self._checks = 0

    def check(self, *, scope: str, key: str, rule: RateLimitRule) -> None:
        now = self._clock()
        bucket_key = (scope, key)
        cutoff = now - rule.window_seconds

        with self._lock:
            events = self._events.setdefault(bucket_key, deque())
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= rule.limit:
                retry_after = max(
                    1,
                    math.ceil(rule.window_seconds - (now - events[0])),
                )
                raise RateLimitExceeded(retry_after)

            events.append(now)
            self._checks += 1
            if self._checks % 500 == 0:
                self._remove_expired_buckets(now)

    def _remove_expired_buckets(self, now: float) -> None:
        stale_keys: list[tuple[str, str]] = []
        for bucket_key, events in self._events.items():
            if not events:
                stale_keys.append(bucket_key)
                continue
            # All configured windows are currently at most one hour. Keeping a
            # one-hour cleanup horizon avoids retaining inactive user keys.
            if now - events[-1] > 3600:
                stale_keys.append(bucket_key)
        for bucket_key in stale_keys:
            self._events.pop(bucket_key, None)

    def reset(self) -> None:
        """Clear limiter state. Intended for deterministic tests."""
        with self._lock:
            self._events.clear()
            self._checks = 0


global_rate_limiter = InMemorySlidingWindowRateLimiter()

# Conservative public-beta limits. These are deliberately scoped to operations
# that are destructive, expensive, or call an external provider.
REPORT_UPLOAD_RULE = RateLimitRule(limit=30, window_seconds=15 * 60)
REPORT_PROCESS_RULE = RateLimitRule(limit=20, window_seconds=15 * 60)
AI_EXPLANATION_RULE = RateLimitRule(limit=30, window_seconds=60 * 60)
ACCOUNT_DATA_DELETE_RULE = RateLimitRule(limit=5, window_seconds=60 * 60)
ACCOUNT_DELETE_RULE = RateLimitRule(limit=3, window_seconds=60 * 60)


def enforce_user_rate_limit(
    *,
    user_id: UUID,
    scope: str,
    rule: RateLimitRule,
) -> None:
    try:
        global_rate_limiter.check(scope=scope, key=str(user_id), rule=rule)
    except RateLimitExceeded as error:
        log_security_event(
            "rate_limit_exceeded",
            user_id=user_id,
            outcome="blocked",
            reason=scope,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests for this operation. Please try again later.",
            headers={"Retry-After": str(error.retry_after)},
        ) from error
