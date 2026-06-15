from datetime import date, datetime, time, timedelta

from app.models import Policy, Recommendation, Trip, TripDay, TripInvite, TripMember, TripPlace, TripPolicy
from app.models import User as UserModel
from app.schemas.trip import (
    CreateTripPlaceRequest,
    CreateTripRequest,
    MoveTripPlaceRequest,
    UpdateTripPlaceRequest,
    UpdateTripStatusRequest,
)
from app.services import trips as trip_service


def make_user(user_id: int = 1, nickname: str = "Test User") -> UserModel:
    return UserModel(
        id=user_id,
        email=f"user-{user_id}@travel.kr",
        nickname=nickname,
        onboarding_completed=True,
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )


def make_trip() -> Trip:
    owner = make_user(1, "Test User")
    friend = make_user(2, "Minseo")
    trip = Trip(
        id=7,
        owner_id=1,
        title="Jeju 3-day trip",
        status="confirmed",
        start_date=date(2026, 6, 15),
        end_date=date(2026, 6, 17),
        region="Jeju",
        description="Rest trip",
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        updated_at=datetime(2026, 5, 4, 0, 0, 0),
    )
    trip.owner = owner

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
    assert payload["status"] == "confirmed"
    assert payload["dates"] == "2026.06.15 - 06.17"
    assert payload["people"] == ["Test User", "Minseo"]
    assert payload["expectedSaving"] == "30만원"
    assert payload["linkedPolicies"] == [
        {
            "slug": "local-vacation",
            "title": "Vacation policy",
            "amount": "30만원",
            "region": "",
        }
    ]
    assert payload["days"] == {1: [{"id": "1", "time": "09:00", "label": "Sunrise peak", "meta": "Nature"}]}
    assert payload["currentUserRole"] == "owner"


def test_trip_to_api_includes_current_user_role() -> None:
    trip = make_trip()

    owner_payload = trip_service.trip_to_api(trip, make_user(1))
    editor_payload = trip_service.trip_to_api(trip, make_user(2))
    trip.members[0].role = "viewer"
    viewer_payload = trip_service.trip_to_api(trip, make_user(2))

    assert owner_payload["currentUserRole"] == "owner"
    assert editor_payload["currentUserRole"] == "editor"
    assert viewer_payload["currentUserRole"] == "viewer"


def test_trip_to_api_includes_owner_when_owner_is_not_a_member() -> None:
    trip = make_trip()
    trip.members = [member for member in trip.members if member.user_id != trip.owner_id]

    payload = trip_service.trip_to_api(trip)

    assert payload["people"] == ["Test User", "Minseo"]


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
        lambda db, **kwargs: trip
        if db is fake_db and kwargs["user_id"] == 1 and kwargs["owner_email"] == "test.user@example.com"
        else None,
    )

    numeric = trip_service.get_trip("7", fake_db, user)
    legacy = trip_service.get_trip("jeju-3-days", fake_db, user)
    missing = trip_service.get_trip("missing-trip", fake_db, user)

    assert numeric is not None
    assert numeric["id"] == "7"
    assert legacy is not None
    assert legacy["id"] == "7"
    assert missing is None


def test_get_trip_rejects_noncanonical_numeric_handles(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    calls: list[str] = []

    def unexpected_numeric_lookup(*_args):
        calls.append("numeric")
        return None

    def unexpected_alias_lookup(*_args, **_kwargs):
        calls.append("alias")
        return None

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        unexpected_numeric_lookup,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_seed_alias_trip",
        unexpected_alias_lookup,
    )

    assert trip_service.get_trip("001", fake_db, user) is None
    assert trip_service.get_trip("0", fake_db, user) is None
    assert trip_service.get_trip("1.0", fake_db, user) is None
    assert calls == []


class FakeDb:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1


