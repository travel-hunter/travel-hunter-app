from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.db.session import get_optional_db
from app.schemas.user import AuthResponse, LoginRequest, LogoutResponse, SignupRequest
from app.services import auth as auth_service
from app.services import mock_store

router = APIRouter(prefix="/auth", tags=["auth"])


def _require_db(db: Session | None) -> Session:
    if db is None:
        raise HTTPException(status_code=500, detail="Database session is required")
    return db


def _to_auth_response(result: auth_service.AuthResult, response: Response) -> AuthResponse:
    security.set_refresh_cookie(response, result.refresh_token)
    return AuthResponse(accessToken=result.access_token, user=result.user)


def _raise_auth_error(error: auth_service.AuthServiceError) -> None:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.post("/login", response_model=AuthResponse)
def login(
    request: LoginRequest,
    response: Response,
    db: Session | None = Depends(get_optional_db),
) -> AuthResponse:
    if settings.backend_data_source != "db":
        return AuthResponse(**mock_store.create_auth_response())

    try:
        result = auth_service.login(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return _to_auth_response(result, response)


@router.post("/signup", response_model=AuthResponse)
def signup(
    request: SignupRequest,
    response: Response,
    db: Session | None = Depends(get_optional_db),
) -> AuthResponse:
    if settings.backend_data_source != "db":
        return AuthResponse(**mock_store.create_auth_response())

    try:
        result = auth_service.signup(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return _to_auth_response(result, response)


@router.post("/refresh", response_model=AuthResponse)
def refresh(
    request: Request,
    response: Response,
    db: Session | None = Depends(get_optional_db),
) -> AuthResponse:
    if settings.backend_data_source != "db":
        return AuthResponse(**mock_store.create_auth_response())

    try:
        result = auth_service.refresh(
            _require_db(db),
            request.cookies.get(settings.refresh_cookie_name),
        )
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return _to_auth_response(result, response)


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    response: Response,
    db: Session | None = Depends(get_optional_db),
) -> LogoutResponse:
    if settings.backend_data_source == "db" and db is not None:
        auth_service.logout(db, request.cookies.get(settings.refresh_cookie_name))
    security.clear_refresh_cookie(response)
    return LogoutResponse(loggedOut=True)
