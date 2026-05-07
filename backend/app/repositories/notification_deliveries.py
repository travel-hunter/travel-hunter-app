from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

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
