from sqlalchemy.orm import Session

from app.models import User, UserNotificationSetting
from app.repositories import notifications as notification_repository
from app.schemas.user import NotificationSettingsUpdate

DEADLINE_LEAD_DAYS = [7, 1]


def notification_settings_to_api(
    settings: UserNotificationSetting | None,
) -> dict[str, object]:
    return {
        "deadlineEnabled": settings.deadline_enabled if settings is not None else True,
        "deadlineLeadDays": DEADLINE_LEAD_DAYS,
    }


def get_notification_settings(db: Session, user: User) -> dict[str, object]:
    settings = notification_repository.get_notification_settings(db, user_id=user.id)
    return notification_settings_to_api(settings)


def update_notification_settings(
    db: Session,
    user: User,
    request: NotificationSettingsUpdate,
) -> dict[str, object]:
    settings = notification_repository.upsert_notification_settings(
        db,
        user,
        deadline_enabled=request.deadlineEnabled,
    )
    db.commit()
    return notification_settings_to_api(settings)
