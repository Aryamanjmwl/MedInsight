import time
import unittest
import os
from dataclasses import dataclass
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials

from backend.app.api.routes.reports import router as reports_router
from backend.app.auth import (
    InvalidAccessTokenError,
    SupabaseJWTSettings,
    SupabaseJWTVerifier,
)
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.verifier import get_jwt_verifier
from backend.tests.auth_helpers import USER_A, USER_A_ID


@dataclass
class SigningKey:
    key: object


class StaticJWKClient:
    def __init__(self, public_key: object) -> None:
        self.public_key = public_key

    def get_signing_key_from_jwt(self, token: str) -> SigningKey:
        return SigningKey(self.public_key)


class JWTVerificationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.settings = SupabaseJWTSettings(
            issuer="https://example.supabase.co/auth/v1",
            audience="authenticated",
            jwks_url="https://example.supabase.co/auth/v1/.well-known/jwks.json",
        )
        self.verifier = SupabaseJWTVerifier(
            self.settings, StaticJWKClient(self.private_key.public_key())
        )

    def token(self, **overrides: object) -> str:
        now = int(time.time())
        claims: dict[str, object] = {
            "iss": self.settings.issuer,
            "aud": self.settings.audience,
            "sub": str(USER_A_ID),
            "email": "user-a@example.test",
            "iat": now,
            "exp": now + 300,
        }
        claims.update(overrides)
        return jwt.encode(claims, self.private_key, algorithm="RS256", headers={"kid": "test"})

    def test_valid_supabase_access_token_is_accepted(self) -> None:
        user = self.verifier.verify(self.token())
        self.assertEqual(user.id, USER_A_ID)
        self.assertEqual(user.email, "user-a@example.test")

    def test_expired_wrong_issuer_wrong_audience_and_missing_sub_are_rejected(self) -> None:
        cases = (
            self.token(exp=int(time.time()) - 1),
            self.token(iss="https://attacker.invalid/auth/v1"),
            self.token(aud="wrong-audience"),
            self.token(sub=None),
        )
        for token in cases:
            with self.subTest(token=token[-12:]), self.assertRaises(InvalidAccessTokenError):
                self.verifier.verify(token)

    def test_tampered_signature_is_rejected(self) -> None:
        token = self.token()
        header, payload, signature = token.split(".")
        replacement = "A" if signature[5] != "A" else "B"
        tampered = f"{header}.{payload}.{signature[:5]}{replacement}{signature[6:]}"
        with self.assertRaises(InvalidAccessTokenError):
            self.verifier.verify(tampered)


class AuthenticationDependencyTests(unittest.TestCase):
    def setUp(self) -> None:
        api = FastAPI()
        api.include_router(reports_router)
        self.client = TestClient(api)

    def test_missing_token_returns_401(self) -> None:
        response = self.client.get("/reports")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

    def test_invalid_token_returns_401_without_network_access(self) -> None:
        verifier = unittest.mock.Mock()
        verifier.verify.side_effect = InvalidAccessTokenError("invalid")
        with patch(
            "backend.app.auth.dependencies.get_jwt_verifier", return_value=verifier
        ):
            response = self.client.get(
                "/reports", headers={"Authorization": "Bearer invalid-token"}
            )
        self.assertEqual(response.status_code, 401)

    def test_malformed_authorization_scheme_returns_401(self) -> None:
        response = self.client.get(
            "/reports", headers={"Authorization": "Basic not-a-bearer-token"}
        )
        self.assertEqual(response.status_code, 401)

    def test_verified_dependency_returns_typed_user(self) -> None:
        verifier = unittest.mock.Mock()
        verifier.verify.return_value = USER_A
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="synthetic-token"
        )
        with patch(
            "backend.app.auth.dependencies.get_jwt_verifier", return_value=verifier
        ):
            user = get_current_user(credentials)
        self.assertEqual(user.id, USER_A_ID)

    def test_public_health_and_root_remain_public(self) -> None:
        from backend.app.main import app

        client = TestClient(app)
        self.assertEqual(client.get("/").status_code, 200)
        self.assertEqual(client.get("/health").status_code, 200)


@unittest.skipUnless(
    os.getenv("SUPABASE_URL") and os.getenv("MEDINSIGHT_SUPABASE_TEST_ACCESS_TOKEN"),
    "Set SUPABASE_URL and MEDINSIGHT_SUPABASE_TEST_ACCESS_TOKEN for the optional Supabase smoke test.",
)
class OptionalSupabaseIntegrationTests(unittest.TestCase):
    def test_real_supabase_access_token_is_accepted(self) -> None:
        from backend.app.auth.verifier import get_jwt_verifier

        get_jwt_verifier.cache_clear()
        user = get_jwt_verifier().verify(
            os.environ["MEDINSIGHT_SUPABASE_TEST_ACCESS_TOKEN"]
        )
        self.assertIsNotNone(user.id)
