from datetime import date, datetime, timedelta

from app.core.config import Settings
from app.models import NotificationDelivery, Policy, User, UserNotificationSetting
from app.services.kakao_alimtalk import KakaoAlimTalkResult
from app.services.notification_delivery import NotificationDeliveryTarget
from app.services import notification_dispatch
from app.repositories import notification_deliveries as delivery_repository


class FakeDb:
    def __init__(self, delivery: NotificationDelivery | None = None) -> None:
        self.commits = 0
        self.delivery = delivery or make_delivery()

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
        policySlug="fixture-policy",
        phoneNumber=phone_number,
        leadDay=7,
        targetDeadlineDate=date(2026, 5, 14),
        channel="kakao_alimtalk",
        deliveryStatus=status,
    )


def make_delivery(
    *,
    delivery_id: int = 7,
    status: str = "pending",
    attempt_count: int = 2,
    failed_at: datetime | None = None,
    target_deadline_date: date = date(2026, 5, 14),
    phone_number: str | None = "01012345678",
    deadline_enabled: bool | None = None,
) -> NotificationDelivery:
    user = User(
        id=1,
        email="retry@example.com",
        nickname="테스트 사용자",
        phone_number=phone_number,
        phone_verified_at=datetime(2026, 5, 1, 9, 0, 0),
    )
    if deadline_enabled is not None:
        user.notification_settings = UserNotificationSetting(
            user_id=1,
            deadline_enabled=deadline_enabled,
        )
    policy = Policy(
        id=2,
        slug="fixture-policy",
        title="지역사랑 휴가지원",
        region="전국",
        end_date=target_deadline_date,
    )
    delivery = NotificationDelivery(
        id=delivery_id,
        user_id=1,
        policy_id=2,
        channel="kakao_alimtalk",
        lead_day=7,
        target_deadline_date=target_deadline_date,
        status=status,
        attempt_count=attempt_count,
        failed_at=failed_at,
    )
    delivery.user = user
    delivery.policy = policy
    return delivery


def patch_targets(monkeypatch, targets: list[NotificationDeliveryTarget]) -> None:
    monkeypatch.setattr(
        notification_dispatch,
        "calculate_deadline_notification_targets",
        lambda _db, *, today: targets,
    )


def patch_retry_deliveries(monkeypatch, deliveries: list[NotificationDelivery]) -> None:
    monkeypatch.setattr(
        notification_dispatch.delivery_repository,
        "list_retryable_failed_deliveries",
        lambda _db, *, target_date, channel, max_attempts: [
            delivery
            for delivery in deliveries
            if delivery.target_deadline_date == target_date
            and delivery.channel == channel
            and delivery.attempt_count < max_attempts
        ],
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
    patch_retry_deliveries(monkeypatch, [])

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
    patch_retry_deliveries(monkeypatch, [])

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
    patch_retry_deliveries(monkeypatch, [])

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
    patch_retry_deliveries(monkeypatch, [])

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


def test_dispatch_retries_failed_delivery_after_delay(monkeypatch) -> None:
    failed_delivery = make_delivery(
        status="failed",
        attempt_count=1,
        failed_at=datetime(2026, 5, 7, 0, 0, 0),
    )
    db = FakeDb(failed_delivery)
    provider = FakeProvider(
        KakaoAlimTalkResult(success=True, providerMessageId="MSG-RETRY")
    )
    patch_targets(monkeypatch, [])
    patch_retry_deliveries(monkeypatch, [failed_delivery])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
        now=datetime(2026, 5, 7, 0, 11, 0),
    )

    assert summary.retryCandidates == 1
    assert summary.deferredRetries == 0
    assert summary.sent == 1
    assert provider.sent[0].deliveryId == failed_delivery.id
    assert db.delivery.status == "sent"
    assert db.delivery.provider_message_id == "MSG-RETRY"


