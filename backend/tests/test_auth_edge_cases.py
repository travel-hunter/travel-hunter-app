"""Auth edge case tests.

Covers:
- Password length boundary validation (Pydantic schema)
- Invalid email format rejection (Pydantic schema)
- Expired / invalid password reset token -> AuthServiceError(400)
- OAuth state mismatch / missing -> OAuthServiceError(400)
- OAuth redirect path safety (open redirect guard)
- Unknown OAuth provider -> OAuthServiceError(404)
"""
import pytest
from pydantic import ValidationError

from app.schemas.user import LoginRequest, NicknameUpdate, SignupRequest
from app.services import auth as auth_service
from app.services import oauth as oauth_service
from app.services.auth import AuthServiceError


# ---------------------------------------------------------------------------
# Schema: password length boundary
# ---------------------------------------------------------------------------


def test_signup_rejects_password_shorter_than_8_chars() -> None:
    with pytest.raises(ValidationError):
        SignupRequest(email="a@example.com", password="short7")


def test_signup_accepts_password_of_exactly_8_chars() -> None:
    req = SignupRequest(email="a@example.com", password="exactly8")
    assert req.password == "exactly8"


def test_login_rejects_empty_password() -> None:
    with pytest.raises(ValidationError):
        LoginRequest(email="a@example.com", password="")


def test_login_accepts_single_char_password() -> None:
    req = LoginRequest(email="a@example.com", password="x")
    assert req.password == "x"


# ---------------------------------------------------------------------------
# Schema: email format validation
# ---------------------------------------------------------------------------


def test_signup_rejects_invalid_email_formats() -> None:
    for bad_email in ["notanemail", "missing@", "@domain.com", "two@@domain.com", "space @domain.com"]:
        with pytest.raises(ValidationError):
            SignupRequest(email=bad_email, password="password123")


def test_signup_normalizes_valid_email() -> None:
    req = SignupRequest(email="User@Example.COM", password="password123")
    assert "@" in req.email


# ---------------------------------------------------------------------------
# Schema: nickname pattern validation
# ---------------------------------------------------------------------------


def test_nickname_update_rejects_special_chars() -> None:
    for bad in ["hello!", "nick name", "nick@", "닉!네임"]:
        with pytest.raises(ValidationError):
            NicknameUpdate(nickname=bad)


def test_nickname_update_rejects_single_char() -> None:
    with pytest.raises(ValidationError):
        NicknameUpdate(nickname="a")


def test_nickname_update_accepts_valid_formats() -> None:
    for good in ["ab", "김철수", "TravelKing", "nick_123", "여행자99"]:
        req = NicknameUpdate(nickname=good)
        assert req.nickname == good


def test_nickname_update_rejects_over_20_chars() -> None:
    with pytest.raises(ValidationError):
        NicknameUpdate(nickname="a" * 21)


# ---------------------------------------------------------------------------
# Service: expired / invalid password reset token
# ---------------------------------------------------------------------------


class FakeDb:
    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        pass


def test_confirm_password_reset_rejects_expired_token(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.password_reset_repository,
        "get_active_password_reset_token",
        lambda _db, **kwargs: None,
    )

    with pytest.raises(AuthServiceError) as exc_info:
        auth_service.confirm_password_reset(
            FakeDb(),
            auth_service.PasswordResetConfirm(token="expired-token", newPassword="newpassword123"),
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Invalid or expired reset token"


def test_confirm_password_reset_rejects_tampered_token(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.password_reset_repository,
        "get_active_password_reset_token",
        lambda _db, **kwargs: None,
    )

    with pytest.raises(AuthServiceError) as exc_info:
        auth_service.confirm_password_reset(
            FakeDb(),
            auth_service.PasswordResetConfirm(token="tampered-xyz-999", newPassword="newpassword123"),
        )

    assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# Service: OAuth state validation
# ---------------------------------------------------------------------------


def test_oauth_callback_rejects_state_mismatch() -> None:
    with pytest.raises(oauth_service.OAuthServiceError) as exc_info:
        oauth_service.complete_oauth_callback(
            db=FakeDb(),
            provider="kakao",
            code="some-code",
            state="state-A:/home",
            state_cookie="state-B:/home",
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Invalid OAuth state"


def test_oauth_callback_rejects_missing_code() -> None:
    with pytest.raises(oauth_service.OAuthServiceError) as exc_info:
        oauth_service.complete_oauth_callback(
            db=FakeDb(),
            provider="kakao",
            code=None,
            state="state:/home",
            state_cookie="state:/home",
        )

    assert exc_info.value.status_code == 400


def test_oauth_callback_rejects_missing_state() -> None:
    with pytest.raises(oauth_service.OAuthServiceError) as exc_info:
        oauth_service.complete_oauth_callback(
            db=FakeDb(),
            provider="kakao",
            code="some-code",
            state=None,
            state_cookie="state:/home",
        )

    assert exc_info.value.status_code == 400


def test_oauth_callback_rejects_missing_state_cookie() -> None:
    with pytest.raises(oauth_service.OAuthServiceError) as exc_info:
        oauth_service.complete_oauth_callback(
            db=FakeDb(),
            provider="kakao",
            code="some-code",
            state="state:/home",
            state_cookie=None,
        )

    assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# Service: OAuth redirect path safety (open redirect guard)
# ---------------------------------------------------------------------------


def test_safe_redirect_path_allows_relative_paths() -> None:
    assert oauth_service.safe_redirect_path("/home") == "/home"
    assert oauth_service.safe_redirect_path("/trips/new") == "/trips/new"


def test_safe_redirect_path_rejects_external_urls() -> None:
    assert oauth_service.safe_redirect_path("https://evil.com") == "/home"
    assert oauth_service.safe_redirect_path("http://evil.com/steal") == "/home"


def test_safe_redirect_path_rejects_protocol_relative_urls() -> None:
    assert oauth_service.safe_redirect_path("//evil.com") == "/home"


def test_safe_redirect_path_falls_back_for_empty_or_none() -> None:
    assert oauth_service.safe_redirect_path(None) == "/home"
    assert oauth_service.safe_redirect_path("") == "/home"


# ---------------------------------------------------------------------------
# Service: unknown OAuth provider
# ---------------------------------------------------------------------------


def test_unknown_oauth_provider_raises_404() -> None:
    with pytest.raises(oauth_service.OAuthServiceError) as exc_info:
        oauth_service.build_authorization_redirect("naver", redirect=None)

    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail.lower()
