import os
import unittest
from unittest.mock import patch

from fastapi import FastAPI

from backend.app.cors import (
    CORS_ORIGINS_ENV_VAR,
    DEFAULT_CORS_ORIGINS,
    configure_cors,
    get_cors_origins,
    parse_cors_origins,
)

ALLOWED_ORIGIN = "http://localhost:8081"
DISALLOWED_ORIGIN = "https://example.invalid"


async def request_app(
    application: FastAPI,
    method: str,
    headers: dict[str, str],
) -> tuple[int, dict[str, str]]:
    messages: list[dict] = []
    request_received = False

    async def receive() -> dict:
        nonlocal request_received
        if request_received:
            return {"type": "http.disconnect"}
        request_received = True
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict) -> None:
        messages.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": "/probe",
        "raw_path": b"/probe",
        "query_string": b"",
        "root_path": "",
        "headers": [
            (name.lower().encode("ascii"), value.encode("ascii"))
            for name, value in headers.items()
        ],
        "client": ("127.0.0.1", 50000),
        "server": ("testserver", 80),
    }
    await application(scope, receive, send)

    response_start = next(
        message for message in messages if message["type"] == "http.response.start"
    )
    response_headers = {
        name.decode("latin-1"): value.decode("latin-1")
        for name, value in response_start["headers"]
    }
    return response_start["status"], response_headers


def make_test_app() -> FastAPI:
    application = FastAPI()
    configure_cors(application, [ALLOWED_ORIGIN])

    @application.get("/probe")
    def probe() -> dict[str, str]:
        return {"status": "ok"}

    return application


class CorsConfigurationTests(unittest.TestCase):
    def test_origin_parser_trims_ignores_empty_and_deduplicates(self) -> None:
        value = (
            " http://localhost:8081, ,http://127.0.0.1:8081,"
            "http://localhost:8081,, "
        )

        self.assertEqual(
            parse_cors_origins(value),
            ["http://localhost:8081", "http://127.0.0.1:8081"],
        )

    def test_environment_value_is_used_without_real_environment_dependency(self) -> None:
        configured = " https://app.example.com, https://admin.example.com "
        with patch.dict(os.environ, {CORS_ORIGINS_ENV_VAR: configured}, clear=True):
            self.assertEqual(
                get_cors_origins(),
                ["https://app.example.com", "https://admin.example.com"],
            )

    def test_defaults_are_used_only_when_environment_variable_is_absent(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(get_cors_origins(), list(DEFAULT_CORS_ORIGINS))

        with patch.dict(os.environ, {CORS_ORIGINS_ENV_VAR: ""}, clear=True):
            self.assertEqual(get_cors_origins(), [])

    def test_wildcard_origin_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "Wildcard CORS origins"):
            parse_cors_origins("*")


class CorsMiddlewareTests(unittest.IsolatedAsyncioTestCase):
    async def test_allowed_origin_receives_allow_origin_header(self) -> None:
        status, headers = await request_app(
            make_test_app(), "GET", {"Origin": ALLOWED_ORIGIN}
        )

        self.assertEqual(status, 200)
        self.assertEqual(headers.get("access-control-allow-origin"), ALLOWED_ORIGIN)

    async def test_disallowed_origin_receives_no_allow_origin_header(self) -> None:
        status, headers = await request_app(
            make_test_app(), "GET", {"Origin": DISALLOWED_ORIGIN}
        )

        self.assertEqual(status, 200)
        self.assertNotIn("access-control-allow-origin", headers)

    async def test_allowed_preflight_receives_valid_cors_response(self) -> None:
        status, headers = await request_app(
            make_test_app(),
            "OPTIONS",
            {
                "Origin": ALLOWED_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, Accept",
            },
        )

        self.assertEqual(status, 200)
        self.assertEqual(headers.get("access-control-allow-origin"), ALLOWED_ORIGIN)
        self.assertIn("POST", headers.get("access-control-allow-methods", ""))
        self.assertIn("Accept", headers.get("access-control-allow-headers", ""))
        self.assertIn("Content-Type", headers.get("access-control-allow-headers", ""))


if __name__ == "__main__":
    unittest.main()
