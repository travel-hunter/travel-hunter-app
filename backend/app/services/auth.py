from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.core import security
from app.models import User as UserModel
from app.repositories import auth_tokens as token_repository
from app.repositories import users as user_repository
from app.schemas.user import LoginRequest, SignupRequest


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
