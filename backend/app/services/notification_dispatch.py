from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.core.config import Settings, settings
from app.repositories import notification_deliveries as delivery_repository
from app.services.kakao_alimtalk import (
    KakaoAlimTalkProvider,
    build_kakao_provider,
    normalize_korean_mobile_number,
)
from app.services.notification_delivery import (
    STATUS_PENDING,
    calculate_deadline_notification_targets,
)


@dataclass(frozen=True)
class NotificationDispatchSummary:
    candidates: int
    sent: int
    failed: int
    skipped: int
    providerEnabled: bool

    def __len__(self) -> int:
        return self.candidates


def dispatch_deadline_notifications(
    db: Session,
    *,
    today: date,
    settings_obj: Settings = settings,
    provider: KakaoAlimTalkProvider | None = None,
) -> NotificationDispatchSummary:
    targets = calculate_deadline_notification_targets(db, today=today)
    pending_targets = [
        target for target in targets if target.deliveryStatus == STATUS_PENDING
    ]

    if not settings_obj.kakao_alimtalk_enabled:
        return NotificationDispatchSummary(
            candidates=len(targets),
            sent=0,
            failed=0,
            skipped=0,
            providerEnabled=False,
        )

    sender = provider or build_kakao_provider(settings_obj)
    sent = 0
    failed = 0
    skipped = 0

    for target in pending_targets:
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
        candidates=len(targets),
        sent=sent,
        failed=failed,
        skipped=skipped,
        providerEnabled=True,
    )
