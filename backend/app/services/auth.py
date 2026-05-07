from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.models import User as UserModel
from app.repositories import auth_tokens as token_repository
from app.repositories import password_resets as password_reset_repository
from app.repositories import users as user_repository
from app.schemas.user import LoginRequest, PasswordResetConfirm, PasswordResetRequest, SignupRequest
from app.services.email import EmailDeliveryError, send_password_reset_email


class AuthServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


@dataclass(frozen=True)
class AuthResult:
    access_token: str
    refresh_token: str
    user: dict[str, object]


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _iso_datetime(value: datetime | None) -> str:
    current = value or security.utc_now_naive()
    return current.isoformat()


def user_to_api(user: UserModel) -> dict[str, object]:
    social_accounts = [
        {
            "provider": account.provider,
            "providerNickname": account.provider_nickname,
            "connectedAt": _iso_datetime(account.created_at),
        }
        for account in user.social_accounts
    ]

    return {
        "id": str(user.id),
        "name": user.nickname,
        "nickname": user.nickname,
        "email": user.email,
        "birthDate": user.birth_date.isoformat() if user.birth_date else None,
        "gender": user.gender,
        "region": user.region,
        "homeRegion": user.residence_area or "",
        "residenceArea": user.residence_area,
        "preferredRegions": user.preferred_regions,
        "persona": "Travel Hunter 사용자",
        "savedAmount": 0,
        "onboardingCompleted": bool(user.onboarding_completed),
        "socialAccounts": social_accounts,
        "createdAt": _iso_datetime(user.created_at),
        "updatedAt": _iso_datetime(user.updated_at),
    }


def _issue_tokens(db: Session, user: UserModel) -> AuthResult:
    refresh_token = security.create_refresh_token()
    token_repository.create_refresh_token(
        db,
        user_id=int(user.id),
        refresh_token_hash=security.hash_refresh_token(refresh_token),
        expires_at=security.refresh_token_expires_at(),
    )
    access_token = security.create_access_token(user.id)
    return AuthResult(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_to_api(user),
    )


def signup(db: Session, request: SignupRequest) -> AuthResult:
    email = normalize_email(str(request.email))
    if user_repository.get_user_by_email(db, email) is not None:
        raise AuthServiceError(409, "Email already registered")

    user = user_repository.create_user(
        db,
        email=email,
        nickname=request.name.strip(),
        password_hash=security.hash_password(request.password),
    )
    result = _issue_tokens(db, user)
    db.commit()
    return result


def login(db: Session, request: LoginRequest) -> AuthResult:
    email = normalize_email(str(request.email))
    user = user_repository.get_user_by_email(db, email)
    if user is None or not security.verify_password(request.password, user.password_hash):
        raise AuthServiceError(401, "Invalid email or password")

    result = _issue_tokens(db, user)
    db.commit()
    return result


def refresh(db: Session, refresh_token: str | None) -> AuthResult:
    if not refresh_token:
        raise AuthServiceError(401, "Invalid refresh token")

    now = security.utc_now_naive()
    token = token_repository.get_active_refresh_token_by_hash(
        db,
        refresh_token_hash=security.hash_refresh_token(refresh_token),
        now=now,
    )
    if token is None:
        raise AuthServiceError(401, "Invalid refresh token")

    token_repository.revoke_refresh_token(db, token, revoked_at=now)
    result = _issue_tokens(db, token.user)
    db.commit()
    return result


def logout(db: Session, refresh_token: str | None) -> None:
    if not refresh_token:
        return

    token = token_repository.get_active_refresh_token_by_hash(
        db,
        refresh_token_hash=security.hash_refresh_token(refresh_token),
        now=security.utc_now_naive(),
    )
    if token is None:
        return

    token_repository.revoke_refresh_token(db, token, revoked_at=security.utc_now_naive())
    db.commit()


def _frontend_base_url() -> str:
    return settings.travel_hunter_public_base_url.rstrip("/") or "http://127.0.0.1:5173"


def request_password_reset(db: Session, request: PasswordResetRequest) -> dict[str, bool]:
    email = normalize_email(str(request.email))
    user = user_repository.get_user_by_email(db, email)
    if user is None:
        return {"requested": True}

    raw_token = security.create_urlsafe_token()
    expires_at = security.utc_now_naive() + timedelta(
        minutes=settings.password_reset_expire_minutes
    )
    password_reset_repository.create_password_reset_token(
        db,
        user_id=int(user.id),
        token_hash=security.hash_token(raw_token),
        expires_at=expires_at,
    )
    reset_url = f"{_frontend_base_url()}/reset-password?token={raw_token}"
    try:
        send_password_reset_email(to_email=user.email, reset_url=reset_url)
    except EmailDeliveryError as error:
        db.rollback()
        raise AuthServiceError(503, str(error)) from error

    db.commit()
    return {"requested": True}


def confirm_password_reset(db: Session, request: PasswordResetConfirm) -> dict[str, bool]:
    now = security.utc_now_naive()
    token = password_reset_repository.get_active_password_reset_token(
        db,
        token_hash=security.hash_token(request.token),
        now=now,
    )
    if token is None:
        raise AuthServiceError(400, "Invalid or expired reset token")

    user_repository.update_user_password(
        db,
        token.user,
        password_hash=security.hash_password(request.newPassword),
    )
    password_reset_repository.mark_password_reset_token_used(db, token, used_at=now)
    token_repository.revoke_user_refresh_tokens(db, user_id=int(token.user_id), revoked_at=now)
    db.commit()
    return {"reset": True}
