from datetime import date, datetime, time, timedelta

from app.models import Policy, Recommendation, Trip, TripDay, TripMember, TripPlace, TripPolicy
from app.models import User as UserModel
from app.services import trips as trip_service


def make_user(user_id: int = 1, nickname: str = "Jiyoung") -> UserModel:
    return UserModel(
        id=user_id,
        email=f"user-{user_id}@travel.kr",
        nickname=nickname,
        onboarding_completed=True,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def make_trip() -> Trip:
    owner = make_user(1, "Jiyoung")
    friend = make_user(2, "Minseo")
    trip = Trip(
        id=7,
        owner_id=1,
        title="Jeju 3-day trip",
        start_date=date(2026, 6, 15),
        end_date=date(2026, 6, 17),
        region="Jeju",
        description="Rest trip",
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )

    owner_membership = TripMember(id=1, trip_id=7, user_id=1, role="owner")
    owner_membership.user = owner
    friend_membership = TripMember(id=2, trip_id=7, user_id=2, role="editor")
    friend_membership.user = friend
    trip.members = [friend_membership, owner_membership]

    day = TripDay(id=1, trip_id=7, day_number=1, date=date(2026, 6, 15))
    day.places = [
        TripPlace(
            id=1,
            trip_day_id=1,
            place_name="Sunrise peak",
            visit_time=time(9, 0),
            order_num=1,
            memo="Nature",
        )
    ]
    trip.days = [day]

    policy = Policy(id=3, slug="local-vacation", title="Vacation policy", benefit_amount=300000)
    trip_policy = TripPolicy(id=1, trip_id=7, policy_id=3)
    trip_policy.policy = policy
    trip.policies = [trip_policy]
    trip.invites = []
    trip.recommendations = []
    return trip


def test_trip_to_api_returns_numeric_string_id_and_contract_shape() -> None:
    payload = trip_service.trip_to_api(make_trip())

    assert payload["id"] == "7"
    assert payload["title"] == "Jeju 3-day trip"
    assert payload["dates"] == "2026.06.15 - 06.17"
    assert payload["people"] == ["Jiyoung", "Minseo"]
    assert payload["expectedSaving"] == "30만원"
    assert payload["days"] == {1: [{"time": "09:00", "label": "Sunrise peak", "meta": "Nature"}]}


def test_get_trip_resolves_numeric_id_and_legacy_alias(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_seed_alias_trip",
        lambda db, user_id: trip if db is fake_db and user_id == 1 else None,
    )

    numeric = trip_service.get_trip("7", fake_db, user)
    legacy = trip_service.get_trip("jeju-3-days", fake_db, user)
    missing = trip_service.get_trip("missing-trip", fake_db, user)

    assert numeric is not None
    assert numeric["id"] == "7"
    assert legacy is not None
    assert legacy["id"] == "7"
    assert missing is None


def test_recommendation_mapper_ignores_invalid_items() -> None:
    items = trip_service._recommendation_items(
        [
            {"label": "CA", "title": "Cafe", "meta": "Day 2", "reason": "Good route"},
            "invalid",
        ]
    )

    assert items == [{"label": "CA", "title": "Cafe", "meta": "Day 2", "reason": "Good route"}]


def test_invite_to_api_computes_display_flags() -> None:
    from app.models import TripInvite

    invite = TripInvite(
        id=9,
        trip_id=7,
        invite_token="abc",
        created_by=1,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        expires_at=datetime(2026, 5, 4, 0, 0, 0) + timedelta(days=30),
    )

    payload = trip_service.invite_to_api(invite, trip_id=7, invited=True)

    assert payload["id"] == "9"
    assert payload["tripId"] == "7"
    assert payload["inviteUrl"] == "travelhunter.app/i/abc"
    assert payload["invited"] is True
    assert payload["copied"] is False
