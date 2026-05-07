from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Sequence

from sqlalchemy.orm import Session

from app.core import security
from app.models import NotificationDelivery, User, UserSavedPolicy
from app.repositories import notification_deliveries as delivery_repository
from app.services.notifications import DEADLINE_LEAD_DAYS

DEFAULT_NOTIFICATION_CHANNEL = "kakao_alimtalk"
STATUS_PENDING = "pending"
STATUS_SENT = "sent"
STATUS_FAILED = "failed"
STATUS_SKIPPED = "skipped"

COMPLETED_STATUSES = {STATUS_SENT, STATUS_SKIPPED}
RETRY_DEFERRED_STATUSES = {STATUS_FAILED}


@dataclass(frozen=True)
class NotificationDeliveryTarget:
    deliveryId: int
    userId: int
    userName: str
    policyId: int
    policyTitle: str
    policySlug: str | None
    phoneNumber: str | None
    leadDay: int
    targetDeadlineDate: date
    channel: str
    deliveryStatus: str


def calculate_deadline_notification_targets(
    db: Session,
    *,
    today: date,
    lead_days: Sequence[int] = DEADLINE_LEAD_DAYS,
    channel: str = DEFAULT_NOTIFICATION_CHANNEL,
    scheduled_at: datetime | None = None,
) -> list[NotificationDeliveryTarget]:
    run_at = scheduled_at or security.utc_now_naive()
    targets: list[NotificationDeliveryTarget] = []
    created_count = 0

    for lead_day in lead_days:
        target_deadline_date = today + timedelta(days=lead_day)
        saved_rows = delivery_repository.list_saved_policy_deadline_candidates(
            db,
            target_date=target_deadline_date,
        )

        for saved_row in saved_rows:
            if not _deadline_enabled(saved_row.user):
                continue

            existing = delivery_repository.get_delivery(
                db,
                user_id=saved_row.user_id,
                policy_id=saved_row.policy_id,
                channel=channel,
                lead_day=lead_day,
                target_deadline_date=target_deadline_date,
            )

            if existing is not None:
                existing_target = _target_from_existing(saved_row, existing, channel)
                if existing_target is not None:
                    targets.append(existing_target)
                continue

            status = _delivery_status_for_user(saved_row.user)
            delivery = delivery_repository.create_delivery(
                db,
                user_id=saved_row.user_id,
                policy_id=saved_row.policy_id,
                channel=channel,
                lead_day=lead_day,
                target_deadline_date=target_deadline_date,
                status=status,
                scheduled_at=run_at,
            )
            created_count += 1
            targets.append(
                _target_from_saved_row(
                    saved_row,
                    delivery_id=delivery.id,
                    lead_day=lead_day,
                    target_deadline_date=target_deadline_date,
                    channel=channel,
                    delivery_status=status,
                )
            )

    if created_count:
        db.commit()

    return targets


def _target_from_existing(
    saved_row: UserSavedPolicy,
    delivery: NotificationDelivery,
    channel: str,
) -> NotificationDeliveryTarget | None:
    if delivery.status in COMPLETED_STATUSES:
        return None
    if delivery.status in RETRY_DEFERRED_STATUSES:
        return None
    if delivery.status != STATUS_PENDING:
        return None
    return _target_from_saved_row(
        saved_row,
        delivery_id=delivery.id,
        lead_day=delivery.lead_day,
        target_deadline_date=delivery.target_deadline_date,
        channel=channel,
        delivery_status=delivery.status,
    )


def _target_from_saved_row(
    saved_row: UserSavedPolicy,
    *,
    delivery_id: int,
    lead_day: int,
    target_deadline_date: date,
    channel: str,
    delivery_status: str,
) -> NotificationDeliveryTarget:
    return NotificationDeliveryTarget(
        deliveryId=delivery_id,
        userId=saved_row.user_id,
        userName=saved_row.user.nickname,
        policyId=saved_row.policy_id,
        policyTitle=saved_row.policy.title,
        policySlug=saved_row.policy.slug,
        phoneNumber=saved_row.user.phone_number,
        leadDay=lead_day,
        targetDeadlineDate=target_deadline_date,
        channel=channel,
        deliveryStatus=delivery_status,
    )


def target_from_delivery(delivery: NotificationDelivery) -> NotificationDeliveryTarget:
    return NotificationDeliveryTarget(
        deliveryId=delivery.id,
        userId=delivery.user_id,
        userName=delivery.user.nickname,
        policyId=delivery.policy_id,
        policyTitle=delivery.policy.title,
        policySlug=delivery.policy.slug,
        phoneNumber=delivery.user.phone_number,
        leadDay=delivery.lead_day,
        targetDeadlineDate=delivery.target_deadline_date,
        channel=delivery.channel,
        deliveryStatus=delivery.status,
    )


def _deadline_enabled(user: User) -> bool:
    return (
        True
        if user.notification_settings is None
        else user.notification_settings.deadline_enabled
    )


def deadline_enabled_for_user(user: User) -> bool:
    return _deadline_enabled(user)


def _delivery_status_for_user(user: User) -> str:
    if not user.phone_number or user.phone_verified_at is None:
        return STATUS_SKIPPED
    return STATUS_PENDING
