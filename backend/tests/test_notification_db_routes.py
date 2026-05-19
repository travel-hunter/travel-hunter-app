from datetime import datetime

from fastapi.testclient import TestClient

from app.api.routes import profile as profile_routes
from app.main import app
from app.models import User, UserNotificationSetting


client = TestClient(app)


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
        id=1,
        email="test.user@example.com",
        nickname="테스트 사용자",
        onboarding_completed=True,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def clear_overrides() -> None:
    app.dependency_overrides.pop(profile_routes.get_current_user, None)
    app.dependency_overrides.pop(profile_routes.get_optional_db, None)


def test_db_notification_settings_requires_bearer_token() -> None:
    response = client.get("/api/me/notification-settings")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_db_get_notification_settings_uses_default_when_missing() -> None:
    user = make_user()
    fake_db = FakeDb()

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.get(
            "/api/me/notification-settings",
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"deadlineEnabled": True, "deadlineLeadDays": [7, 1]}
    assert fake_db.committed is False


def test_db_patch_notification_settings_creates_or_updates_row() -> None:
    user = make_user()
    fake_db = FakeDb()

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.patch(
            "/api/me/notification-settings",
            json={"deadlineEnabled": False},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"deadlineEnabled": False, "deadlineLeadDays": [7, 1]}
    assert isinstance(fake_db.setting, UserNotificationSetting)
    assert fake_db.setting.deadline_enabled is False
    assert fake_db.flushed is True
    assert fake_db.committed is True


def test_db_patch_notification_settings_updates_existing_row() -> None:
    user = make_user()
    setting = UserNotificationSetting(
        id=1,
        user_id=user.id,
        deadline_enabled=False,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )
    fake_db = FakeDb(setting)

    app.dependency_overrides[profile_routes.get_current_user] = lambda: user
    app.dependency_overrides[profile_routes.get_optional_db] = lambda: fake_db

    try:
        response = client.patch(
            "/api/me/notification-settings",
            json={"deadlineEnabled": True},
            headers={"Authorization": "Bearer access-token"},
        )
    finally:
        clear_overrides()

    assert response.status_code == 200
    assert response.json() == {"deadlineEnabled": True, "deadlineLeadDays": [7, 1]}
    assert fake_db.setting is setting
    assert setting.deadline_enabled is True
    assert setting.updated_at != datetime(2026, 5, 4, 0, 0, 0)
    assert fake_db.added == [setting]
    assert fake_db.committed is True
