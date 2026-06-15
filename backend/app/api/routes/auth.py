from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.db.session import get_optional_db
from app.schemas.user import (
    AuthResponse,
    EmailAvailabilityRequest,
    EmailAvailabilityResponse,
    LoginRequest,
    LogoutResponse,
    PasswordResetConfirm,
    PasswordResetConfirmResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    SignupCompleteRequest,
    SignupRequest,
    SignupVerificationResponse,
    SignupVerifyRequest,
    SignupVerifyResponse,
)
from app.services import auth as auth_service
from app.services import oauth as oauth_service

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
    try:
        result = auth_service.login(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return _to_auth_response(result, response)


@router.post("/signup", response_model=SignupVerificationResponse)
def signup(
    request: SignupRequest,
    db: Session | None = Depends(get_optional_db),
) -> SignupVerificationResponse:
    try:
        result = auth_service.signup(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return SignupVerificationResponse(**result)


@router.post("/signup/verify", response_model=SignupVerifyResponse)
def verify_signup(
    request: SignupVerifyRequest,
    db: Session | None = Depends(get_optional_db),
) -> SignupVerifyResponse:
    try:
        result = auth_service.verify_signup(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return SignupVerifyResponse(**result)


@router.post("/signup/complete", response_model=AuthResponse)
def complete_signup(
    request: SignupCompleteRequest,
    response: Response,
    db: Session | None = Depends(get_optional_db),
) -> AuthResponse:
    try:
        result = auth_service.complete_signup(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return _to_auth_response(result, response)


@router.post("/email-check", response_model=EmailAvailabilityResponse)
def check_email_availability(
    request: EmailAvailabilityRequest,
    db: Session | None = Depends(get_optional_db),
) -> EmailAvailabilityResponse:
    return EmailAvailabilityResponse(**auth_service.check_email_availability(_require_db(db), request))


@router.post("/refresh", response_model=AuthResponse)
def refresh(
    request: Request,
    response: Response,
    db: Session | None = Depends(get_optional_db),
) -> AuthResponse:
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
    auth_service.logout(_require_db(db), request.cookies.get(settings.refresh_cookie_name))
    security.clear_refresh_cookie(response)
    return LogoutResponse(loggedOut=True)


@router.post("/password-reset/request", response_model=PasswordResetResponse)
def request_password_reset(
    request: PasswordResetRequest,
    db: Session | None = Depends(get_optional_db),
) -> PasswordResetResponse:
    try:
        result = auth_service.request_password_reset(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return PasswordResetResponse(**result)


@router.post("/password-reset/confirm", response_model=PasswordResetConfirmResponse)
def confirm_password_reset(
    request: PasswordResetConfirm,
    db: Session | None = Depends(get_optional_db),
) -> PasswordResetConfirmResponse:
    try:
        result = auth_service.confirm_password_reset(_require_db(db), request)
    except auth_service.AuthServiceError as error:
        _raise_auth_error(error)
    return PasswordResetConfirmResponse(**result)


def _raise_oauth_error(error: oauth_service.OAuthServiceError) -> None:
    raise HTTPException(status_code=error.status_code, detail=error.detail)


@router.get("/oauth/{provider}/start")
def start_oauth(
    provider: str,
    redirect: str | None = Query(default=None),
) -> RedirectResponse:
    try:
        result = oauth_service.build_authorization_redirect(provider, redirect)
    except oauth_service.OAuthServiceError as error:
        _raise_oauth_error(error)

    response = RedirectResponse(result.authorization_url, status_code=302)
    response.set_cookie(
        key=settings.oauth_state_cookie_name,
        value=result.state,
        max_age=600,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        path="/api/auth/oauth",
    )
    return response


@router.get("/oauth/{provider}/callback")
def complete_oauth(
    provider: str,
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    db: Session | None = Depends(get_optional_db),
) -> RedirectResponse:
    try:
        result = oauth_service.complete_oauth_callback(
            _require_db(db),
            provider=provider,
            code=code,
            state=state,
            state_cookie=request.cookies.get(settings.oauth_state_cookie_name),
        )
    except oauth_service.OAuthServiceError as error:
        _raise_oauth_error(error)

    response = RedirectResponse(result.frontend_redirect_url, status_code=302)
    security.set_refresh_cookie(response, result.auth.refresh_token)
    response.delete_cookie(
        key=settings.oauth_state_cookie_name,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        path="/api/auth/oauth",
    )
    return response
