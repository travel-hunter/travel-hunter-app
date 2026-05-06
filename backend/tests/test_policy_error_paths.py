from datetime import date
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api import dependencies as api_dependencies
from app.api.routes import policies as policy_routes
from app.main import app
from app.models import Policy as PolicyModel
from app.models import PolicyDocument
from app.models import User as UserModel
from app.services import policies as policy_service


client = TestClient(app)


def make_seed_like_policy() -> PolicyModel:
    policy = PolicyModel(
        id=1,
        slug="local-vacation",
        title="Local Vacation Support",
        organization="Travel Hunter",
        policy_type="unsupported",
        description="Domestic travel support",
        benefit_amount=300000,
        benefit_detail="Up to 300000 cashback",
        target_condition="Domestic resident\nAt least one night\nReceipt required",
        region="National",
        end_date=date(2026, 10, 31),
        official_url="https://korean.visitkorea.or.kr/",
        apply_url="https://korean.visitkorea.or.kr/kor/bbs/view/B_0000000083",
        policy_comment="Support for domestic travel expenses.",
    )
    policy.documents = [
        PolicyDocument(id=1, policy_id=1, document_name="ID card"),
        PolicyDocument(id=2, policy_id=1, document_name="Accommodation receipt"),
    ]
    return policy


def set_db_dependency_override(fake_db: object) -> None:
    app.dependency_overrides[policy_routes.get_optional_db] = lambda: fake_db


def clear_db_dependency_override() -> None:
    app.dependency_overrides.pop(policy_routes.get_optional_db, None)
    app.dependency_overrides.pop(policy_routes.get_current_user, None)


def make_user() -> UserModel:
    return UserModel(id=7, email="friend@travel.kr", nickname="Friend")


def test_mock_mode_unknown_policy_slug_returns_404(monkeypatch) -> None:
    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="mock"))
    app.dependency_overrides[policy_routes.get_optional_db] = lambda: None

    try:
        known_response = client.get("/api/policies/local-vacation")
        missing_response = client.get("/api/policies/missing-policy")
    finally:
        clear_db_dependency_override()

    assert known_response.status_code == 200
    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Policy not found"}


def test_db_mode_unknown_policy_slug_returns_404(monkeypatch) -> None:
    fake_db = object()

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(
        policy_service.policy_repository,
        "get_policy_by_slug",
        lambda db, slug: None if db is fake_db and slug == "missing-policy" else None,
    )
    set_db_dependency_override(fake_db)

    try:
        response = client.get("/api/policies/missing-policy")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 404
    assert response.json() == {"detail": "Policy not found"}


def test_db_mode_known_policy_slug_preserves_response_contract(monkeypatch) -> None:
    fake_db = object()
    policy = make_seed_like_policy()

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(
        policy_service.policy_repository,
        "get_policy_by_slug",
        lambda db, slug: policy if db is fake_db and slug == "local-vacation" else None,
    )
    set_db_dependency_override(fake_db)

    try:
        response = client.get("/api/policies/local-vacation")
    finally:
        clear_db_dependency_override()

    payload = response.json()

    assert response.status_code == 200
    assert payload["id"] == "local-vacation"
    assert payload["slug"] == "local-vacation"
    assert payload["amount"] == "Up to 300000 cashback"
    assert payload["documents"] == ["ID card", "Accommodation receipt"]
    assert payload["officialUrl"] == "https://korean.visitkorea.or.kr/"
    assert payload["applyUrl"] == "https://korean.visitkorea.or.kr/kor/bbs/view/B_0000000083"


def test_db_policy_service_returns_none_when_repository_misses(monkeypatch) -> None:
    fake_db = object()

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(
        policy_service.policy_repository,
        "get_policy_by_slug",
        lambda db, slug: None,
    )

    assert policy_service.get_policy("missing-policy", fake_db) is None


def test_db_policy_service_requires_session_in_db_mode(monkeypatch) -> None:
    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))

    with pytest.raises(RuntimeError, match="DB session is required"):
        policy_service.list_policies(None)

    with pytest.raises(RuntimeError, match="DB session is required"):
        policy_service.get_policy("missing-policy", None)


def test_db_saved_policy_requires_user(monkeypatch) -> None:
    fake_db = object()
    monkeypatch.setattr(policy_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))
    set_db_dependency_override(fake_db)
    app.dependency_overrides[policy_routes.get_current_user] = lambda: None

    try:
        response = client.post("/api/me/saved-policies/local-vacation")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_saved_policy_unknown_policy_returns_404(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    monkeypatch.setattr(policy_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(policy_service, "save_policy", lambda *_args: None)
    set_db_dependency_override(fake_db)
    app.dependency_overrides[policy_routes.get_current_user] = lambda: user

    try:
        response = client.post("/api/me/saved-policies/missing-policy")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 404
    assert response.json() == {"detail": "Policy not found"}


def test_db_saved_policy_returns_existing_response_shape(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    monkeypatch.setattr(policy_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(
        policy_service,
        "save_policy",
        lambda policy_slug, db, current_user: {"policyId": policy_slug, "saved": True}
        if db is fake_db and current_user is user
        else None,
    )
    set_db_dependency_override(fake_db)
    app.dependency_overrides[policy_routes.get_current_user] = lambda: user

    try:
        response = client.post("/api/me/saved-policies/local-vacation")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 200
    assert response.json() == {"policyId": "local-vacation", "saved": True}


def test_db_list_saved_policies_requires_user(monkeypatch) -> None:
    fake_db = object()
    monkeypatch.setattr(policy_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))
    set_db_dependency_override(fake_db)
    app.dependency_overrides[policy_routes.get_current_user] = lambda: None

    try:
        response = client.get("/api/me/saved-policies")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_list_saved_policies_returns_policy_list(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    policy = make_seed_like_policy()
    monkeypatch.setattr(policy_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(
        policy_service,
        "list_saved_policies",
        lambda db, current_user: [policy_service.policy_to_api(policy)]
        if db is fake_db and current_user is user
        else [],
    )
    set_db_dependency_override(fake_db)
    app.dependency_overrides[policy_routes.get_current_user] = lambda: user

    try:
        response = client.get("/api/me/saved-policies")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 200
    assert response.json()[0]["slug"] == "local-vacation"


def test_db_remove_saved_policy_requires_user(monkeypatch) -> None:
    fake_db = object()
    monkeypatch.setattr(policy_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))
    set_db_dependency_override(fake_db)
    app.dependency_overrides[policy_routes.get_current_user] = lambda: None

    try:
        response = client.delete("/api/me/saved-policies/local-vacation")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_remove_saved_policy_returns_existing_response_shape(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    monkeypatch.setattr(policy_routes, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(api_dependencies, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(
        policy_service,
        "remove_saved_policy",
        lambda policy_slug, db, current_user: {"policyId": policy_slug, "saved": False}
        if db is fake_db and current_user is user
        else None,
    )
    set_db_dependency_override(fake_db)
    app.dependency_overrides[policy_routes.get_current_user] = lambda: user

    try:
        response = client.delete("/api/me/saved-policies/local-vacation")
    finally:
        clear_db_dependency_override()

    assert response.status_code == 200
    assert response.json() == {"policyId": "local-vacation", "saved": False}
