from datetime import datetime

from fastapi.testclient import TestClient

from app.api.routes import profile as profile_routes
from app.main import app
from app.models import User


client = TestClient(app)


class FakeDb:
    def __init__(self) -> None:
        self.flushed = False
        self.committed = False

    def add(self, _value: object) -> None:
        pass

    def flush(self) -> None:
        self.flushed = True

    def commit(self) -> None:
        self.committed = True


def make_user() -> User:
    return User(
        id=1,
        email="test.user@example.com",
        nickname="Test User",
        region="Jeju",
        travel_style="Relax",
        travel_budget="Under 400000 KRW",
        onboarding_completed=False,
        nickname_setup_completed=False,
        profile_setup_skipped=False,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def clear_overrides() -> None:
    app.dependency_overrides.pop(profile_routes.get_current_user, None)
    app.dependency_overrides.pop(profile_routes.get_optional_db, None)


def test_db_profile_requires_bearer_token() -> None:
    response = client.get("/api/me/profile")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_get_profile_returns_current_user_profile() -> None:
    user = make_user()

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user

    try:
        response = client.get("/api/me/profile", headers={"Authorization": "Bearer access-token"})
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {
        "region": "Jeju",
        "style": "Relax",
        "budget": "Under 400000 KRW",
    }


def test_db_patch_profile_persists_current_user_profile() -> None:
    user = make_user()
    fake_db = FakeDb()

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.patch(
            "/api/me/profile",
            json={"region": "Busan", "style": "Food", "budget": "Under 300000 KRW"},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {
        "region": "Busan",
        "style": "Food",
        "budget": "Under 300000 KRW",
    }
    assert user.region == "Busan"
    assert user.travel_style == "Food"
    assert user.travel_budget == "Under 300000 KRW"
    assert user.onboarding_completed is True
    assert fake_db.flushed is True
    assert fake_db.committed is True


def test_db_post_profile_skip_marks_onboarding_complete_without_profile_values() -> None:
    user = make_user()
    fake_db = FakeDb()

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.post(
            "/api/me/profile/skip",
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {
        "skipped": True,
        "onboardingCompleted": True,
    }
    assert user.onboarding_completed is True
    assert user.profile_setup_skipped is True
    assert fake_db.flushed is True
    assert fake_db.committed is True


def test_db_contact_requires_bearer_token() -> None:
    response = client.get("/api/me/contact")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_get_contact_returns_current_user_contact() -> None:
    user = make_user()
    user.phone_number = "01012345678"

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user

    try:
        response = client.get("/api/me/contact", headers={"Authorization": "Bearer access-token"})
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"phoneNumber": "01012345678", "phoneVerified": False}


def test_db_patch_contact_persists_normalized_phone_number() -> None:
    user = make_user()
    fake_db = FakeDb()

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.patch(
            "/api/me/contact",
            json={"phoneNumber": "010 1234 5678"},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"phoneNumber": "01012345678", "phoneVerified": False}
    assert user.phone_number == "01012345678"
    assert user.phone_verified_at is None
    assert fake_db.flushed is True
    assert fake_db.committed is True


def test_db_patch_contact_clears_empty_phone_number() -> None:
    user = make_user()
    user.phone_number = "01012345678"
    fake_db = FakeDb()

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.patch(
            "/api/me/contact",
            json={"phoneNumber": ""},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"phoneNumber": None, "phoneVerified": False}
    assert user.phone_number is None


def test_db_post_contact_verification_request_returns_expiry(monkeypatch) -> None:
    user = make_user()
    fake_db = FakeDb()

    def request_verification(_db, current_user, request):
        assert current_user is user
        assert request.phoneNumber == "010 1234 5678"
        return {
            "requested": True,
            "expiresAt": "2026-05-21T10:05:00",
            "resendAvailableAt": "2026-05-21T10:01:00",
        }

    monkeypatch.setattr(profile_routes.contact_service, "request_contact_verification", request_verification)
    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.post(
            "/api/me/contact/verification/request",
            json={"phoneNumber": "010 1234 5678"},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {
        "requested": True,
        "expiresAt": "2026-05-21T10:05:00",
        "resendAvailableAt": "2026-05-21T10:01:00",
    }


def test_db_post_contact_verification_confirm_returns_contact(monkeypatch) -> None:
    user = make_user()
    fake_db = FakeDb()

    def confirm_verification(_db, current_user, request):
        assert current_user is user
        assert request.code == "123456"
        return {"phoneNumber": "01012345678", "phoneVerified": True}

    monkeypatch.setattr(profile_routes.contact_service, "confirm_contact_verification", confirm_verification)
    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.post(
            "/api/me/contact/verification/confirm",
            json={"code": "123456"},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"phoneNumber": "01012345678", "phoneVerified": True}
