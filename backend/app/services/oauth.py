from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote, urlencode

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User as UserModel
from app.repositories import users as user_repository
from app.services import auth as auth_service


class OAuthServiceError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


@dataclass(frozen=True)
class OAuthStartResult:
    authorization_url: str
    state: str
    redirect: str


@dataclass(frozen=True)
class OAuthCallbackResult:
    auth: auth_service.AuthResult
    frontend_redirect_url: str


@dataclass(frozen=True)
class OAuthProviderConfig:
    provider: str
    client_id: str
    client_secret: str
    redirect_uri: str
    authorize_url: str
    token_url: str
    userinfo_url: str
    scope: str


@dataclass(frozen=True)
class OAuthProfile:
    provider_id: str
    email: str | None
    email_verified: bool
    nickname: str | None


def safe_redirect_path(redirect: str | None) -> str:
    if not redirect or not redirect.startswith("/") or redirect.startswith("//"):
        return "/home"
    return redirect


def _frontend_base_url() -> str:
    return settings.frontend_base_url()


def _provider_config(provider: str) -> OAuthProviderConfig:
    if provider == "kakao":
        return OAuthProviderConfig(
            provider="kakao",
            client_id=settings.kakao_client_id,
            client_secret=settings.kakao_client_secret,
            redirect_uri=settings.kakao_redirect_uri,
            authorize_url="https://kauth.kakao.com/oauth/authorize",
            token_url="https://kauth.kakao.com/oauth/token",
            userinfo_url="https://kapi.kakao.com/v2/user/me",
            scope="account_email",
        )
    if provider == "google":
        return OAuthProviderConfig(
            provider="google",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            redirect_uri=settings.google_redirect_uri,
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            scope="openid email profile",
        )
    raise OAuthServiceError(404, "OAuth provider not found")


def _require_config(config: OAuthProviderConfig) -> None:
    if not config.client_id or not config.client_secret or not config.redirect_uri:
        raise OAuthServiceError(503, "OAuth provider is not configured")


def callback_error_redirect_url(error_code: str, redirect: str | None = None) -> str:
    query = urlencode(
        {
            "error": error_code,
            "redirect": safe_redirect_path(redirect),
        }
    )
    return f"{_frontend_base_url()}/oauth/callback?{query}"


def callback_error_code(error: OAuthServiceError) -> str:
    if error.detail == "invalid_state" or (
        error.status_code == 400 and "state" in error.detail.lower()
    ):
        return "invalid_state"
    if error.status_code == 404:
        return "provider_unavailable"
    if error.status_code == 503 or "token exchange" in error.detail.lower():
        return "provider_unavailable"
    if "profile" in error.detail.lower():
        return "profile_unavailable"
    if "email policy" in error.detail.lower():
        return "email_policy"
    return "provider_unavailable"


def provider_callback_error_code(provider_error: str, state_is_valid: bool) -> str:
    if not state_is_valid:
        return "invalid_state"
    if provider_error == "access_denied":
        return "access_denied"
    return "provider_unavailable"


def callback_success_redirect_url(redirect: str | None) -> str:
    return f"{_frontend_base_url()}/oauth/callback?redirect={quote(safe_redirect_path(redirect), safe='')}"


def state_matches_cookie(state: str | None, state_cookie: str | None) -> bool:
    return bool(state and state_cookie and state == state_cookie)


def redirect_from_state(state: str | None) -> str:
    if not state or ":" not in state:
        return "/home"
    _, redirect = state.split(":", 1)
    return safe_redirect_path(redirect)


def build_authorization_redirect(provider: str, redirect: str | None) -> OAuthStartResult:
    config = _provider_config(provider)
    _require_config(config)
    state = secrets.token_urlsafe(32)
    safe_redirect = safe_redirect_path(redirect)
    state_payload = f"{state}:{safe_redirect}"
    query = {
        "response_type": "code",
        "client_id": config.client_id,
        "redirect_uri": config.redirect_uri,
        "state": state_payload,
    }
    if config.scope:
        query["scope"] = config.scope
    if provider == "google":
        query["access_type"] = "offline"
        query["prompt"] = "consent"
    return OAuthStartResult(
        authorization_url=f"{config.authorize_url}?{urlencode(query)}",
        state=state_payload,
        redirect=safe_redirect,
    )


def _exchange_code(config: OAuthProviderConfig, code: str) -> str:
    payload = {
        "grant_type": "authorization_code",
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "redirect_uri": config.redirect_uri,
        "code": code,
    }
    try:
        with httpx.Client(timeout=8) as client:
            response = client.post(config.token_url, data=payload)
            response.raise_for_status()
            token_payload = response.json()
    except Exception as error:
        raise OAuthServiceError(502, "OAuth token exchange failed") from error
    access_token = token_payload.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise OAuthServiceError(502, "OAuth token exchange failed")
    return access_token


