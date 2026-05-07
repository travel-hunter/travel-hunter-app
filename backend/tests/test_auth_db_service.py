from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.core import security
from app.models import AuthRefreshToken
from app.models import User as UserModel
from app.schemas.user import LoginRequest, SignupRequest
from app.services import auth as auth_service


class FakeDb:
    def __init__(self) -> None:
        self.committed = False
        self.rolled_back = False
        self.added: list[object] = []

    def add(self, value: object) -> None:
        self.added.append(value)

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


def make_user(
    *,
    user_id: int = 1,
    email: str = "test.user@example.com",
    password: str = "password123",
) -> UserModel:
    return UserModel(
        id=user_id,
        email=email,
        password_hash=security.hash_password(password),
        nickname="Test User",
        onboarding_completed=False,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def test_signup_creates_hashed_user_and_refresh_token(monkeypatch) -> None:
    db = FakeDb()
    captured: dict[str, object] = {}

    def create_user(_db, *, email: str, nickname: str, password_hash: str) -> UserModel:
        captured["email"] = email
        captured["nickname"] = nickname
        captured["password_hash"] = password_hash
        user = make_user(email=email)
        user.nickname = nickname
        user.password_hash = password_hash
        return user

    def create_refresh_token(_db, *, user_id: int, refresh_token_hash: str, expires_at):
        captured["refresh_user_id"] = user_id
        captured["refresh_token_hash"] = refresh_token_hash
        captured["expires_at"] = expires_at

    monkeypatch.setattr(auth_service.user_repository, "get_user_by_email", lambda _db, email: None)
    monkeypatch.setattr(auth_service.user_repository, "create_user", create_user)
    monkeypatch.setattr(
        auth_service.token_repository,
        "create_refresh_token",
        create_refresh_token,
    )

    result = auth_service.signup(
        db,
        SignupRequest(name="Test User", email="TEST.USER@EXAMPLE.COM", password="password123"),
    )

    assert db.committed is True
    assert result.access_token
    assert result.refresh_token
    assert result.user["email"] == "test.user@example.com"
    assert captured["email"] == "test.user@example.com"
    assert captured["nickname"] == "Test User"
    assert captured["password_hash"] != "password123"
    assert security.verify_password("password123", str(captured["password_hash"]))
    assert captured["refresh_user_id"] == 1
    assert captured["refresh_token_hash"] != result.refresh_token


def test_signup_rejects_duplicate_email(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.user_repository,
        "get_user_by_email",
        lambda _db, email: make_user(email=email),
    )

    with pytest.raises(auth_service.AuthServiceError) as error:
        auth_service.signup(
            FakeDb(),
            SignupRequest(name="Test User", email="test.user@example.com", password="password123"),
        )

    assert error.value.status_code == 409
    assert error.value.detail == "Email already registered"


def test_login_issues_tokens_for_valid_credentials(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        auth_service.user_repository,
        "get_user_by_email",
        lambda _db, email: user if email == user.email else None,
    )
    monkeypatch.setattr(
        auth_service.token_repository,
        "create_refresh_token",
        lambda _db, **kwargs: captured.update(kwargs),
    )

    result = auth_service.login(
        db,
        LoginRequest(email="test.user@example.com", password="password123"),
    )

    assert db.committed is True
    assert result.access_token
    assert result.refresh_token
    assert result.user["id"] == "1"
    assert captured["user_id"] == 1


def test_login_rejects_invalid_credentials(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.user_repository,
        "get_user_by_email",
        lambda _db, email: make_user(email=email),
    )

    with pytest.raises(auth_service.AuthServiceError) as error:
        auth_service.login(
            FakeDb(),
            LoginRequest(email="test.user@example.com", password="wrong-password"),
        )

    assert error.value.status_code == 401
    assert error.value.detail == "Invalid email or password"


def test_refresh_rotates_active_token(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    old_raw_token = "old-refresh-token"
    token = AuthRefreshToken(
        id=1,
        user_id=1,
        refresh_token_hash=security.hash_refresh_token(old_raw_token),
        expires_at=security.utc_now_naive() + timedelta(days=1),
    )
    token.user = user
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        auth_service.token_repository,
        "get_active_refresh_token_by_hash",
        lambda _db, **kwargs: token,
    )
    monkeypatch.setattr(
        auth_service.token_repository,
        "create_refresh_token",
        lambda _db, **kwargs: captured.update(kwargs),
    )

    result = auth_service.refresh(db, old_raw_token)

    assert db.committed is True
    assert token.revoked_at is not None
    assert result.access_token
    assert result.refresh_token
    assert captured["user_id"] == 1
    assert captured["refresh_token_hash"] != token.refresh_token_hash


def test_refresh_rejects_missing_or_invalid_token(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.token_repository,
        "get_active_refresh_token_by_hash",
        lambda _db, **kwargs: None,
    )

    for token in [None, "invalid-token"]:
        with pytest.raises(auth_service.AuthServiceError) as error:
            auth_service.refresh(FakeDb(), token)
        assert error.value.status_code == 401
        assert error.value.detail == "Invalid refresh token"


def test_logout_revokes_active_refresh_token(monkeypatch) -> None:
    db = FakeDb()
    token = SimpleNamespace(revoked_at=None)

    monkeypatch.setattr(
        auth_service.token_repository,
        "get_active_refresh_token_by_hash",
        lambda _db, **kwargs: token,
    )

    auth_service.logout(db, "refresh-token")

    assert token.revoked_at is not None
    assert db.committed is True


def test_password_reset_request_does_not_expose_unknown_email(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.user_repository,
        "get_user_by_email",
        lambda _db, _email: None,
    )

    result = auth_service.request_password_reset(
        FakeDb(),
        auth_service.PasswordResetRequest(email="unknown@example.com"),
    )

    assert result == {"requested": True}


def test_password_reset_request_stores_hash_and_sends_email(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        auth_service.user_repository,
        "get_user_by_email",
        lambda _db, email: user if email == user.email else None,
    )
    monkeypatch.setattr(auth_service.security, "create_urlsafe_token", lambda: "raw-reset-token")
    monkeypatch.setattr(
        auth_service.password_reset_repository,
        "create_password_reset_token",
        lambda _db, **kwargs: captured.update(kwargs),
    )
    monkeypatch.setattr(
        auth_service,
        "send_password_reset_email",
        lambda **kwargs: captured.update({"email": kwargs}),
    )

    result = auth_service.request_password_reset(
        db,
        auth_service.PasswordResetRequest(email="TEST.USER@EXAMPLE.COM"),
    )

    assert result == {"requested": True}
    assert db.committed is True
    assert captured["user_id"] == 1
    assert captured["token_hash"] != "raw-reset-token"
    assert captured["email"]["to_email"] == user.email
    assert "raw-reset-token" in captured["email"]["reset_url"]


def test_password_reset_confirm_changes_password_and_revokes_sessions(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    token = SimpleNamespace(user=user, user_id=user.id, used_at=None)
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        auth_service.password_reset_repository,
        "get_active_password_reset_token",
        lambda _db, **kwargs: token,
    )
    monkeypatch.setattr(
        auth_service.user_repository,
        "update_user_password",
        lambda _db, _user, **kwargs: captured.update(kwargs),
    )
    monkeypatch.setattr(
        auth_service.password_reset_repository,
        "mark_password_reset_token_used",
        lambda _db, _token, **kwargs: captured.update({"used_at": kwargs["used_at"]}),
    )
    monkeypatch.setattr(
        auth_service.token_repository,
        "revoke_user_refresh_tokens",
        lambda _db, **kwargs: captured.update({"revoked": kwargs}),
    )

    result = auth_service.confirm_password_reset(
        db,
        auth_service.PasswordResetConfirm(token="raw-reset-token", newPassword="new-password123"),
    )

    assert result == {"reset": True}
    assert db.committed is True
    assert captured["password_hash"] != "new-password123"
    assert security.verify_password("new-password123", str(captured["password_hash"]))
    assert captured["used_at"] is not None
    assert captured["revoked"]["user_id"] == 1
