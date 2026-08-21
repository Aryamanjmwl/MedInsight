from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...account import delete_user_health_data
from ...auth import (
    AuthAdminConfigurationError,
    AuthAdminDeletionError,
    AuthenticatedUser,
    delete_auth_user,
    get_current_user,
    get_supabase_admin_settings,
)
from ...db import get_db_session

router = APIRouter(prefix="/account", tags=["account"])


class DataDeletionResponse(BaseModel):
    status: str = "deleted"
    reports_deleted: int
    biomarkers_deleted: int


class AccountDeletionResponse(DataDeletionResponse):
    account_deleted: bool = True


@router.delete("/data", response_model=DataDeletionResponse)
def delete_my_health_data(
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DataDeletionResponse:
    result = delete_user_health_data(session, current_user.id)
    return DataDeletionResponse(
        reports_deleted=result.reports_deleted,
        biomarkers_deleted=result.biomarkers_deleted,
    )


@router.delete("", response_model=AccountDeletionResponse)
def delete_my_account(
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AccountDeletionResponse:
    # Validate privileged server configuration before deleting application data.
    try:
        admin_settings = get_supabase_admin_settings()
    except AuthAdminConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account deletion is not configured on this deployment.",
        ) from error

    result = delete_user_health_data(session, current_user.id)

    try:
        delete_auth_user(current_user.id, settings=admin_settings)
    except AuthAdminDeletionError as error:
        # Health data has already been removed. Keeping the endpoint retryable lets
        # the user complete identity removal after a temporary provider failure.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Health data was deleted, but the authentication account could not "
                "be removed. Please retry account deletion."
            ),
        ) from error

    return AccountDeletionResponse(
        reports_deleted=result.reports_deleted,
        biomarkers_deleted=result.biomarkers_deleted,
    )