def _fetch_userinfo(config: OAuthProviderConfig, access_token: str) -> dict[str, Any]:
    try:
        with httpx.Client(timeout=8) as client:
            response = client.get(
                config.userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()
    except Exception as error:
        raise OAuthServiceError(502, "OAuth user profile fetch failed") from error


def _extract_profile(provider: str, payload: dict[str, Any]) -> OAuthProfile:
    if provider == "kakao":
        provider_id = str(payload.get("id") or "")
        account = payload.get("kakao_account") if isinstance(payload.get("kakao_account"), dict) else {}
        profile = account.get("profile") if isinstance(account.get("profile"), dict) else {}
        email = account.get("email") if isinstance(account.get("email"), str) else None
        email_verified = account.get("is_email_verified") is True and account.get("is_email_valid") is not False
        nickname = profile.get("nickname") if isinstance(profile.get("nickname"), str) else None
    else:
        provider_id = str(payload.get("sub") or "")
        email = payload.get("email") if isinstance(payload.get("email"), str) else None
        email_verified = payload.get("email_verified") is True
        nickname = payload.get("name") if isinstance(payload.get("name"), str) else None

    if not provider_id:
        raise OAuthServiceError(502, "OAuth user profile is missing provider id")
    return OAuthProfile(
        provider_id=provider_id,
        email=email,
        email_verified=email_verified,
        nickname=nickname,
    )


def _kakao_placeholder_email(provider_id: str) -> str:
    return f"kakao_{provider_id}@oauth.local"


def _maybe_upgrade_kakao_placeholder_email(
    db: Session,
    user: UserModel,
    *,
    profile: OAuthProfile,
) -> UserModel:
    if not profile.email or not profile.email_verified:
        return user

    current_email = auth_service.normalize_email(user.email)
    placeholder_email = _kakao_placeholder_email(profile.provider_id)
    if current_email != placeholder_email:
        return user

    target_email = auth_service.normalize_email(profile.email)
    if target_email == current_email:
        return user

    existing_user = user_repository.get_user_by_email(db, target_email)
    if existing_user is not None and existing_user.id != user.id:
        return user

    return user_repository.update_user_email(db, user, email=target_email)


def _find_or_create_user(
    db: Session,
    *,
    provider: str,
    profile: OAuthProfile,
) -> UserModel:
    social_account = user_repository.get_social_account(
        db,
        provider=provider,
        provider_id=profile.provider_id,
    )
    if social_account is not None:
        user = social_account.user
        if provider == "kakao":
            user = _maybe_upgrade_kakao_placeholder_email(db, user, profile=profile)
        return user

    if provider == "google" and (not profile.email or not profile.email_verified):
        raise OAuthServiceError(400, "OAuth email policy requires a verified Google email")

    if profile.email and profile.email_verified:
        normalized_email = auth_service.normalize_email(profile.email)
        user = user_repository.get_user_by_email(db, normalized_email)
    elif provider == "kakao":
        normalized_email = _kakao_placeholder_email(profile.provider_id)
        user = None
    else:
        raise OAuthServiceError(400, "OAuth email policy requires a verified email")

    if user is None:
        user = user_repository.create_user(
            db,
            email=normalized_email,
            nickname=profile.nickname or f"{provider} 사용자",
            password_hash=None,
            nickname_setup_completed=False,
        )

    user_repository.create_social_account(
        db,
        user=user,
        provider=provider,
        provider_id=profile.provider_id,
        provider_nickname=profile.nickname,
    )
    return user


def complete_oauth_callback(
    db: Session,
    *,
    provider: str,
    code: str | None,
    state: str | None,
    state_cookie: str | None,
) -> OAuthCallbackResult:
    if not code or not state or not state_cookie or state != state_cookie:
        raise OAuthServiceError(400, "invalid_state")

    config = _provider_config(provider)
    _require_config(config)
    access_token = _exchange_code(config, code)
    profile_payload = _fetch_userinfo(config, access_token)
    profile = _extract_profile(provider, profile_payload)
    user = _find_or_create_user(
        db,
        provider=provider,
        profile=profile,
    )
    result = auth_service._issue_tokens(db, user)
    db.commit()

    frontend_redirect_url = callback_success_redirect_url(redirect_from_state(state))
    return OAuthCallbackResult(auth=result, frontend_redirect_url=frontend_redirect_url)
