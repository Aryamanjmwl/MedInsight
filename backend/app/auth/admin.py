import os
from dataclasses import dataclass
from uuid import UUID

from supabase import Client, create_client

SUPABASE_URL_ENV_VAR = "SUPABASE_URL"
SUPABASE_SECRET_KEY_ENV_VAR = "SUPABASE_SECRET_KEY"


class AuthAdminConfigurationError(RuntimeError):
    pass


class AuthAdminDeletionError(RuntimeError):
    pass


@dataclass(frozen=True)
class SupabaseAdminSettings:
    url: str
    secret_key: str


def get_supabase_admin_settings() -> SupabaseAdminSettings:
    url = os.getenv(SUPABASE_URL_ENV_VAR, "").strip().rstrip("/")
    secret_key = os.getenv(SUPABASE_SECRET_KEY_ENV_VAR, "").strip()
    if not url or not secret_key:
        raise AuthAdminConfigurationError(
            "Server-side Supabase account administration is not configured."
        )
    return SupabaseAdminSettings(url=url, secret_key=secret_key)


def delete_auth_user(
    user_id: UUID,
    *,
    settings: SupabaseAdminSettings | None = None,
    client_factory=create_client,
) -> None:
    admin_settings = settings or get_supabase_admin_settings()
    client: Client = client_factory(admin_settings.url, admin_settings.secret_key)
    try:
        client.auth.admin.delete_user(str(user_id))
    except Exception as error:  # Provider-specific exceptions are normalized here.
        raise AuthAdminDeletionError("Unable to delete the authentication account.") from error
