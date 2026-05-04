from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api import dependencies as api_dependencies
from app.api.routes import auth as auth_routes
from app.api.routes import profile as profile_routes
from app.api.routes import trips as trip_routes
from app.db import session as db_session
from app.main import app
from app.services import policies as policy_service


client = TestClient(app)


@pytest.fixture(autouse=True)
def force_mock_mode(monkeypatch) -> None:
    settings = SimpleNamespace(
        backend_data_source="mock",
        database_url="",
        refresh_cookie_name="travel_hunter_refresh",
        refresh_cookie_secure=False,
    )
    monkeypatch.setattr(auth_routes, "settings", settings)
    monkeypatch.setattr(profile_routes, "settings", settings)
    monkeypatch.setattr(trip_routes, "settings", settings)
    monkeypatch.setattr(api_dependencies, "settings", settings)
    monkeypatch.setattr(db_session, "settings", settings)
    monkeypatch.setattr(policy_service, "settings", settings)


def test_auth_and_profile_endpoints() -> None:
    login_response = client.post(
        "/api/auth/login",
        json={"email": "jiyoung@travel.kr", "password": "password123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["name"] == "지영"
    assert login_response.json()["user"]["preferredRegions"] == "제주,부산,강원"

    me_response = client.get("/api/me")
    assert me_response.status_code == 200
    assert me_response.json()["homeRegion"] == "서울 마포"
    assert me_response.json()["onboardingCompleted"] is True

    profile_response = client.patch("/api/me/profile", json={"region": "부산"})
    assert profile_response.status_code == 200
    assert profile_response.json()["region"] == "부산"

    options_response = client.get("/api/profile-options")
    assert options_response.status_code == 200
    assert "제주" in options_response.json()["regions"]


def test_policy_endpoints() -> None:
    list_response = client.get("/api/policies")
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == "local-vacation"
    assert list_response.json()[0]["slug"] == "local-vacation"

    detail_response = client.get("/api/policies/local-vacation")
    assert detail_response.status_code == 200
    assert detail_response.json()["amount"] == "최대 30만원 환급"

    save_response = client.post("/api/me/saved-policies/local-vacation")
    assert save_response.status_code == 200
    assert save_response.json() == {"policyId": "local-vacation", "saved": True}


def test_trip_recommendation_and_invite_endpoints() -> None:
    trips_response = client.get("/api/trips")
    assert trips_response.status_code == 200
    assert trips_response.json()[0]["id"] == "jeju-3-days"

    trip_response = client.get("/api/trips/jeju-3-days")
    assert trip_response.status_code == 200
    assert trip_response.json()["title"] == "제주 3일 여행"

    add_policy_response = client.post("/api/trips/jeju-3-days/policies/local-vacation")
    assert add_policy_response.status_code == 200
    assert add_policy_response.json()["added"] is True

    recommendations_response = client.get("/api/trips/jeju-3-days/recommendations")
    assert recommendations_response.status_code == 200
    assert recommendations_response.json()[0]["title"] == "월정리 바다 카페"

    invite_response = client.get("/api/trips/jeju-3-days/invite")
    assert invite_response.status_code == 200
    assert invite_response.json()["inviteUrl"] == "travelhunter.app/i/jeju-3d"
    assert invite_response.json()["inviteToken"] == "jeju-3d"

    confirm_invite_response = client.post("/api/trips/jeju-3-days/invite")
    assert confirm_invite_response.status_code == 200
    assert confirm_invite_response.json()["invited"] is True

    create_invite_response = client.post("/api/trips/jeju-3-days/invites")
    assert create_invite_response.status_code == 200
    assert create_invite_response.json()["tripId"] == "jeju-3-days"

    accept_invite_response = client.post("/api/invites/jeju-3d/accept")
    assert accept_invite_response.status_code == 200
    assert accept_invite_response.json()["acceptedAt"] == "2026-05-04T00:10:00Z"
