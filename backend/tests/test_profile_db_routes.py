from datetime import datetime
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import dependencies as api_dependencies
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
        email="jiyoung@travel.kr",
        nickname="지영",
        region="제주",
        travel_style="휴식",
        travel_budget="1인 40만원 이하",
        onboarding_completed=False,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def db_settings() -> SimpleNamespace:
    return SimpleNamespace(backend_data_source="db")


def clear_overrides() -> None:
    app.dependency_overrides.pop(profile_routes.get_current_user, None)
    app.dependency_overrides.pop(profile_routes.get_optional_db, None)


def test_db_profile_requires_bearer_token(monkeypatch) -> None:
    monkeypatch.setattr(profile_routes, "settings", db_settings())
    monkeypatch.setattr(api_dependencies, "settings", db_settings())

    response = client.get("/api/me/profile")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_get_profile_returns_current_user_profile(monkeypatch) -> None:
    user = make_user()

    monkeypatch.setattr(profile_routes, "settings", db_settings())
    app.dependency_overrides[profile_routes.get_current_user] = lambda: user

    try:
        response = client.get("/api/me/profile", headers={"Authorization": "Bearer access-token"})
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {
        "region": "제주",
        "style": "휴식",
        "budget": "1인 40만원 이하",
    }


def test_db_patch_profile_persists_current_user_profile(monkeypatch) -> None:
    user = make_user()
    fake_db = FakeDb()

    monkeypatch.setattr(profile_routes, "settings", db_settings())
    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.patch(
            "/api/me/profile",
            json={"region": "부산", "style": "맛집", "budget": "1인 30만원 이하"},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {
        "region": "부산",
        "style": "맛집",
        "budget": "1인 30만원 이하",
    }
    assert user.region == "부산"
    assert user.travel_style == "맛집"
    assert user.travel_budget == "1인 30만원 이하"
    assert user.onboarding_completed is True
    assert fake_db.flushed is True
    assert fake_db.committed is True
