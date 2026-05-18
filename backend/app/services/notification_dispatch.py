from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core import security
from app.core.config import Settings, settings
from app.repositories import notification_deliveries as delivery_repository
from app.services.kakao_alimtalk import (
    KakaoAlimTalkProvider,
    build_kakao_provider,
    normalize_korean_mobile_number,
)
from app.services.notification_delivery import (
    DEFAULT_NOTIFICATION_CHANNEL,
    STATUS_PENDING,
    calculate_deadline_notification_targets,
    deadline_enabled_for_user,
    target_from_delivery,
)
from app.services.notifications import DEADLINE_LEAD_DAYS


@dataclass(frozen=True)
class NotificationDispatchSummary:
    candidates: int
    sent: int
    failed: int
    skipped: int
    retryCandidates: int
    deferredRetries: int
    providerEnabled: bool

    def __len__(self) -> int:
        return self.candidates

    @property
    def hasDeferredRetries(self) -> bool:
        return self.deferredRetries > 0


def dispatch_deadline_notifications(
    db: Session,
    *,
    today: date,
    settings_obj: Settings = settings,
    provider: KakaoAlimTalkProvider | None = None,
    now: datetime | None = None,
) -> NotificationDispatchSummary:
    run_at = now or security.utc_now_naive()
    targets = calculate_deadline_notification_targets(db, today=today)
    pending_targets = [
        target for target in targets if target.deliveryStatus == STATUS_PENDING
    ]
    retry_targets: list = []
    deferred_retries = 0
    if settings_obj.notification_retry_enabled and settings_obj.kakao_alimtalk_enabled:
        retry_targets, deferred_retries = list_retry_targets(
            db,
            today=today,
            run_at=run_at,
            settings_obj=settings_obj,
        )

    if not settings_obj.kakao_alimtalk_enabled:
        return NotificationDispatchSummary(
            candidates=len(targets),
            sent=0,
            failed=0,
            skipped=0,
            retryCandidates=0,
            deferredRetries=0,
            providerEnabled=False,
        )

    sender = provider or build_kakao_provider(settings_obj)
    sent = 0
    failed = 0
    skipped = 0

    for target in pending_targets + retry_targets:
        if normalize_korean_mobile_number(target.phoneNumber) is None:
            delivery_repository.mark_delivery_skipped(
                db,
                delivery_id=target.deliveryId,
                error_message="Invalid Korean mobile phone number.",
            )
            skipped += 1
            continue

        result = sender.send_deadline_notification(target)
        if result.success:
            delivery_repository.mark_delivery_sent(
                db,
                delivery_id=target.deliveryId,
                provider_message_id=result.providerMessageId,
            )
            sent += 1
        else:
            delivery_repository.mark_delivery_failed(
                db,
                delivery_id=target.deliveryId,
                error_message=result.errorMessage or "SOLAPI send failed.",
            )
            failed += 1

    if sent or failed or skipped:
        db.commit()

    return NotificationDispatchSummary(
        candidates=len(targets) + len(retry_targets) + deferred_retries,
        sent=sent,
        failed=failed,
        skipped=skipped,
        retryCandidates=len(retry_targets),
        deferredRetries=deferred_retries,
        providerEnabled=True,
    )


def list_retry_targets(
    db: Session,
    *,
    today: date,
    run_at: datetime,
    settings_obj: Settings,
) -> tuple[list, int]:
    retry_targets = []
    deferred_count = 0
    retry_delay = timedelta(seconds=settings_obj.notification_retry_delay_seconds)

    for lead_day in DEADLINE_LEAD_DAYS:
        target_date = today + timedelta(days=lead_day)
        deliveries = delivery_repository.list_retryable_failed_deliveries(
            db,
            target_date=target_date,
            channel=DEFAULT_NOTIFICATION_CHANNEL,
            max_attempts=settings_obj.notification_retry_max_attempts,
        )
        for delivery in deliveries:
            if not deadline_enabled_for_user(delivery.user):
                continue
            if delivery.failed_at is not None and delivery.failed_at + retry_delay > run_at:
                deferred_count += 1
                continue
            retry_targets.append(target_from_delivery(delivery))

    return retry_targets, deferred_count
