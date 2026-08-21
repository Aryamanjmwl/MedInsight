import logging
import unittest
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.security.audit import log_security_event
from backend.app.security.headers import SECURITY_HEADERS, configure_security_headers
from backend.app.security.rate_limit import (
    InMemorySlidingWindowRateLimiter,
    RateLimitExceeded,
    RateLimitRule,
)


class MutableClock:
    def __init__(self) -> None:
        self.value = 0.0

    def __call__(self) -> float:
        return self.value


class RateLimiterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.clock = MutableClock()
        self.limiter = InMemorySlidingWindowRateLimiter(clock=self.clock)
        self.rule = RateLimitRule(limit=2, window_seconds=60)

    def test_blocks_after_limit_and_returns_retry_after(self) -> None:
        self.limiter.check(scope="test", key="user-a", rule=self.rule)
        self.limiter.check(scope="test", key="user-a", rule=self.rule)

        with self.assertRaises(RateLimitExceeded) as raised:
            self.limiter.check(scope="test", key="user-a", rule=self.rule)

        self.assertEqual(raised.exception.retry_after, 60)

    def test_limits_are_isolated_by_user_and_scope(self) -> None:
        self.limiter.check(scope="upload", key="user-a", rule=self.rule)
        self.limiter.check(scope="upload", key="user-a", rule=self.rule)

        self.limiter.check(scope="upload", key="user-b", rule=self.rule)
        self.limiter.check(scope="ai", key="user-a", rule=self.rule)

    def test_window_expiry_allows_new_request(self) -> None:
        self.limiter.check(scope="test", key="user-a", rule=self.rule)
        self.limiter.check(scope="test", key="user-a", rule=self.rule)
        self.clock.value = 61.0

        self.limiter.check(scope="test", key="user-a", rule=self.rule)


class SecurityAuditTests(unittest.TestCase):
    def test_audit_log_uses_pseudonymous_user_reference(self) -> None:
        user_id = UUID("11111111-1111-4111-8111-111111111111")
        with self.assertLogs("medinsight.security", level=logging.INFO) as captured:
            log_security_event(
                "account_delete",
                user_id=user_id,
                outcome="failure",
                reason="provider_unavailable",
            )

        message = captured.output[0]
        self.assertIn("account_delete", message)
        self.assertIn("provider_unavailable", message)
        self.assertNotIn(str(user_id), message)
        self.assertNotIn("@", message)
        self.assertNotIn("Bearer", message)


class SecurityHeaderTests(unittest.TestCase):
    def test_security_headers_are_added_to_api_responses(self) -> None:
        app = FastAPI()
        configure_security_headers(app)

        @app.get("/health")
        def health() -> dict[str, str]:
            return {"status": "healthy"}

        response = TestClient(app).get("/health")

        self.assertEqual(response.status_code, 200)
        for name, expected in SECURITY_HEADERS.items():
            self.assertEqual(response.headers[name], expected)


if __name__ == "__main__":
    unittest.main()
