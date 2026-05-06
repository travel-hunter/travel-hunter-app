from datetime import datetime

from fastapi.testclient import TestClient

from app.api.routes import trips as trip_routes
from app.main import app
from app.models import User as UserModel
from app.services import trips as trip_service


client = TestClient(app)


def make_user() -> UserModel:
    return UserModel(
        id=1,
        email="test.user@example.com",
        nickname="Test User",
        onboarding_completed=True,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def trip_payload(trip_id: str = "7") -> dict[str, object]:
    return {
        "id": trip_id,
        "title": "Jeju 3-day trip",
        "dates": "2026.06.15 - 06.17",
        "people": ["Test User"],
        "expectedSaving": "30留뚯썝",
        "days": {1: [{"time": "09:00", "label": "Sunrise peak", "meta": "Nature"}]},
    }


def invite_payload(trip_id: str = "7") -> dict[str, object]:
    return {
        "id": "9",
        "tripId": trip_id,
        "inviteToken": "abc",
        "inviteUrl": "travelhunter.app/i/abc",
        "expiresAt": "2026-06-30T00:00:00Z",
        "createdAt": "2026-05-04T00:00:00Z",
        "acceptedAt": None,
        "invited": False,
        "copied": False,
    }


def clear_overrides() -> None:
    app.dependency_overrides.pop(trip_routes.get_optional_db, None)
    app.dependency_overrides.pop(trip_routes.get_current_user, None)


def install_db_route_dependencies(monkeypatch, fake_db: object, user: UserModel | None = None) -> None:
    app.dependency_overrides[trip_routes.get_optional_db] = lambda: fake_db
    if user is not None:
        app.dependency_overrides[trip_routes.get_current_user] = lambda: user


def test_db_trip_routes_require_bearer_user(monkeypatch) -> None:
    fake_db = object()
    install_db_route_dependencies(monkeypatch, fake_db)

    try:
        response = client.get("/api/trips")
    finally:
        clear_overrides()

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_trip_list_and_numeric_detail_routes(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)
    monkeypatch.setattr(
        trip_routes.trip_service,
        "list_trips",
        lambda db, current_user: [trip_payload()] if db is fake_db and current_user is user else [],
    )
    monkeypatch.setattr(
        trip_routes.trip_service,
        "get_trip",
        lambda db_handle, db, current_user: trip_payload(db_handle)
        if db_handle == "7" and db is fake_db and current_user is user
        else None,
    )

    try:
        list_response = client.get("/api/trips")
        detail_response = client.get("/api/trips/7")
    finally:
        clear_overrides()

    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == "7"
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == "7"


def test_db_trip_create_route_returns_created_numeric_id(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)
    monkeypatch.setattr(
        trip_routes.trip_service,
        "create_trip",
        lambda db, current_user, payload: trip_payload("8")
        if db is fake_db and current_user is user and payload and payload.title == "New trip" and payload.durationDays == 4
        else trip_payload("7"),
    )

    try:
        response = client.post("/api/trips", json={"title": "New trip", "durationDays": 4})
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json()["id"] == "8"


def test_db_trip_create_route_rejects_out_of_range_duration() -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(None, fake_db, user)

    try:
        response = client.post("/api/trips", json={"durationDays": 6})
    finally:
        clear_overrides()

    assert response.status_code == 422


def test_db_trip_create_route_maps_policy_error(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)

    def reject(*_args):
        raise trip_service.TripServiceError(404, "Policy not found")

    monkeypatch.setattr(trip_routes.trip_service, "create_trip", reject)

    try:
        response = client.post("/api/trips", json={"policySlug": "missing-policy"})
    finally:
        clear_overrides()

    assert response.status_code == 404
    assert response.json() == {"detail": "Policy not found"}


def test_db_trip_legacy_alias_returns_numeric_response_id(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)
    monkeypatch.setattr(
        trip_routes.trip_service,
        "get_trip",
        lambda trip_id, _db, _user: trip_payload("7") if trip_id == "jeju-3-days" else None,
    )

    try:
        response = client.get("/api/trips/jeju-3-days")
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json()["id"] == "7"


def test_db_trip_detail_missing_returns_404(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)
    monkeypatch.setattr(trip_routes.trip_service, "get_trip", lambda *_args: None)

    try:
        response = client.get("/api/trips/999")
    finally:
        clear_overrides()

    assert response.status_code == 404
    assert response.json() == {"detail": "Trip not found"}


def test_db_trip_delete_route_requires_bearer_user(monkeypatch) -> None:
    fake_db = object()
    install_db_route_dependencies(monkeypatch, fake_db)

    try:
        response = client.delete("/api/trips/7")
    finally:
        clear_overrides()

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_trip_delete_route_returns_deleted(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)
    monkeypatch.setattr(
        trip_routes.trip_service,
        "delete_trip",
        lambda trip_id, db, current_user: {"tripId": trip_id, "deleted": True}
        if trip_id == "7" and db is fake_db and current_user is user
        else None,
    )

    try:
        response = client.delete("/api/trips/7")
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"tripId": "7", "deleted": True}


def test_db_trip_delete_route_missing_returns_404(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)
    monkeypatch.setattr(trip_routes.trip_service, "delete_trip", lambda *_args: None)

    try:
        response = client.delete("/api/trips/999")
    finally:
        clear_overrides()

    assert response.status_code == 404
    assert response.json() == {"detail": "Trip not found"}


def test_db_add_policy_maps_service_errors(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)

    def reject(*_args):
        raise trip_service.TripServiceError(404, "Policy not found")

    monkeypatch.setattr(trip_routes.trip_service, "add_policy_to_trip", reject)

    try:
        response = client.post("/api/trips/7/policies/missing-policy")
    finally:
        clear_overrides()

    assert response.status_code == 404
    assert response.json() == {"detail": "Policy not found"}


def test_db_recommendation_and_invite_routes(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    install_db_route_dependencies(monkeypatch, fake_db, user)
    monkeypatch.setattr(
        trip_routes.trip_service,
        "list_recommendations",
        lambda db, current_user, trip_id: [{"label": "CA", "title": "Cafe", "meta": "Day 2", "reason": "Route"}]
        if db is fake_db and current_user is user and trip_id == "7"
        else None,
    )
    monkeypatch.setattr(
        trip_routes.trip_service,
        "get_invite_state",
        lambda db, current_user, trip_id: invite_payload(trip_id)
        if db is fake_db and current_user is user and trip_id == "7"
        else None,
    )
    monkeypatch.setattr(
        trip_routes.trip_service,
        "confirm_invite_sent",
        lambda db, current_user, trip_id: {**invite_payload(trip_id), "invited": True}
        if db is fake_db and current_user is user and trip_id == "7"
        else None,
    )

    try:
        recommendations = client.get("/api/trips/7/recommendations")
        invite = client.get("/api/trips/7/invite")
        confirm = client.post("/api/trips/7/invite")
    finally:
        clear_overrides()

    assert recommendations.status_code == 200
    assert recommendations.json()[0]["title"] == "Cafe"
    assert invite.status_code == 200
    assert invite.json()["tripId"] == "7"
    assert confirm.status_code == 200
    assert confirm.json()["invited"] is True
