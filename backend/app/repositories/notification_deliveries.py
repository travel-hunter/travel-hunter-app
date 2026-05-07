from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core import security
from app.models import NotificationDelivery, Policy, User, UserSavedPolicy


def list_saved_policy_deadline_candidates(
    db: Session,
    *,
    target_date: date,
) -> list[UserSavedPolicy]:
    statement = (
        select(UserSavedPolicy)
        .join(UserSavedPolicy.policy)
        .where(Policy.end_date == target_date)
        .options(
            selectinload(UserSavedPolicy.policy),
            selectinload(UserSavedPolicy.user).selectinload(User.notification_settings),
        )
        .order_by(UserSavedPolicy.user_id, UserSavedPolicy.policy_id)
    )
    return list(db.scalars(statement).all())


def get_delivery(
    db: Session,
    *,
    user_id: int,
    policy_id: int,
    channel: str,
    lead_day: int,
    target_deadline_date: date,
) -> NotificationDelivery | None:
    statement = select(NotificationDelivery).where(
        NotificationDelivery.user_id == user_id,
        NotificationDelivery.policy_id == policy_id,
        NotificationDelivery.channel == channel,
        NotificationDelivery.lead_day == lead_day,
        NotificationDelivery.target_deadline_date == target_deadline_date,
    )
    return db.scalar(statement)


def create_delivery(
    db: Session,
    *,
    user_id: int,
    policy_id: int,
    channel: str,
    lead_day: int,
    target_deadline_date: date,
    status: str,
    scheduled_at: datetime,
) -> NotificationDelivery:
    delivery = NotificationDelivery(
        user_id=user_id,
        policy_id=policy_id,
        channel=channel,
        lead_day=lead_day,
        target_deadline_date=target_deadline_date,
        status=status,
        scheduled_at=scheduled_at,
    )
    db.add(delivery)
    db.flush()
    return delivery


def get_delivery_by_id(db: Session, *, delivery_id: int) -> NotificationDelivery | None:
    return db.get(NotificationDelivery, delivery_id)


def mark_delivery_sent(
    db: Session,
    *,
    delivery_id: int,
    provider_message_id: str | None,
    sent_at: datetime | None = None,
) -> NotificationDelivery | None:
    delivery = get_delivery_by_id(db, delivery_id=delivery_id)
    if delivery is None:
        return None
    now = sent_at or security.utc_now_naive()
    delivery.status = "sent"
    delivery.provider_message_id = provider_message_id
    delivery.sent_at = now
    delivery.error_message = None
    delivery.updated_at = now
    db.add(delivery)
    db.flush()
    return delivery


def mark_delivery_failed(
    db: Session,
    *,
    delivery_id: int,
    error_message: str,
    failed_at: datetime | None = None,
) -> NotificationDelivery | None:
    delivery = get_delivery_by_id(db, delivery_id=delivery_id)
    if delivery is None:
        return None
    now = failed_at or security.utc_now_naive()
    delivery.status = "failed"
    delivery.attempt_count = (delivery.attempt_count or 0) + 1
    delivery.error_message = error_message[:2000]
    delivery.failed_at = now
    delivery.updated_at = now
    db.add(delivery)
    db.flush()
    return delivery


def mark_delivery_skipped(
    db: Session,
    *,
    delivery_id: int,
    error_message: str | None = None,
    skipped_at: datetime | None = None,
) -> NotificationDelivery | None:
    delivery = get_delivery_by_id(db, delivery_id=delivery_id)
    if delivery is None:
        return None
    now = skipped_at or security.utc_now_naive()
    delivery.status = "skipped"
    delivery.error_message = error_message
    delivery.updated_at = now
    db.add(delivery)
    db.flush()
    return delivery
