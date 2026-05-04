from datetime import datetime
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.api import dependencies as api_dependencies
from app.api.routes import auth as auth_routes
from app.api.routes import profile as profile_routes
from app.main import app
from app.models import User as UserModel
from app.services import auth as auth_service


client = TestClient(app)


def make_user() -> UserModel:
    return UserModel(
        id=1,
        email="jiyoung@travel.kr",
        nickname="Jiyoung",
        onboarding_completed=True,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def db_settings() -> SimpleNamespace:
    return SimpleNamespace(
        backend_data_source="db",
        refresh_cookie_name="travel_hunter_refresh",
        refresh_cookie_secure=False,
    )


def clear_overrides() -> None:
    app.dependency_overrides.pop(auth_routes.get_optional_db, None)
    app.dependency_overrides.pop(profile_routes.get_current_user, None)


def test_db_login_route_sets_refresh_cookie(monkeypatch) -> None:
    fake_db = object()
    result = auth_service.AuthResult(
        access_token="access-token",
        refresh_token="refresh-token",
        user=auth_service.user_to_api(make_user()),
    )

    monkeypatch.setattr(auth_routes, "settings", db_settings())
    monkeypatch.setattr(auth_routes.auth_service, "login", lambda db, request: result)
    app.dependency_overrides[auth_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.post(
            "/api/auth/login",
            json={"email": "jiyoung@travel.kr", "password": "password123"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json()["accessToken"] == "access-token"
    assert response.json()["user"]["email"] == "jiyoung@travel.kr"
    assert "travel_hunter_refresh=refresh-token" in response.headers["set-cookie"]


def test_db_login_route_returns_invalid_credentials(monkeypatch) -> None:
    fake_db = object()

    def reject(_db, _request):
        raise auth_service.AuthServiceError(401, "Invalid email or password")

    monkeypatch.setattr(auth_routes, "settings", db_settings())
    monkeypatch.setattr(auth_routes.auth_service, "login", reject)
    app.dependency_overrides[auth_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.post(
            "/api/auth/login",
            json={"email": "jiyoung@travel.kr", "password": "wrong-password"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}


def test_db_me_requires_bearer_token(monkeypatch) -> None:
    monkeypatch.setattr(profile_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))

    response = client.get("/api/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_me_returns_current_user(monkeypatch) -> None:
    user = make_user()

    monkeypatch.setattr(profile_routes, "settings", SimpleNamespace(backend_data_source="db"))
    app.dependency_overrides[profile_routes.get_current_user] = lambda: user

    try:
        response = client.get("/api/me", headers={"Authorization": "Bearer access-token"})
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json()["id"] == "1"
    assert response.json()["email"] == "jiyoung@travel.kr"
    assert response.json()["socialAccounts"] == []


def test_db_logout_clears_refresh_cookie(monkeypatch) -> None:
    fake_db = object()
    captured: dict[str, object] = {}

    monkeypatch.setattr(auth_routes, "settings", db_settings())
    monkeypatch.setattr(
        auth_routes.auth_service,
        "logout",
        lambda db, token: captured.update({"db": db, "token": token}),
    )
    app.dependency_overrides[auth_routes.get_optional_db] = lambda: fake_db

    try:
        client.cookies.set("travel_hunter_refresh", "refresh-token")
        response = client.post(
            "/api/auth/logout",
        )
    finally:
        client.cookies.clear()
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"loggedOut": True}
    assert captured == {"db": fake_db, "token": "refresh-token"}
    assert "travel_hunter_refresh=" in response.headers["set-cookie"]