def test_delete_trip_deletes_owned_numeric_trip_and_detaches_recommendations(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    detached: list[int] = []
    deleted: list[Trip] = []

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_owned_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "detach_recommendations_from_trip",
        lambda _db, *, trip_id: detached.append(trip_id),
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "delete_trip",
        lambda _db, target_trip: deleted.append(target_trip),
    )

    payload = trip_service.delete_trip("7", fake_db, user)

    assert payload == {"tripId": "7", "deleted": True}
    assert detached == [7]
    assert deleted == [trip]
    assert fake_db.commits == 1


def test_delete_trip_returns_none_for_missing_or_unowned_trip(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    lookup_calls: list[int] = []

    def missing_lookup(_db, trip_id, _user_id):
        lookup_calls.append(trip_id)
        return None

    monkeypatch.setattr(trip_service.trip_repository, "get_owned_trip_by_id", missing_lookup)

    assert trip_service.delete_trip("001", fake_db, user) is None
    assert trip_service.delete_trip("7", fake_db, user) is None
    assert lookup_calls == [7]
    assert fake_db.commits == 0


def test_update_trip_status_persists_confirmed_status(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    trip.status = "draft"
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    payload = trip_service.update_trip_status(
        fake_db,
        user,
        "7",
        UpdateTripStatusRequest(status="confirmed"),
    )

    assert trip.status == "confirmed"
    assert payload["status"] == "confirmed"
    assert fake_db.commits == 1


def test_viewer_member_cannot_update_trip_status(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user(2)
    trip = make_trip()
    trip.status = "draft"
    trip.members[0].role = "viewer"
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    try:
        trip_service.update_trip_status(
            fake_db,
            user,
            "7",
            UpdateTripStatusRequest(status="confirmed"),
        )
    except trip_service.TripServiceError as error:
        assert error.status_code == 403
        assert error.detail == "Trip edit permission required"
    else:
        raise AssertionError("expected TripServiceError")

    assert trip.status == "draft"
    assert fake_db.commits == 0


def test_add_place_to_trip_day_persists_place_and_returns_updated_trip(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )

    def add_place_stub(_db, **kwargs):
        captured.update(kwargs)
        place = TripPlace(
            id=2,
            trip_day_id=kwargs["trip_day_id"],
            place_name=kwargs["place_name"],
            visit_time=kwargs["visit_time"],
            order_num=kwargs["order_num"],
            memo=kwargs["memo"],
        )
        trip.days[0].places.append(place)
        return place

    monkeypatch.setattr(trip_service.trip_repository, "add_trip_place", add_place_stub)

    payload = trip_service.add_place_to_trip_day(
        fake_db,
        user,
        "7",
        1,
        CreateTripPlaceRequest(time="14:30", label="Cafe stop", meta="Dessert"),
    )

    assert captured["trip_day_id"] == 1
    assert captured["place_name"] == "Cafe stop"
    assert captured["visit_time"] == time(14, 30)
    assert captured["order_num"] == 2
    assert payload["days"][1][-1] == {"id": "2", "time": "14:30", "label": "Cafe stop", "meta": "Dessert"}
    assert fake_db.commits == 1


def test_update_trip_place_changes_existing_place(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    payload = trip_service.update_trip_place(
        fake_db,
        user,
        "7",
        1,
        UpdateTripPlaceRequest(time="10:15", label="Updated peak", meta="New memo"),
    )

    assert payload["days"][1][0] == {"id": "1", "time": "10:15", "label": "Updated peak", "meta": "New memo"}
    assert fake_db.commits == 1


def test_move_trip_place_reorders_places_within_same_day(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    trip.days[0].places.append(
        TripPlace(
            id=2,
            trip_day_id=1,
            place_name="Cafe stop",
            visit_time=time(14, 30),
            order_num=2,
            memo="Dessert",
        )
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    payload = trip_service.move_trip_place(
        fake_db,
        user,
        "7",
        2,
        MoveTripPlaceRequest(dayNumber=1, position=1),
    )

    assert [place.order_num for place in trip.days[0].places] == [1, 2]
    assert payload["days"][1][0]["label"] == "Cafe stop"
    assert payload["days"][1][1]["label"] == "Sunrise peak"
    assert fake_db.commits == 1


def test_move_trip_place_moves_place_to_another_day(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    second_day = TripDay(id=2, trip_id=7, day_number=2, date=date(2026, 6, 16))
    second_day.places = [
        TripPlace(
            id=2,
            trip_day_id=2,
            place_name="Lunch stop",
            visit_time=time(12, 0),
            order_num=1,
            memo="Food",
        )
    ]
    trip.days.append(second_day)
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    payload = trip_service.move_trip_place(
        fake_db,
        user,
        "7",
        1,
        MoveTripPlaceRequest(dayNumber=2, position=2),
    )

    moved_place = second_day.places[1]
    assert trip.days[0].places == []
    assert moved_place.id == 1
    assert moved_place.trip_day_id == 2
    assert [place.order_num for place in second_day.places] == [1, 2]
    assert payload["days"][2][-1]["label"] == "Sunrise peak"
    assert fake_db.commits == 1


def test_delete_trip_place_removes_existing_place(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    deleted: list[TripPlace] = []
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    def delete_place_stub(_db, place):
        deleted.append(place)
        trip.days[0].places.remove(place)

    monkeypatch.setattr(trip_service.trip_repository, "delete_trip_place", delete_place_stub)

    payload = trip_service.delete_trip_place(fake_db, user, "7", 1)

    assert deleted[0].id == 1
    assert payload["days"][1] == []
    assert fake_db.commits == 1


def test_trip_place_crud_returns_404_for_missing_day_or_place(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    for action in (
        lambda: trip_service.add_place_to_trip_day(
            fake_db,
            user,
            "7",
            99,
            CreateTripPlaceRequest(time="12:00", label="Missing day", meta=""),
        ),
        lambda: trip_service.update_trip_place(
            fake_db,
            user,
            "7",
            999,
            UpdateTripPlaceRequest(label="Missing place"),
        ),
        lambda: trip_service.delete_trip_place(fake_db, user, "7", 999),
        lambda: trip_service.move_trip_place(
            fake_db,
            user,
            "7",
            1,
            MoveTripPlaceRequest(dayNumber=99, position=1),
        ),
    ):
        try:
            action()
        except trip_service.TripServiceError as error:
            assert error.status_code == 404
            assert error.detail == "Trip not found"
        else:
            raise AssertionError("expected TripServiceError")

    assert fake_db.commits == 0


def test_move_trip_place_rejects_invalid_position(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    try:
        trip_service.move_trip_place(
            fake_db,
            user,
            "7",
            1,
            MoveTripPlaceRequest(dayNumber=1, position=2),
        )
    except trip_service.TripServiceError as error:
        assert error.status_code == 422
        assert error.detail == "Invalid place position"
    else:
        raise AssertionError("expected TripServiceError")

    assert fake_db.commits == 0


def test_viewer_member_cannot_edit_trip_places(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user(2)
    trip = make_trip()
    trip.members[0].role = "viewer"
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )

    for action in (
        lambda: trip_service.add_place_to_trip_day(
            fake_db,
            user,
            "7",
            1,
            CreateTripPlaceRequest(time="12:00", label="Viewer add", meta=""),
        ),
        lambda: trip_service.update_trip_place(
            fake_db,
            user,
            "7",
            1,
            UpdateTripPlaceRequest(label="Viewer edit"),
        ),
        lambda: trip_service.delete_trip_place(fake_db, user, "7", 1),
        lambda: trip_service.move_trip_place(
            fake_db,
            user,
            "7",
            1,
            MoveTripPlaceRequest(dayNumber=1, position=1),
        ),
    ):
        try:
            action()
        except trip_service.TripServiceError as error:
            assert error.status_code == 403
            assert error.detail == "Trip edit permission required"
        else:
            raise AssertionError("expected TripServiceError")

    assert fake_db.commits == 0


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
        role="viewer",
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        expires_at=datetime(2099, 5, 4, 0, 0, 0),
    )

    payload = trip_service.invite_to_api(invite, trip_id=7)

    assert payload["id"] == "9"
    assert payload["tripId"] == "7"
    assert payload["inviteUrl"] == "travelhunter.app/i/abc"
    assert payload["invited"] is True
    assert payload["copied"] is False
    assert payload["role"] == "viewer"


def test_confirm_invite_sent_updates_active_invite_role(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    invite = TripInvite(
        id=9,
        trip_id=7,
        invite_token="abc",
        created_by=1,
        role="editor",
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        expires_at=datetime(2026, 6, 30, 0, 0, 0),
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_latest_active_invite",
        lambda db, **kwargs: invite
        if db is fake_db and kwargs["trip_id"] == 7
        else None,
    )

    payload = trip_service.confirm_invite_sent(fake_db, user, "7", "viewer")

    assert payload is not None
    assert payload["role"] == "viewer"
    assert invite.role == "viewer"
    assert fake_db.commits == 1


def install_create_trip_stubs(monkeypatch, *, policy: Policy | None = None):
    captured: dict[str, object] = {"trip_days": []}
    created_trip = make_trip()
    created_trip.id = 11

    def create_trip_stub(db, **kwargs):
        captured["create_trip"] = kwargs
        created_trip.status = kwargs["status"]
        return created_trip

    def add_trip_day_stub(_db, *, trip_id, day_number, date_value):
        captured["trip_days"].append(
            {
                "trip_id": trip_id,
                "day_number": day_number,
                "date_value": date_value,
            }
        )
        return TripDay(id=day_number, trip_id=trip_id, day_number=day_number, date=date_value)

    monkeypatch.setattr(trip_service.trip_repository, "create_trip", create_trip_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_member", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_day", add_trip_day_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_place", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(trip_service.trip_repository, "add_recommendation", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(trip_service, "_ensure_invite", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: created_trip,
    )
    monkeypatch.setattr(trip_service.policy_repository, "get_policy_by_slug", lambda *_args, **_kwargs: policy)

    def add_trip_policy_stub(_db, **kwargs):
        captured["add_trip_policy"] = kwargs

    monkeypatch.setattr(trip_service.trip_repository, "add_trip_policy", add_trip_policy_stub)
    return captured


def test_create_trip_uses_region_and_style_payload(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    result = trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="Busan", style="Food"),
    )

    assert result["id"] == "11"
    assert result["status"] == "draft"
    assert captured["create_trip"]["status"] == "draft"
    assert captured["create_trip"]["title"] == "Busan 3일 여행"
    assert captured["create_trip"]["region"] == "Busan"
    assert captured["create_trip"]["description"] == "Food"
    assert fake_db.commits == 1


def test_create_trip_prefers_request_title_over_generated_title(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(title="Custom Trip", region="Busan", durationDays=4),
    )

    assert captured["create_trip"]["title"] == "Custom Trip"


def test_create_trip_prefers_description_over_style(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="Jeju", style="Food", description="Custom memo"),
    )

    assert captured["create_trip"]["description"] == "Custom memo"


def test_create_trip_uses_duration_days_for_date_range_and_days(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="Jeju", style="Rest", durationDays=4),
    )

    assert captured["create_trip"]["start_date"] == date(2026, 6, 15)
    assert captured["create_trip"]["end_date"] == date(2026, 6, 18)
    assert captured["trip_days"] == [
        {"trip_id": 11, "day_number": 1, "date_value": date(2026, 6, 15)},
        {"trip_id": 11, "day_number": 2, "date_value": date(2026, 6, 16)},
        {"trip_id": 11, "day_number": 3, "date_value": date(2026, 6, 17)},
        {"trip_id": 11, "day_number": 4, "date_value": date(2026, 6, 18)},
    ]


def test_create_trip_uses_request_date_range_for_dates_and_days(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="Busan", style="Food", startDate=date(2026, 7, 12), endDate=date(2026, 7, 15)),
    )

    assert captured["create_trip"]["title"] == "Busan 4일 여행"
    assert captured["create_trip"]["start_date"] == date(2026, 7, 12)
    assert captured["create_trip"]["end_date"] == date(2026, 7, 15)
    assert captured["trip_days"] == [
        {"trip_id": 11, "day_number": 1, "date_value": date(2026, 7, 12)},
        {"trip_id": 11, "day_number": 2, "date_value": date(2026, 7, 13)},
        {"trip_id": 11, "day_number": 3, "date_value": date(2026, 7, 14)},
        {"trip_id": 11, "day_number": 4, "date_value": date(2026, 7, 15)},
    ]


def test_create_trip_links_policy_when_policy_slug_is_present(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    policy = Policy(id=3, slug="local-vacation", title="Vacation policy", benefit_amount=300000)
    captured = install_create_trip_stubs(monkeypatch, policy=policy)

    trip_service.create_trip(fake_db, user, CreateTripRequest(policySlug="local-vacation"))

    assert captured["add_trip_policy"] == {"trip_id": 11, "policy_id": 3}


def test_create_trip_rejects_unknown_policy_slug(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    install_create_trip_stubs(monkeypatch, policy=None)

    try:
        trip_service.create_trip(fake_db, user, CreateTripRequest(policySlug="missing-policy"))
    except trip_service.TripServiceError as error:
        assert error.status_code == 404
        assert error.detail == "Policy not found"
    else:
        raise AssertionError("expected TripServiceError")

    assert fake_db.commits == 0


def test_accept_invite_marks_acceptance_and_adds_member(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user(3, "Friend")
    invite = TripInvite(
        id=9,
        trip_id=7,
        invite_token="abc",
        created_by=1,
        role="viewer",
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        expires_at=datetime(2026, 6, 30, 0, 0, 0),
        accepted_at=None,
    )
    captured_membership: dict[str, object] = {}

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_active_invite_by_token",
        lambda db, *, invite_token, now: invite
        if db is fake_db and invite_token == "abc"
        else None,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_trip_member",
        lambda *_args, **_kwargs: None,
    )

    def add_member_stub(_db, **kwargs):
        captured_membership.update(kwargs)

    monkeypatch.setattr(trip_service.trip_repository, "add_trip_member", add_member_stub)

    payload = trip_service.accept_invite(fake_db, user, "abc")

    assert payload is not None
    assert payload["tripId"] == "7"
    assert payload["acceptedAt"] is not None
    assert payload["invited"] is True
    assert invite.accepted_at is not None
    assert captured_membership == {"trip_id": 7, "user_id": 3, "role": "viewer"}
    assert fake_db.commits == 1


def test_accept_invite_is_idempotent_for_existing_member(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user(3, "Friend")
    accepted_at = datetime(2026, 5, 5, 0, 0, 0)
    invite = TripInvite(
        id=9,
        trip_id=7,
        invite_token="abc",
        created_by=1,
        role="editor",
        created_at=datetime(2026, 5, 4, 0, 0, 0),
        expires_at=datetime(2026, 6, 30, 0, 0, 0),
        accepted_at=accepted_at,
    )
    added_members: list[dict[str, object]] = []

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_active_invite_by_token",
        lambda *_args, **_kwargs: invite,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_trip_member",
        lambda *_args, **_kwargs: TripMember(id=4, trip_id=7, user_id=3, role="editor"),
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "add_trip_member",
        lambda _db, **kwargs: added_members.append(kwargs),
    )

    payload = trip_service.accept_invite(fake_db, user, "abc")

    assert payload is not None
    assert payload["acceptedAt"] == "2026-05-05T00:00:00Z"
    assert invite.accepted_at == accepted_at
    assert added_members == []
    assert fake_db.commits == 1


def test_accept_invite_returns_none_for_missing_or_expired_token(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user(3, "Friend")
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_active_invite_by_token",
        lambda *_args, **_kwargs: None,
    )

    assert trip_service.accept_invite(fake_db, user, "missing") is None
    assert fake_db.commits == 0
