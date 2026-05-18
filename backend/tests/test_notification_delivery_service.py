from datetime import date, datetime

import pytest

from app.models import (
    NotificationDelivery,
    Policy,
    User,
    UserNotificationSetting,
    UserSavedPolicy,
)
from app.services import notification_delivery as delivery_service


class FakeDb:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1


class FakeDeliveryRepository:
    def __init__(self) -> None:
        self.candidates_by_date: dict[date, list[UserSavedPolicy]] = {}
        self.existing: dict[tuple[int, int, str, int, date], NotificationDelivery] = {}
        self.created: list[NotificationDelivery] = []

    def list_saved_policy_deadline_candidates(
        self,
        _db: object,
        *,
        target_date: date,
    ) -> list[UserSavedPolicy]:
        return self.candidates_by_date.get(target_date, [])

    def get_delivery(
        self,
        _db: object,
        *,
        user_id: int,
        policy_id: int,
        channel: str,
        lead_day: int,
        target_deadline_date: date,
    ) -> NotificationDelivery | None:
        return self.existing.get(
            (user_id, policy_id, channel, lead_day, target_deadline_date)
        )

    def create_delivery(
        self,
        _db: object,
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
            id=len(self.created) + 1,
            user_id=user_id,
            policy_id=policy_id,
            channel=channel,
            lead_day=lead_day,
            target_deadline_date=target_deadline_date,
            status=status,
            scheduled_at=scheduled_at,
        )
        self.created.append(delivery)
        return delivery


@pytest.fixture
def fake_repository(monkeypatch) -> FakeDeliveryRepository:
    repository = FakeDeliveryRepository()
    monkeypatch.setattr(
        delivery_service.delivery_repository,
        "list_saved_policy_deadline_candidates",
        repository.list_saved_policy_deadline_candidates,
    )
    monkeypatch.setattr(
        delivery_service.delivery_repository,
        "get_delivery",
        repository.get_delivery,
    )
    monkeypatch.setattr(
        delivery_service.delivery_repository,
        "create_delivery",
        repository.create_delivery,
    )
    return repository


def make_user(
    *,
    user_id: int = 7,
    phone_number: str | None = "01012345678",
    phone_verified: bool = True,
    deadline_enabled: bool | None = None,
) -> User:
    user = User(
        id=user_id,
        email=f"user{user_id}@example.com",
        nickname=f"User {user_id}",
        phone_number=phone_number,
        phone_verified_at=datetime(2026, 5, 1, 9, 0, 0) if phone_verified else None,
    )
    if deadline_enabled is not None:
        user.notification_settings = UserNotificationSetting(
            user_id=user_id,
            deadline_enabled=deadline_enabled,
        )
    return user


def make_policy(
    *,
    policy_id: int = 11,
    slug: str = "local-vacation",
    title: str = "Local Vacation Support",
    end_date: date = date(2026, 5, 8),
) -> Policy:
    return Policy(
        id=policy_id,
        slug=slug,
        title=title,
        region="National",
        end_date=end_date,
    )


def make_saved_policy(user: User, policy: Policy) -> UserSavedPolicy:
    saved_policy = UserSavedPolicy(user_id=user.id, policy_id=policy.id)
    saved_policy.user = user
    saved_policy.policy = policy
    return saved_policy


def delivery_key(
    *,
    user_id: int = 7,
    policy_id: int = 11,
    channel: str = delivery_service.DEFAULT_NOTIFICATION_CHANNEL,
    lead_day: int = 7,
    target_deadline_date: date = date(2026, 5, 8),
) -> tuple[int, int, str, int, date]:
    return (user_id, policy_id, channel, lead_day, target_deadline_date)


def test_calculates_d7_pending_candidate_for_verified_contact(fake_repository) -> None:
    db = FakeDb()
    today = date(2026, 5, 1)
    scheduled_at = datetime(2026, 5, 1, 0, 0, 0)
    saved_policy = make_saved_policy(make_user(), make_policy(end_date=date(2026, 5, 8)))
    fake_repository.candidates_by_date[date(2026, 5, 8)] = [saved_policy]

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=today,
        lead_days=[7],
        scheduled_at=scheduled_at,
    )

    assert len(targets) == 1
    assert targets[0].deliveryId == 1
    assert targets[0].userId == 7
    assert targets[0].userName == "User 7"
    assert targets[0].policyId == 11
    assert targets[0].policySlug == "local-vacation"
    assert targets[0].phoneNumber == "01012345678"
    assert targets[0].leadDay == 7
    assert targets[0].targetDeadlineDate == date(2026, 5, 8)
    assert targets[0].channel == "kakao_alimtalk"
    assert targets[0].deliveryStatus == "pending"
    assert fake_repository.created[0].status == "pending"
    assert fake_repository.created[0].scheduled_at == scheduled_at
    assert db.commits == 1


