from datetime import datetime, time

from fastapi.testclient import TestClient

from app.main import app
from app.services import external_collection_scheduler
from app.services.travelmonth_collection import CollectionResult


client = TestClient(app)


def test_external_collection_ops_health_returns_scheduler_snapshot() -> None:
    response = client.get("/api/ops/external-collection")

    assert response.status_code == 200
    assert response.json() == {
        "schedulerEnabled": False,
        "runAt": "03:00",
        "pollSeconds": 60,
        "minParsedCount": 1,
        "lastAttemptedRunDate": None,
        "lastSuccessfulRunDate": None,
        "lastParsedCount": None,
        "lastOutcome": None,
        "lastError": None,
    }


def test_regular_api_health_contract_is_unchanged() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert set(response.json()) == {"status", "service", "environment", "database"}


def test_external_collection_ops_health_exposes_active_scheduler_status(
    monkeypatch,
) -> None:
    scheduler = external_collection_scheduler.ExternalCollectionScheduler(
        run_at=time(3, 0),
        poll_seconds=60,
        now_provider=lambda: datetime(2026, 5, 21, 3, 0, 0),
        collect=lambda _today: CollectionResult(
            source_name="travelmonth",
            source_category="regional_benefit",
            parsed_count=58,
            created_or_updated_count=58,
        ),
    )
    scheduler.run_once_if_due()
    monkeypatch.setattr(
        external_collection_scheduler,
        "_active_external_collection_scheduler",
        scheduler,
    )

    response = client.get("/api/ops/external-collection")

    assert response.status_code == 200
    assert {
        "lastAttemptedRunDate": "2026-05-21",
        "lastSuccessfulRunDate": "2026-05-21",
        "lastParsedCount": 58,
        "lastOutcome": "success",
        "lastError": None,
    }.items() <= response.json().items()
