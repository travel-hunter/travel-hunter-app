from datetime import datetime

from app.models import User, UserNotificationSetting
from app.schemas.user import NotificationSettingsUpdate
from app.services import notifications as notification_service


class FakeDb:
    def __init__(self, setting: UserNotificationSetting | None = None) -> None:
        self.setting = setting
        self.added: list[object] = []
        self.flushed = False
        self.committed = False

    def scalar(self, _statement: object) -> UserNotificationSetting | None:
        return self.setting

    def add(self, value: object) -> None:
        self.added.append(value)
        if isinstance(value, UserNotificationSetting):
            self.setting = value

    def flush(self) -> None:
        self.flushed = True

    def commit(self) -> None:
        self.committed = True


def make_user() -> User:
    return User(
        id=7,
        email="test.user@example.com",
        nickname="테스트 사용자",
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def test_get_notification_settings_defaults_to_deadline_enabled() -> None:
    db = FakeDb()
    user = make_user()

    assert notification_service.get_notification_settings(db, user) == {
        "deadlineEnabled": True,
        "deadlineLeadDays": [7, 1],
    }
    assert db.committed is False


def test_update_notification_settings_creates_setting() -> None:
    db = FakeDb()
    user = make_user()

    result = notification_service.update_notification_settings(
        db,
        user,
        NotificationSettingsUpdate(deadlineEnabled=False),
    )

    assert result == {"deadlineEnabled": False, "deadlineLeadDays": [7, 1]}
    assert isinstance(db.setting, UserNotificationSetting)
    assert db.setting.user_id == user.id
    assert db.setting.deadline_enabled is False
    assert db.flushed is True
    assert db.committed is True


def test_update_notification_settings_reuses_existing_setting() -> None:
    user = make_user()
    setting = UserNotificationSetting(
        id=1,
        user_id=user.id,
        deadline_enabled=False,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )
    db = FakeDb(setting)

    result = notification_service.update_notification_settings(
        db,
        user,
        NotificationSettingsUpdate(deadlineEnabled=True),
    )

    assert result == {"deadlineEnabled": True, "deadlineLeadDays": [7, 1]}
    assert db.setting is setting
    assert setting.deadline_enabled is True
    assert setting.updated_at != datetime(2026, 5, 4, 0, 0, 0)
    assert db.added == [setting]
    assert db.committed is True