def test_calculates_d1_candidate(fake_repository) -> None:
    db = FakeDb()
    today = date(2026, 5, 1)
    saved_policy = make_saved_policy(make_user(), make_policy(end_date=date(2026, 5, 2)))
    fake_repository.candidates_by_date[date(2026, 5, 2)] = [saved_policy]

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=today,
        lead_days=[1],
    )

    assert [target.leadDay for target in targets] == [1]
    assert [target.targetDeadlineDate for target in targets] == [date(2026, 5, 2)]
    assert len(fake_repository.created) == 1


def test_excludes_policies_not_returned_by_saved_policy_deadline_query(fake_repository) -> None:
    db = FakeDb()

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=date(2026, 5, 1),
        lead_days=[7, 1],
    )

    assert targets == []
    assert fake_repository.created == []
    assert db.commits == 0


def test_excludes_deadline_disabled_user(fake_repository) -> None:
    db = FakeDb()
    saved_policy = make_saved_policy(
        make_user(deadline_enabled=False),
        make_policy(end_date=date(2026, 5, 8)),
    )
    fake_repository.candidates_by_date[date(2026, 5, 8)] = [saved_policy]

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=date(2026, 5, 1),
        lead_days=[7],
    )

    assert targets == []
    assert fake_repository.created == []
    assert db.commits == 0


@pytest.mark.parametrize(
    ("phone_number", "phone_verified"),
    [
        (None, False),
        ("01012345678", False),
    ],
)
def test_creates_skipped_candidate_without_verified_contact(
    fake_repository,
    phone_number,
    phone_verified,
) -> None:
    db = FakeDb()
    saved_policy = make_saved_policy(
        make_user(phone_number=phone_number, phone_verified=phone_verified),
        make_policy(end_date=date(2026, 5, 8)),
    )
    fake_repository.candidates_by_date[date(2026, 5, 8)] = [saved_policy]

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=date(2026, 5, 1),
        lead_days=[7],
    )

    assert len(targets) == 1
    assert targets[0].deliveryStatus == "skipped"
    assert fake_repository.created[0].status == "skipped"
    assert db.commits == 1


@pytest.mark.parametrize("status", ["sent", "skipped"])
def test_excludes_completed_delivery_without_duplicate(fake_repository, status: str) -> None:
    db = FakeDb()
    target_date = date(2026, 5, 8)
    saved_policy = make_saved_policy(make_user(), make_policy(end_date=target_date))
    fake_repository.candidates_by_date[target_date] = [saved_policy]
    fake_repository.existing[delivery_key(target_deadline_date=target_date)] = (
        NotificationDelivery(
            id=91,
            user_id=7,
            policy_id=11,
            channel="kakao_alimtalk",
            lead_day=7,
            target_deadline_date=target_date,
            status=status,
        )
    )

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=date(2026, 5, 1),
        lead_days=[7],
    )

    assert targets == []
    assert fake_repository.created == []
    assert db.commits == 0


def test_reuses_existing_pending_delivery(fake_repository) -> None:
    db = FakeDb()
    target_date = date(2026, 5, 8)
    saved_policy = make_saved_policy(make_user(), make_policy(end_date=target_date))
    fake_repository.candidates_by_date[target_date] = [saved_policy]
    fake_repository.existing[delivery_key(target_deadline_date=target_date)] = (
        NotificationDelivery(
            id=92,
            user_id=7,
            policy_id=11,
            channel="kakao_alimtalk",
            lead_day=7,
            target_deadline_date=target_date,
            status="pending",
        )
    )

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=date(2026, 5, 1),
        lead_days=[7],
    )

    assert len(targets) == 1
    assert targets[0].deliveryId == 92
    assert targets[0].deliveryStatus == "pending"
    assert fake_repository.created == []
    assert db.commits == 0


def test_excludes_failed_delivery_until_retry_policy_exists(fake_repository) -> None:
    db = FakeDb()
    target_date = date(2026, 5, 8)
    saved_policy = make_saved_policy(make_user(), make_policy(end_date=target_date))
    fake_repository.candidates_by_date[target_date] = [saved_policy]
    fake_repository.existing[delivery_key(target_deadline_date=target_date)] = (
        NotificationDelivery(
            id=93,
            user_id=7,
            policy_id=11,
            channel="kakao_alimtalk",
            lead_day=7,
            target_deadline_date=target_date,
            status="failed",
        )
    )

    targets = delivery_service.calculate_deadline_notification_targets(
        db,
        today=date(2026, 5, 1),
        lead_days=[7],
    )

    assert targets == []
    assert fake_repository.created == []
    assert db.commits == 0
