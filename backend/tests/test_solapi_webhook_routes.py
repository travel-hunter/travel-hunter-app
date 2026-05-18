from app.core.config import Settings
from app.db.session import get_optional_db
from app.main import app
from app.services import solapi_webhook
from fastapi.testclient import TestClient


class FakeDb:
    pass


def test_solapi_webhook_route_accepts_valid_secret(monkeypatch) -> None:
    client = TestClient(app)
    fake_db = FakeDb()
    calls: list[list[dict]] = []
    secret_hash = solapi_webhook.expected_solapi_secret_hash("webhook-secret")

    app.dependency_overrides[get_optional_db] = lambda: fake_db
    monkeypatch.setattr(
        solapi_webhook,
        "settings",
        Settings(solapi_webhook_secret="webhook-secret"),
    )
    monkeypatch.setattr(
        solapi_webhook,
        "process_solapi_webhook_events",
        lambda db, *, events: calls.append(events)
        or solapi_webhook.SolapiWebhookSummary(
            received=1,
            updated=1,
            ignored=0,
            failed=0,
        ),
    )

    try:
        response = client.post(
            "/api/webhooks/solapi",
            headers={"X-Solapi-Secret": secret_hash},
            json=[{"messageId": "MSG-1", "statusCode": "4000"}],
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "received": 1,
        "updated": 1,
        "ignored": 0,
        "failed": 0,
    }
    assert calls == [[{"messageId": "MSG-1", "statusCode": "4000"}]]


def test_solapi_webhook_route_rejects_invalid_secret(monkeypatch) -> None:
    client = TestClient(app)
    app.dependency_overrides[get_optional_db] = lambda: FakeDb()
    monkeypatch.setattr(
        solapi_webhook,
        "settings",
        Settings(solapi_webhook_secret="webhook-secret"),
    )

    try:
        response = client.post(
            "/api/webhooks/solapi",
            headers={"X-Solapi-Secret": "wrong"},
            json=[{"messageId": "MSG-1", "statusCode": "4000"}],
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid SOLAPI webhook secret"}
