from datetime import datetime

from app.core.config import Settings
from app.models import NotificationDelivery
from app.services import solapi_webhook


class FakeDb:
    def __init__(self, delivery: NotificationDelivery | None = None) -> None:
        self.delivery = delivery
        self.commits = 0

    def scalar(self, _statement):
        return self.delivery

    def get(self, model, row_id):
        if model is NotificationDelivery and self.delivery and self.delivery.id == row_id:
            return self.delivery
        return None

    def add(self, _row) -> None:
        pass

    def flush(self) -> None:
        pass

    def commit(self) -> None:
        self.commits += 1


def make_delivery(*, status: str = "sent") -> NotificationDelivery:
    return NotificationDelivery(
        id=9,
        user_id=1,
        policy_id=2,
        channel="kakao_alimtalk",
        lead_day=7,
        provider_message_id="MSG-1",
        status=status,
        attempt_count=1,
    )


def test_webhook_secret_verification_uses_sha1_hash() -> None:
    expected = solapi_webhook.expected_solapi_secret_hash("webhook-secret")

    assert solapi_webhook.verify_solapi_webhook_secret(
        received_hash=expected,
        settings_obj=Settings(solapi_webhook_secret="webhook-secret"),
    )
    assert not solapi_webhook.verify_solapi_webhook_secret(
        received_hash="wrong",
        settings_obj=Settings(solapi_webhook_secret="webhook-secret"),
    )
    assert solapi_webhook.verify_solapi_webhook_secret(
        received_hash=None,
        settings_obj=Settings(solapi_webhook_secret=""),
    )


def test_process_success_report_marks_delivery_sent() -> None:
    delivery = make_delivery(status="sent")
    db = FakeDb(delivery)

    summary = solapi_webhook.process_solapi_webhook_events(
        db,
        events=[
            {
                "messageId": "MSG-1",
                "statusCode": "4000",
                "statusMessage": "수신 완료",
                "dateReported": "2026-05-07T01:02:03.000Z",
            }
        ],
    )

    assert summary.received == 1
    assert summary.updated == 1
    assert summary.failed == 0
    assert delivery.status == "sent"
    assert delivery.sent_at is not None
    assert delivery.error_message is None
    assert db.commits == 1


def test_process_failure_report_marks_delivery_failed() -> None:
    delivery = make_delivery(status="sent")
    db = FakeDb(delivery)

    summary = solapi_webhook.process_solapi_webhook_events(
        db,
        events=[
            {
                "messageId": "MSG-1",
                "statusCode": "5000",
                "statusMessage": "수신 실패",
                "dateReported": "2026-05-07T01:02:03.000Z",
            }
        ],
    )

    assert summary.updated == 1
    assert summary.failed == 1
    assert delivery.status == "failed"
    assert delivery.attempt_count == 2
    assert delivery.error_message == "수신 실패"
    assert delivery.failed_at is not None
    assert db.commits == 1


def test_process_failure_status_code_range_marks_delivery_failed() -> None:
    delivery = make_delivery(status="sent")
    db = FakeDb(delivery)

    solapi_webhook.process_solapi_webhook_events(
        db,
        events=[
            {
                "messageId": "MSG-1",
                "statusCode": "3040",
                "statusMessage": "전송시간 초과",
            }
        ],
    )

    assert delivery.status == "failed"
    assert delivery.error_message == "전송시간 초과"


def test_process_in_progress_report_ignores_delivery() -> None:
    delivery = make_delivery(status="sent")
    db = FakeDb(delivery)

    summary = solapi_webhook.process_solapi_webhook_events(
        db,
        events=[{"messageId": "MSG-1", "statusCode": "3000"}],
    )

    assert summary.updated == 0
    assert summary.ignored == 1
    assert delivery.status == "sent"
    assert db.commits == 0


def test_process_unknown_message_is_ignored() -> None:
    db = FakeDb(delivery=None)

    summary = solapi_webhook.process_solapi_webhook_events(
        db,
        events=[{"messageId": "UNKNOWN", "statusCode": "4000"}],
    )

    assert summary.received == 1
    assert summary.updated == 0
    assert summary.ignored == 1
    assert db.commits == 0


def test_parse_datetime_accepts_naive_values() -> None:
    parsed = solapi_webhook._parse_datetime("2026-05-07T01:02:03")

    assert parsed == datetime(2026, 5, 7, 1, 2, 3)
