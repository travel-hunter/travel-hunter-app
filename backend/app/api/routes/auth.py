from fastapi import APIRouter

from app.schemas.user import AuthResponse, LoginRequest, SignupRequest
from app.services import mock_store

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(_request: LoginRequest) -> AuthResponse:
    return AuthResponse(**mock_store.create_auth_response())


@router.post("/signup", response_model=AuthResponse)
def signup(_request: SignupRequest) -> AuthResponse:
    return AuthResponse(**mock_store.create_auth_response())
