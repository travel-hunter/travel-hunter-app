from datetime import datetime, timedelta

import pytest

from app.models import PhoneVerificationCode, User
from app.schemas.user import ContactVerificationConfirm, ContactVerificationRequest
from app.services import phone_verification


class FakeDb:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.flushed = False
        self.committed = False

    def add(self, value: object) -> None:
        self.added.append(value)

    def flush(self) -> None:
        self.flushed = True

    def commit(self) -> None:
        self.committed = True


class FakeProvider:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []

    def send_verification_code(self, *, phone_number: str, code: str) -> None:
        self.sent.append((phone_number, code))


def make_user() -> User:
    return User(
        id=1,
        email="test.user@example.com",
        nickname="Test User",
        onboarding_completed=False,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def make_code(*, code_hash: str, expires_at: datetime, attempt_count: int = 0) -> PhoneVerificationCode:
    return PhoneVerificationCode(
        id=1,
        user_id=1,
        phone_number="01012345678",
        code_hash=code_hash,
        expires_at=expires_at,
        attempt_count=attempt_count,
        created_at=datetime(2026, 5, 21, 10, 0, 0),
    )


def test_request_contact_verification_saves_phone_and_sends_dev_provider(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    provider = FakeProvider()
    now = datetime(2026, 5, 21, 10, 0, 0)
    created: list[PhoneVerificationCode] = []

    def create_code(_db, *, user_id, phone_number, code_hash, expires_at):
        code = PhoneVerificationCode(
            id=1,
            user_id=user_id,
            phone_number=phone_number,
            code_hash=code_hash,
            expires_at=expires_at,
            attempt_count=0,
            created_at=now,
        )
        created.append(code)
        return code

    monkeypatch.setattr(phone_verification.verification_repository, "create_phone_verification_code", create_code)

    result = phone_verification.request_contact_verification(
        db,  # type: ignore[arg-type]
        user,
        ContactVerificationRequest(phoneNumber="010 1234 5678"),
        provider=provider,
        now=now,
        code_factory=lambda: "123456",
    )

    assert result == {
        "requested": True,
        "expiresAt": "2026-05-21T10:05:00",
        "resendAvailableAt": "2026-05-21T10:01:00",
    }
    assert user.phone_number == "01012345678"
    assert user.phone_verified_at is None
    assert provider.sent == [("01012345678", "123456")]
    assert created[0].phone_number == "01012345678"
    assert created[0].code_hash != "123456"
    assert db.committed is True


def test_request_contact_verification_uses_configured_provider_when_not_injected(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    provider = FakeProvider()
    now = datetime(2026, 5, 21, 10, 0, 0)

    monkeypatch.setattr(
        phone_verification.verification_repository,
        "create_phone_verification_code",
        lambda _db, **kwargs: PhoneVerificationCode(id=1, attempt_count=0, created_at=now, **kwargs),
    )
    monkeypatch.setattr(phone_verification, "build_phone_verification_provider", lambda: provider)

    phone_verification.request_contact_verification(
        db,  # type: ignore[arg-type]
        user,
        ContactVerificationRequest(phoneNumber="010 1234 5678"),
        now=now,
        code_factory=lambda: "123456",
    )

    assert provider.sent == [("01012345678", "123456")]


def test_confirm_contact_verification_marks_phone_verified(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    user.phone_number = "01012345678"
    now = datetime(2026, 5, 21, 10, 0, 0)
    code = make_code(
        code_hash=phone_verification.hash_verification_code("123456"),
        expires_at=now + timedelta(minutes=5),
    )

    monkeypatch.setattr(
        phone_verification.verification_repository,
        "get_latest_pending_phone_verification_code",
        lambda _db, *, user_id, phone_number: code,
    )

    result = phone_verification.confirm_contact_verification(
        db,  # type: ignore[arg-type]
        user,
        ContactVerificationConfirm(code="123456"),
        now=now,
    )

    assert result == {"phoneNumber": "01012345678", "phoneVerified": True}
    assert user.phone_verified_at == now
    assert code.verified_at == now
    assert db.committed is True


def test_confirm_contact_verification_rejects_expired_code(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    user.phone_number = "01012345678"
    now = datetime(2026, 5, 21, 10, 0, 0)
    code = make_code(
        code_hash=phone_verification.hash_verification_code("123456"),
        expires_at=now - timedelta(seconds=1),
    )

    monkeypatch.setattr(
        phone_verification.verification_repository,
        "get_latest_pending_phone_verification_code",
        lambda _db, *, user_id, phone_number: code,
    )

    with pytest.raises(phone_verification.PhoneVerificationError) as error:
        phone_verification.confirm_contact_verification(
            db,  # type: ignore[arg-type]
            user,
            ContactVerificationConfirm(code="123456"),
            now=now,
        )

    assert error.value.status_code == 400
    assert error.value.detail == "Verification code expired"
    assert user.phone_verified_at is None


def test_confirm_contact_verification_limits_invalid_attempts(monkeypatch) -> None:
    db = FakeDb()
    user = make_user()
    user.phone_number = "01012345678"
    now = datetime(2026, 5, 21, 10, 0, 0)
    code = make_code(
        code_hash=phone_verification.hash_verification_code("123456"),
        expires_at=now + timedelta(minutes=5),
        attempt_count=4,
    )

    monkeypatch.setattr(
        phone_verification.verification_repository,
        "get_latest_pending_phone_verification_code",
        lambda _db, *, user_id, phone_number: code,
    )

    with pytest.raises(phone_verification.PhoneVerificationError) as error:
        phone_verification.confirm_contact_verification(
            db,  # type: ignore[arg-type]
            user,
            ContactVerificationConfirm(code="000000"),
            now=now,
        )

    assert error.value.status_code == 400
    assert error.value.detail == "Verification code attempts exceeded"
    assert code.attempt_count == 5
    assert db.committed is True
