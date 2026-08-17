from uuid import UUID

from backend.app.auth import AuthenticatedUser

USER_A_ID = UUID("11111111-1111-4111-8111-111111111111")
USER_B_ID = UUID("22222222-2222-4222-8222-222222222222")
USER_A = AuthenticatedUser(id=USER_A_ID, email="user-a@example.test")
USER_B = AuthenticatedUser(id=USER_B_ID, email="user-b@example.test")
