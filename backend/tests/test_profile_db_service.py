from datetime import datetime

from app.models import User
from app.schemas.user import ProfileUpdate
from app.services import profile as profile_service


class FakeDb:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.flushed = False
        self.committed = False

    def add(self, value: object) -> None:
        self.added.append(value)

    def flush(self) -> None:
        self.flushed = True

    def commit(self) -> None:
        self.committed = True


def make_user() -> User:
    return User(
        id=1,
        email="jiyoung@travel.kr",
        nickname="지영",
        region="제주",
        travel_style="휴식",
        travel_budget="1인 40만원 이하",
        onboarding_completed=False,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def test_profile_to_api_uses_seed_defaults_for_missing_values() -> None:
    user = make_user()
    user.region = None
    user.travel_style = None
    user.travel_budget = None

    assert profile_service.profile_to_api(user) == {
        "region": "제주",
        "style": "휴식",
        "budget": "1인 40만원 이하",
    }


def test_update_profile_persists_partial_values_and_marks_onboarding_complete() -> None:
    db = FakeDb()
    user = make_user()

    result = profile_service.update_profile(
        db,  # type: ignore[arg-type]
        user,
        ProfileUpdate(region="부산"),
    )

    assert result == {"region": "부산", "style": "휴식", "budget": "1인 40만원 이하"}
    assert user.region == "부산"
    assert user.travel_style == "휴식"
    assert user.travel_budget == "1인 40만원 이하"
    assert user.onboarding_completed is True
    assert user.updated_at != datetime(2026, 5, 4, 0, 0, 0)
    assert db.added == [user]
    assert db.flushed is True
    assert db.committed is True


def test_update_profile_prefers_explicit_style_and_budget() -> None:
    db = FakeDb()
    user = make_user()

    result = profile_service.update_profile(
        db,  # type: ignore[arg-type]
        user,
        ProfileUpdate(style="맛집", budget="1인 30만원 이하"),
    )

    assert result == {"region": "제주", "style": "맛집", "budget": "1인 30만원 이하"}
    assert user.travel_style == "맛집"
    assert user.travel_budget == "1인 30만원 이하"
