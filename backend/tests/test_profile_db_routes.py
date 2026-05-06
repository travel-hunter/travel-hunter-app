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
