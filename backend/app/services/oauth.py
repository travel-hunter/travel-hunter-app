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
            scope="account_email profile_nickname",
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
        "scope": config.scope,
        "state": state_payload,
    }
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


def _extract_profile(provider: str, payload: dict[str, Any]) -> tuple[str, str | None, str | None]:
    if provider == "kakao":
        provider_id = str(payload.get("id") or "")
        account = payload.get("kakao_account") if isinstance(payload.get("kakao_account"), dict) else {}
        profile = account.get("profile") if isinstance(account.get("profile"), dict) else {}
        email = account.get("email") if isinstance(account.get("email"), str) else None
        nickname = profile.get("nickname") if isinstance(profile.get("nickname"), str) else None
    else:
        provider_id = str(payload.get("sub") or "")
        email = payload.get("email") if isinstance(payload.get("email"), str) else None
        nickname = payload.get("name") if isinstance(payload.get("name"), str) else None

    if not provider_id:
        raise OAuthServiceError(502, "OAuth user profile is missing provider id")
    return provider_id, email, nickname


def _find_or_create_user(
    db: Session,
    *,
    provider: str,
    provider_id: str,
    email: str | None,
    nickname: str | None,
) -> UserModel:
    social_account = user_repository.get_social_account(
        db,
        provider=provider,
        provider_id=provider_id,
    )
    if social_account is not None:
        return social_account.user

    normalized_email = auth_service.normalize_email(email) if email else f"{provider}_{provider_id}@oauth.local"
    user = user_repository.get_user_by_email(db, normalized_email)
    if user is None:
        user = user_repository.create_user(
            db,
            email=normalized_email,
            nickname=nickname or f"{provider} 사용자",
            password_hash=None,
        )

    user_repository.create_social_account(
        db,
        user=user,
        provider=provider,
        provider_id=provider_id,
        provider_nickname=nickname,
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
        raise OAuthServiceError(400, "Invalid OAuth state")

    config = _provider_config(provider)
    _require_config(config)
    access_token = _exchange_code(config, code)
    profile_payload = _fetch_userinfo(config, access_token)
    provider_id, email, nickname = _extract_profile(provider, profile_payload)
    user = _find_or_create_user(
        db,
        provider=provider,
        provider_id=provider_id,
        email=email,
        nickname=nickname,
    )
    result = auth_service._issue_tokens(db, user)
    db.commit()

    _, redirect = state.split(":", 1)
    frontend_redirect_url = f"{_frontend_base_url()}/oauth/callback?redirect={quote(safe_redirect_path(redirect), safe='')}"
    return OAuthCallbackResult(auth=result, frontend_redirect_url=frontend_redirect_url)
