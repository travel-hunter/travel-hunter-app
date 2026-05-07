from datetime import date

from app.core.config import Settings
from app.models import NotificationDelivery
from app.services.kakao_alimtalk import KakaoAlimTalkResult
from app.services.notification_delivery import NotificationDeliveryTarget
from app.services import notification_dispatch
from app.repositories import notification_deliveries as delivery_repository


class FakeDb:
    def __init__(self) -> None:
        self.commits = 0
        self.delivery = NotificationDelivery(
            id=7,
            user_id=1,
            policy_id=2,
            channel="kakao_alimtalk",
            lead_day=7,
            target_deadline_date=date(2026, 5, 14),
            status="pending",
            attempt_count=2,
        )

    def commit(self) -> None:
        self.commits += 1

    def get(self, model, row_id):
        if model is NotificationDelivery and row_id == self.delivery.id:
            return self.delivery
        return None

    def add(self, _row) -> None:
        pass

    def flush(self) -> None:
        pass


class FakeProvider:
    def __init__(self, result: KakaoAlimTalkResult) -> None:
        self.result = result
        self.sent: list[NotificationDeliveryTarget] = []

    def send_deadline_notification(
        self,
        target: NotificationDeliveryTarget,
    ) -> KakaoAlimTalkResult:
        self.sent.append(target)
        return self.result


def make_target(
    *,
    delivery_id: int = 7,
    phone_number: str | None = "01012345678",
    status: str = "pending",
) -> NotificationDeliveryTarget:
    return NotificationDeliveryTarget(
        deliveryId=delivery_id,
        userId=1,
        userName="테스트 사용자",
        policyId=2,
        policyTitle="지역사랑 휴가지원",
        policySlug="local-vacation",
        phoneNumber=phone_number,
        leadDay=7,
        targetDeadlineDate=date(2026, 5, 14),
        channel="kakao_alimtalk",
        deliveryStatus=status,
    )


def patch_targets(monkeypatch, targets: list[NotificationDeliveryTarget]) -> None:
    monkeypatch.setattr(
        notification_dispatch,
        "calculate_deadline_notification_targets",
        lambda _db, *, today: targets,
    )


def enabled_settings() -> Settings:
    return Settings(
        kakao_alimtalk_enabled=True,
        solapi_api_key="key",
        solapi_api_secret="secret",
        solapi_pf_id="pf",
        solapi_template_id_d7="d7",
        solapi_template_id_d1="d1",
    )


def test_dispatch_disabled_only_creates_candidates(monkeypatch) -> None:
    db = FakeDb()
    target = make_target()
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [target])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=Settings(kakao_alimtalk_enabled=False),
        provider=provider,
    )

    assert summary.candidates == 1
    assert summary.providerEnabled is False
    assert summary.sent == 0
    assert provider.sent == []
    assert db.commits == 0


def test_dispatch_marks_invalid_phone_as_skipped_without_provider_call(monkeypatch) -> None:
    db = FakeDb()
    target = make_target(phone_number="0212345678")
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [target])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
    )

    assert summary.skipped == 1
    assert provider.sent == []
    assert db.delivery.status == "skipped"
    assert db.delivery.error_message == "Invalid Korean mobile phone number."
    assert db.commits == 1


def test_dispatch_marks_provider_success_as_sent(monkeypatch) -> None:
    db = FakeDb()
    target = make_target()
    provider = FakeProvider(
        KakaoAlimTalkResult(success=True, providerMessageId="MSG-ACCEPTED")
    )
    patch_targets(monkeypatch, [target])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
    )

    assert summary.sent == 1
    assert provider.sent == [target]
    assert db.delivery.status == "sent"
    assert db.delivery.provider_message_id == "MSG-ACCEPTED"
    assert db.delivery.sent_at is not None
    assert db.commits == 1


def test_dispatch_marks_provider_failure_as_failed_and_increments_attempt(monkeypatch) -> None:
    db = FakeDb()
    target = make_target()
    provider = FakeProvider(
        KakaoAlimTalkResult(success=False, errorMessage="SOLAPI failed")
    )
    patch_targets(monkeypatch, [target])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
    )

    assert summary.failed == 1
    assert provider.sent == [target]
    assert db.delivery.status == "failed"
    assert db.delivery.attempt_count == 3
    assert db.delivery.error_message == "SOLAPI failed"
    assert db.delivery.failed_at is not None
    assert db.commits == 1


def test_dispatch_ignores_non_pending_targets(monkeypatch) -> None:
    db = FakeDb()
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [make_target(status="skipped")])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
    )

    assert summary.candidates == 1
    assert summary.sent == 0
    assert provider.sent == []
    assert db.commits == 0


def test_mark_delivery_failed_increments_existing_attempt_count() -> None:
    db = FakeDb()

    delivery_repository.mark_delivery_failed(
        db,
        delivery_id=7,
        error_message="provider timeout",
    )

    assert db.delivery.status == "failed"
    assert db.delivery.attempt_count == 3
    assert db.delivery.error_message == "provider timeout"
