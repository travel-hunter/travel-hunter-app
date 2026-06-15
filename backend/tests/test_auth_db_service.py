from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.core import security
from app.models import AuthRefreshToken, PendingSignup
from app.models import User as UserModel
from app.schemas.user import LoginRequest, SignupCompleteRequest, SignupRequest, SignupVerifyRequest
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


def test_signup_creates_pending_signup_and_sends_verification_email(monkeypatch) -> None:
    db = FakeDb()
    captured: dict[str, object] = {}

    monkeypatch.setattr(auth_service.user_repository, "get_user_by_email", lambda _db, email: None)
    monkeypatch.setattr(auth_service.security, "create_urlsafe_token", lambda: "raw-signup-token")
    monkeypatch.setattr(
        auth_service,
        "send_signup_verification_email",
        lambda **kwargs: captured.update({"sent_email": kwargs}),
    )
    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "delete_pending_signup_by_email",
        lambda _db, email: captured.update({"deleted_email": email}),
    )

    def create_pending(_db, **kwargs):
        captured.update(kwargs)
        return SimpleNamespace(**kwargs)

    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "create_pending_signup",
        create_pending,
    )

    result = auth_service.signup(
        db,
        SignupRequest(email="TEST.USER@EXAMPLE.COM"),
    )

    assert db.committed is True
    assert result == {"verificationRequired": True, "email": "test.user@example.com"}
    assert captured["email"] == "test.user@example.com"
    assert captured["token_hash"] == security.hash_token("raw-signup-token")
    assert captured["sent_email"]["to_email"] == "test.user@example.com"
    assert "raw-signup-token" in captured["sent_email"]["verify_url"]
    assert captured["deleted_email"] == "test.user@example.com"


def test_signup_send_failure_rolls_back_without_replacing_existing_pending(monkeypatch) -> None:
    db = FakeDb()
    calls: list[str] = []

    monkeypatch.setattr(auth_service.user_repository, "get_user_by_email", lambda _db, email: None)

    def fail_send(**_kwargs):
        raise auth_service.EmailDeliveryError("boom")

    monkeypatch.setattr(auth_service, "send_signup_verification_email", fail_send)
    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "delete_pending_signup_by_email",
        lambda *_args, **_kwargs: calls.append("delete"),
    )
    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "create_pending_signup",
        lambda *_args, **_kwargs: calls.append("create"),
    )

    with pytest.raises(auth_service.AuthServiceError) as error:
        auth_service.signup(
            db,
            SignupRequest(email="test.user@example.com"),
        )

    assert error.value.status_code == 503
    assert error.value.detail == auth_service.SIGNUP_EMAIL_DELIVERY_ERROR
    assert db.rolled_back is True
    assert calls == []


def test_verify_signup_confirms_token_without_creating_user(monkeypatch) -> None:
    db = FakeDb()
    pending = PendingSignup(
        id=1,
        email="test.user@example.com",
        token_hash=security.hash_token("raw-signup-token"),
        expires_at=security.utc_now_naive() + timedelta(minutes=30),
    )

    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "get_active_pending_signup_by_token",
        lambda _db, **kwargs: pending if kwargs["token_hash"] == pending.token_hash else None,
    )
    monkeypatch.setattr(auth_service.user_repository, "get_user_by_email", lambda _db, email: None)

    result = auth_service.verify_signup(db, SignupVerifyRequest(token="raw-signup-token"))

    assert db.committed is False
    assert result == {"verified": True, "email": "test.user@example.com"}


def test_complete_signup_creates_user_and_refresh_token(monkeypatch) -> None:
    db = FakeDb()
    captured: dict[str, object] = {}
    pending = PendingSignup(
        id=1,
        email="test.user@example.com",
        token_hash=security.hash_token("raw-signup-token"),
        expires_at=security.utc_now_naive() + timedelta(minutes=30),
    )

    def create_user(_db, *, email: str, nickname: str, password_hash: str) -> UserModel:
        captured["email"] = email
        captured["nickname"] = nickname
        captured["password_hash"] = password_hash
        user = make_user(email=email)
        user.nickname = nickname
        user.password_hash = password_hash
        return user

    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "get_active_pending_signup_by_token",
        lambda _db, **kwargs: pending if kwargs["token_hash"] == pending.token_hash else None,
    )
    monkeypatch.setattr(auth_service.user_repository, "get_user_by_email", lambda _db, email: None)
    monkeypatch.setattr(auth_service.user_repository, "create_user", create_user)
    monkeypatch.setattr(auth_service.nicknames, "generate_random_nickname", lambda: "알뜰한여행자482")
    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "delete_pending_signup",
        lambda _db, value: captured.update({"deleted_pending": value}),
    )
    monkeypatch.setattr(
        auth_service.token_repository,
        "create_refresh_token",
        lambda _db, **kwargs: captured.update({"refresh": kwargs}),
    )

    result = auth_service.complete_signup(db, SignupCompleteRequest(token="raw-signup-token", password="password123"))

    assert db.committed is True
    assert result.access_token
    assert result.refresh_token
    assert result.user["email"] == "test.user@example.com"
    assert captured["email"] == "test.user@example.com"
    assert captured["nickname"] == "알뜰한여행자482"
    assert captured["password_hash"] != "password123"
    assert security.verify_password("password123", str(captured["password_hash"]))
    assert captured["deleted_pending"] is pending
    assert captured["refresh"]["user_id"] == 1


def test_verify_signup_rejects_invalid_or_expired_token(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.pending_signup_repository,
        "get_active_pending_signup_by_token",
        lambda _db, **kwargs: None,
    )

    with pytest.raises(auth_service.AuthServiceError) as error:
        auth_service.verify_signup(FakeDb(), SignupVerifyRequest(token="bad-token"))

    assert error.value.status_code == 400
    assert error.value.detail == "Invalid or expired signup verification token"

def test_signup_rejects_duplicate_email(monkeypatch) -> None:
    monkeypatch.setattr(
        auth_service.user_repository,
        "get_user_by_email",
        lambda _db, email: make_user(email=email),
    )

    with pytest.raises(auth_service.AuthServiceError) as error:
        auth_service.signup(
            FakeDb(),
            SignupRequest(email="test.user@example.com"),
        )

    assert error.value.status_code == 409
    assert error.value.detail == "Email already registered"


def test_email_availability_checks_duplicate_email(monkeypatch) -> None:
    monkeypatch.setattr(auth_service.user_repository, "get_user_by_email", lambda _db, email: None)
    assert auth_service.check_email_availability(FakeDb(), auth_service.EmailAvailabilityRequest(email="NEW@EXAMPLE.COM")) == {"available": True}

    monkeypatch.setattr(
        auth_service.user_repository,
        "get_user_by_email",
        lambda _db, email: make_user(email=email),
    )
    assert auth_service.check_email_availability(FakeDb(), auth_service.EmailAvailabilityRequest(email="test.user@example.com")) == {"available": False}


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
        lambda **kwargs: captured.update({"sent_email": kwargs}),
    )

    result = auth_service.request_password_reset(
        db,
        auth_service.PasswordResetRequest(email="TEST.USER@EXAMPLE.COM"),
    )

    assert result == {"requested": True}
    assert db.committed is True
    assert captured["user_id"] == 1
    assert captured["token_hash"] != "raw-reset-token"
    assert captured["sent_email"]["to_email"] == user.email
    assert "raw-reset-token" in captured["sent_email"]["reset_url"]


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