def test_dispatch_retry_failure_increments_attempt_count(monkeypatch) -> None:
    failed_delivery = make_delivery(
        status="failed",
        attempt_count=1,
        failed_at=datetime(2026, 5, 7, 0, 0, 0),
    )
    db = FakeDb(failed_delivery)
    provider = FakeProvider(KakaoAlimTalkResult(success=False, errorMessage="retry failed"))
    patch_targets(monkeypatch, [])
    patch_retry_deliveries(monkeypatch, [failed_delivery])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
        now=datetime(2026, 5, 7, 0, 11, 0),
    )

    assert summary.retryCandidates == 1
    assert summary.failed == 1
    assert db.delivery.status == "failed"
    assert db.delivery.attempt_count == 2
    assert db.delivery.error_message == "retry failed"
    assert db.delivery.failed_at is not None


def test_dispatch_does_not_retry_when_max_attempts_reached(monkeypatch) -> None:
    failed_delivery = make_delivery(status="failed", attempt_count=3)
    db = FakeDb(failed_delivery)
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [])
    patch_retry_deliveries(monkeypatch, [failed_delivery])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
        now=datetime(2026, 5, 7, 0, 11, 0),
    )

    assert summary.retryCandidates == 0
    assert provider.sent == []
    assert db.commits == 0


def test_dispatch_does_not_retry_past_lead_day(monkeypatch) -> None:
    failed_delivery = make_delivery(
        status="failed",
        attempt_count=1,
        target_deadline_date=date(2026, 5, 13),
    )
    db = FakeDb(failed_delivery)
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [])
    patch_retry_deliveries(monkeypatch, [failed_delivery])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
        now=datetime(2026, 5, 7, 0, 11, 0),
    )

    assert summary.retryCandidates == 0
    assert provider.sent == []
    assert db.commits == 0


def test_dispatch_defers_retry_until_delay_passes(monkeypatch) -> None:
    failed_delivery = make_delivery(
        status="failed",
        attempt_count=1,
        failed_at=datetime(2026, 5, 7, 0, 5, 0),
    )
    db = FakeDb(failed_delivery)
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [])
    patch_retry_deliveries(monkeypatch, [failed_delivery])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
        now=datetime(2026, 5, 7, 0, 10, 0),
    )

    assert summary.retryCandidates == 0
    assert summary.deferredRetries == 1
    assert summary.hasDeferredRetries is True
    assert provider.sent == []
    assert db.commits == 0


def test_dispatch_retry_invalid_phone_is_skipped_without_provider_call(monkeypatch) -> None:
    failed_delivery = make_delivery(
        status="failed",
        attempt_count=1,
        failed_at=datetime(2026, 5, 7, 0, 0, 0),
        phone_number="0212345678",
    )
    db = FakeDb(failed_delivery)
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [])
    patch_retry_deliveries(monkeypatch, [failed_delivery])

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=enabled_settings(),
        provider=provider,
        now=datetime(2026, 5, 7, 0, 11, 0),
    )

    assert summary.retryCandidates == 1
    assert summary.skipped == 1
    assert provider.sent == []
    assert db.delivery.status == "skipped"


def test_dispatch_does_not_retry_when_retry_is_disabled(monkeypatch) -> None:
    failed_delivery = make_delivery(
        status="failed",
        attempt_count=1,
        failed_at=datetime(2026, 5, 7, 0, 0, 0),
    )
    db = FakeDb(failed_delivery)
    provider = FakeProvider(KakaoAlimTalkResult(success=True, providerMessageId="MSG"))
    patch_targets(monkeypatch, [])
    patch_retry_deliveries(monkeypatch, [failed_delivery])
    settings = enabled_settings()
    settings = Settings(
        kakao_alimtalk_enabled=settings.kakao_alimtalk_enabled,
        solapi_api_key=settings.solapi_api_key,
        solapi_api_secret=settings.solapi_api_secret,
        solapi_pf_id=settings.solapi_pf_id,
        solapi_template_id_d7=settings.solapi_template_id_d7,
        solapi_template_id_d1=settings.solapi_template_id_d1,
        notification_retry_enabled=False,
    )

    summary = notification_dispatch.dispatch_deadline_notifications(
        db,
        today=date(2026, 5, 7),
        settings_obj=settings,
        provider=provider,
        now=datetime(2026, 5, 7, 0, 11, 0),
    )

    assert summary.retryCandidates == 0
    assert provider.sent == []
    assert db.commits == 0
