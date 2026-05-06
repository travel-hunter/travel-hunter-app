from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.models import User, UserNotificationSetting


def get_notification_settings(db: Session, *, user_id: int) -> UserNotificationSetting | None:
    statement = select(UserNotificationSetting).where(UserNotificationSetting.user_id == user_id)
    return db.scalar(statement)


def upsert_notification_settings(
    db: Session,
    user: User,
    *,
    deadline_enabled: bool,
) -> UserNotificationSetting:
    settings = get_notification_settings(db, user_id=user.id)
    now = security.utc_now_naive()
    if settings is None:
        settings = UserNotificationSetting(
            user_id=user.id,
            deadline_enabled=deadline_enabled,
            created_at=now,
            updated_at=now,
        )
    else:
        settings.deadline_enabled = deadline_enabled
        settings.updated_at = now

    db.add(settings)
    db.flush()
    return settings
