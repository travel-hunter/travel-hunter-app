from datetime import date, datetime, time, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest
from sqlalchemy import BigInteger, Integer, create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models import ExternalSourceRecord, Policy, Recommendation, Trip, TripDay, TripInvite, TripMember, TripPlace, TripPolicy
from app.models import User as UserModel
from app.schemas.trip import (
    CreateTripPlaceRequest,
    CreateTripRequest,
    MoveTripPlaceRequest,
    UpdateTripPlaceRequest,
    UpdateTripStatusRequest,
)
from app.services.kakao_local import KakaoLocalPlace
from app.services import itinerary_recommendations, trips as trip_service


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
        travel_area_id=None,
        participant_count=2,
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

    policy = Policy(id=3, slug="fixture-policy", title="Vacation policy", benefit_amount=300000)
    trip_policy = TripPolicy(id=1, trip_id=7, policy_id=3)
    trip_policy.policy = policy
    trip.policies = [trip_policy]
    trip.invites = []
    trip.recommendations = []
    return trip


def test_trip_to_api_includes_place_map_metadata(monkeypatch) -> None:
    trip = make_trip()
    day = TripDay(id=10, trip_id=7, day_number=1, date=date(2026, 7, 12))
    place = TripPlace(
        id=99,
        trip_day_id=10,
        place_name="강원 속초 맛집",
        address="강원 속초시 중앙로 47",
        latitude=Decimal("38.2041234"),
        longitude=Decimal("128.5901234"),
        visit_time=time(13, 0),
        order_num=1,
        memo="식사 추천 장소",
    )
    place.category_group_code = "FD6"
    place.category_group_name = "음식점"
    place.place_url = "http://place.map.kakao.com/12345"
    place.source_provider = "kakao_local"
    place.external_place_id = "12345"
    day.places = [place]
    trip.days = [day]
    trip.members = []
    trip.policies = []
    trip.recommendations = []

    payload = trip_service.trip_to_api(trip, make_user(1), recommended_policies=[])

    api_place = payload["days"][1][0]
    assert api_place["address"] == "강원 속초시 중앙로 47"
    assert api_place["latitude"] == 38.2041234
    assert api_place["longitude"] == 128.5901234
    assert api_place["category"] == "음식점"
    assert api_place["categoryCode"] == "FD6"
    assert api_place["placeUrl"] == "http://place.map.kakao.com/12345"
    assert api_place["sourceProvider"] == "kakao_local"
    assert api_place["externalPlaceId"] == "12345"


def test_trip_to_api_returns_numeric_string_id_and_contract_shape() -> None:
    payload = trip_service.trip_to_api(make_trip())

    assert payload["id"] == "7"
    assert payload["title"] == "Jeju 3-day trip"
    assert payload["status"] == "confirmed"
    assert payload["travelAreaId"] is None
    assert payload["dates"] == "2026.06.15 - 06.17"
    assert payload["people"] == ["Test User", "Minseo"]
    assert payload["participantCount"] == 2
    assert payload["expectedSaving"] == "30만원"
    assert payload["linkedPolicies"] == [
        {
            "slug": "fixture-policy",
            "title": "Vacation policy",
            "amount": "30만원",
            "region": "",
            "status": "active",
        }
    ]
    place = payload["days"][1][0]
    assert place["id"] == "1"
    assert place["time"] == "09:00"
    assert place["label"] == "Sunrise peak"
    assert place["meta"] == "Nature"
    assert place["address"] is None
    assert place["latitude"] is None
    assert place["longitude"] is None
    assert place["category"] is None
    assert place["categoryCode"] is None
    assert place["placeUrl"] is None
    assert place["sourceProvider"] is None
    assert place["externalPlaceId"] is None
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


def test_get_trip_resolves_numeric_id_only(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )

    numeric = trip_service.get_trip("7", fake_db, user)
    missing_numeric = trip_service.get_trip("8", fake_db, user)

    assert numeric is not None
    assert numeric["id"] == "7"
    assert missing_numeric is None


def test_get_trip_includes_region_matched_recommended_policies(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()
    trip.region = "부산"
    trip.title = "부산 3일 여행"
    linked_policy = trip.policies[0].policy
    linked_policy.slug = "fixture-policy"
    linked_policy.title = "지역사랑 휴가지원"
    linked_policy.region = "전국"
    recommended_policy = Policy(
        id=4,
        slug="fixture-busan-cashback",
        title="부산 여행 캐시백",
        benefit_detail="카드 결제 5% 캐시백",
        region="부산",
        end_date=date(2026, 6, 30),
    )
    other_policy = Policy(
        id=5,
        slug="gangwon-stay",
        title="속초 숙박 할인권",
        benefit_detail="숙박비 50% 할인",
        region="강원",
        end_date=date(2026, 6, 30),
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "list_policies",
        lambda db: [linked_policy, other_policy, recommended_policy] if db is fake_db else [],
    )

    payload = trip_service.get_trip("7", fake_db, user)

    assert payload is not None
    assert payload["recommendedPolicies"] == [
        {
            "slug": "fixture-busan-cashback",
            "title": "부산 여행 캐시백",
            "amount": "카드 결제 5% 캐시백",
            "region": "부산",
        }
    ]


def test_get_trip_recommendations_prioritize_travel_area_terms(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()
    trip.region = "\uc18d\ucd08\u00b7\uace0\uc131\u00b7\uc591\uc591"
    trip.travel_area_id = "gangwon-sokcho-goseong-yangyang"
    linked_policy = trip.policies[0].policy
    linked_policy.slug = "fixture-policy"
    linked_policy.title = "\uc774\ubbf8 \uc5f0\uacb0\ub41c \uc815\ucc45"
    linked_policy.region = "\uc804\uad6d"
    jeju_family_policy = Policy(
        id=4,
        slug="jeju-family-stay",
        title="\uc548\uc804 \uc778\uc99d \ub18d\uc5b4\ucd0c\ubbfc\ubc15 \uc774\uc6a9 \ub2e4\uc790\ub140\uac00\uad6c \uc81c\uc8fc\uc5ec\ud589 \ud658\uc601 \ucea0\ud398\uc778",
        benefit_detail="\uc219\ubc15\ube44 4\ub9cc\uc6d0 \uc9c0\uc6d0",
        benefit_amount=40000,
        region="\uc804\uad6d",
        end_date=date(2026, 5, 31),
    )
    sokcho_policy = Policy(
        id=5,
        slug="sokcho-stay",
        title="\uc18d\ucd08 \uc219\ubc15 \ud560\uc778",
        benefit_detail="\uc18d\ucd08 \uc219\ubc15\ube44 \ud560\uc778",
        benefit_amount=0,
        region="\uac15\uc6d0",
        end_date=date(2026, 7, 31),
    )
    yangyang_policy = Policy(
        id=6,
        slug="yangyang-experience",
        title="\uc591\uc591 \ubc14\ub2e4 \uccb4\ud5d8 \ud560\uc778",
        benefit_detail="\uc591\uc591 \uccb4\ud5d8\uad8c \ud560\uc778",
        benefit_amount=0,
        region="\uc804\uad6d",
        end_date=date(2026, 8, 31),
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "list_policies",
        lambda db: [linked_policy, jeju_family_policy, sokcho_policy, yangyang_policy] if db is fake_db else [],
    )

    payload = trip_service.get_trip("7", fake_db, user)

    assert payload is not None
    assert [policy["slug"] for policy in payload["recommendedPolicies"]] == ["sokcho-stay", "yangyang-experience"]


def test_get_trip_recommendations_downrank_unverified_conditional_policies(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()
    trip.region = "\uc18d\ucd08\u00b7\uace0\uc131\u00b7\uc591\uc591"
    trip.travel_area_id = "gangwon-sokcho-goseong-yangyang"
    linked_policy = trip.policies[0].policy
    linked_policy.slug = "fixture-policy"
    linked_policy.region = "\uc804\uad6d"
    general_policy = Policy(
        id=4,
        slug="sokcho-general-stay",
        title="\uc18d\ucd08 \uc219\ubc15 \ud560\uc778",
        benefit_detail="\uc18d\ucd08 \uc219\ubc15\ube44 \ud560\uc778",
        benefit_amount=0,
        region="\uc804\uad6d",
        end_date=date(2026, 8, 31),
    )
    youth_policy = Policy(
        id=5,
        slug="sokcho-youth-stay",
        title="\uc18d\ucd08 \uccad\ub144 \uc219\ubc15 \ud560\uc778",
        benefit_detail="\uc18d\ucd08 \uccad\ub144 \uc804\uc6a9 \uc219\ubc15\ube44 5\ub9cc\uc6d0 \uc9c0\uc6d0",
        benefit_amount=50000,
        region="\uc804\uad6d",
        end_date=date(2026, 5, 31),
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "list_policies",
        lambda db: [linked_policy, youth_policy, general_policy] if db is fake_db else [],
    )

    payload = trip_service.get_trip("7", fake_db, user)

    assert payload is not None
    assert [policy["slug"] for policy in payload["recommendedPolicies"]] == ["sokcho-general-stay", "sokcho-youth-stay"]


def test_get_trip_recommendations_return_up_to_three_area_matched_policies(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()
    trip.region = "\uc18d\ucd08\u00b7\uace0\uc131\u00b7\uc591\uc591"
    trip.travel_area_id = "gangwon-sokcho-goseong-yangyang"
    linked_policy = trip.policies[0].policy
    linked_policy.slug = "fixture-policy"
    linked_policy.region = "\uc804\uad6d"
    policies = [
        linked_policy,
        Policy(id=4, slug="sokcho-stay", title="\uc18d\ucd08 \uc219\ubc15 \ud560\uc778", benefit_detail="\uc18d\ucd08 \uc219\ubc15\ube44 \ud560\uc778", region="\uac15\uc6d0", end_date=date(2026, 7, 31)),
        Policy(id=5, slug="goseong-cafe", title="\uace0\uc131 \uce74\ud398 \ud560\uc778", benefit_detail="\uace0\uc131 \uce74\ud398 \uc774\uc6a9\uad8c", region="\uc804\uad6d", end_date=date(2026, 8, 31)),
        Policy(id=6, slug="yangyang-surf", title="\uc591\uc591 \uc11c\ud551 \uccb4\ud5d8 \ud560\uc778", benefit_detail="\uc591\uc591 \uccb4\ud5d8\uad8c", region="\uc804\uad6d", end_date=date(2026, 9, 30)),
        Policy(id=7, slug="gangwon-extra", title="\uac15\uc6d0 \uc5ec\ud589 \uc0c1\ud488 \ud560\uc778", benefit_detail="\uac15\uc6d0 \uc5ec\ud589 \ud560\uc778", region="\uac15\uc6d0", end_date=date(2026, 10, 31)),
    ]

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "list_policies",
        lambda db: policies if db is fake_db else [],
    )

    payload = trip_service.get_trip("7", fake_db, user)

    assert payload is not None
    assert [policy["slug"] for policy in payload["recommendedPolicies"]] == ["sokcho-stay", "gangwon-extra", "goseong-cafe"]


def test_get_trip_recommendations_hide_candidates_below_area_score_threshold(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()
    trip.region = "\uc18d\ucd08\u00b7\uace0\uc131\u00b7\uc591\uc591"
    trip.travel_area_id = "gangwon-sokcho-goseong-yangyang"
    linked_policy = trip.policies[0].policy
    linked_policy.slug = "fixture-policy"
    linked_policy.region = "\uc804\uad6d"
    jeju_family_policy = Policy(
        id=4,
        slug="jeju-family-stay",
        title="\uc548\uc804 \uc778\uc99d \ub18d\uc5b4\ucd0c\ubbfc\ubc15 \uc774\uc6a9 \ub2e4\uc790\ub140\uac00\uad6c \uc81c\uc8fc\uc5ec\ud589 \ud658\uc601 \ucea0\ud398\uc778",
        benefit_detail="\uc81c\uc8fc \uc219\ubc15\ube44 4\ub9cc\uc6d0 \uc9c0\uc6d0",
        benefit_amount=40000,
        region="\uc804\uad6d",
        end_date=date(2026, 5, 31),
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "list_policies",
        lambda db: [linked_policy, jeju_family_policy] if db is fake_db else [],
    )

    payload = trip_service.get_trip("7", fake_db, user)

    assert payload is not None
    assert payload["recommendedPolicies"] == []


def test_get_trip_recommendations_ignore_raw_collected_benefits(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()
    trip.region = "부산"
    external_record = ExternalSourceRecord(
        id=58,
        title="부산 야간관광 여행가는 달 할인",
        region="부산",
        is_nationwide=False,
        benefit_text="부산 야간관광 상품 할인",
        benefit_value_text="최대 2만원",
        end_date=date(2026, 6, 30),
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "list_policies",
        lambda db: [] if db is fake_db else [],
    )
    payload = trip_service.get_trip("7", fake_db, user)

    assert payload is not None
    assert payload["recommendedPolicies"] == []
    return

    assert payload["recommendedPolicies"] == [
        {
            "slug": "travelmonth-58",
            "title": "부산 야간관광 여행가는 달 할인",
            "amount": "최대 2만원",
            "region": "부산",
        }
    ]


def test_get_trip_recommends_normalized_travelmonth_policy(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    trip = make_trip()
    trip.region = "Busan"
    normalized_policy = Policy(
        id=58,
        slug="travelmonth-58",
        title="Busan official benefit",
        benefit_detail="Up to 20,000 KRW",
        region="Busan",
        end_date=date(2026, 6, 30),
        source_category="regional_benefit",
        external_source_record_id=58,
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip if db is fake_db and trip_id == 7 and user_id == 1 else None,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "list_policies",
        lambda db: [normalized_policy] if db is fake_db else [],
    )
    payload = trip_service.get_trip("7", fake_db, user)

    assert payload is not None
    assert payload["recommendedPolicies"] == [
        {
            "slug": "travelmonth-58",
            "title": "Busan official benefit",
            "amount": "Up to 20,000 KRW",
            "region": "Busan",
        }
    ]


def test_get_trip_rejects_noncanonical_and_non_numeric_handles(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    calls: list[str] = []
    non_numeric_handle = "-".join(["jeju", "3", "days"])

    def unexpected_numeric_lookup(*_args):
        calls.append("numeric")
        return None

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        unexpected_numeric_lookup,
    )

    assert trip_service.get_trip(non_numeric_handle, fake_db, user) is None
    assert trip_service.get_trip("missing-trip", fake_db, user) is None
    assert trip_service.get_trip("001", fake_db, user) is None
    assert trip_service.get_trip("0", fake_db, user) is None
    assert trip_service.get_trip("1.0", fake_db, user) is None
    assert calls == []


class FakeDb:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1


@pytest.fixture
def sqlite_db_session():
    engine = create_engine("sqlite:///:memory:")
    mutated_columns = []
    for table in Base.metadata.tables.values():
        for column in table.c:
            if column.primary_key and isinstance(column.type, BigInteger):
                mutated_columns.append((column, column.type))
                column.type = Integer()

    try:
        Base.metadata.create_all(engine)
        TestingSessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
        with TestingSessionLocal() as session:
            yield session
        Base.metadata.drop_all(engine)
    finally:
        for column, original_type in mutated_columns:
            column.type = original_type


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


def test_viewer_member_cannot_add_policy_to_trip(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user(2)
    trip = make_trip()
    trip.members[0].role = "viewer"
    policy = Policy(id=4, slug="travelmonth-58", title="Official benefit")
    added_links: list[dict[str, int]] = []
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "get_policy_by_slug",
        lambda *_args, **_kwargs: policy,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "add_trip_policy",
        lambda _db, **kwargs: added_links.append(kwargs),
    )

    try:
        trip_service.add_policy_to_trip(fake_db, user, "7", "travelmonth-58")
    except trip_service.TripServiceError as error:
        assert error.status_code == 403
        assert error.detail == "Trip edit permission required"
    else:
        raise AssertionError("expected TripServiceError")

    assert added_links == []
    assert fake_db.commits == 0


def test_remove_policy_from_trip_deletes_existing_link(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    policy = trip.policies[0].policy
    removed_links: list[TripPolicy] = []

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda *_args, **_kwargs: trip,
    )
    monkeypatch.setattr(
        trip_service.policy_repository,
        "get_policy_by_slug",
        lambda *_args, **_kwargs: policy,
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_trip_policy",
        lambda *_args, **_kwargs: trip.policies[0],
    )
    monkeypatch.setattr(
        trip_service.trip_repository,
        "remove_trip_policy",
        lambda _db, link: removed_links.append(link),
    )

    result = trip_service.remove_policy_from_trip(fake_db, user, "7", "fixture-policy")

    assert result == {"tripId": "7", "policyId": "fixture-policy", "added": False}
    assert removed_links == [trip.policies[0]]
    assert fake_db.commits == 1


def test_remove_policy_from_trip_is_idempotent_when_link_missing(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    policy = trip.policies[0].policy
    removed_links: list[TripPolicy] = []

    monkeypatch.setattr(trip_service.trip_repository, "get_accessible_trip_by_id", lambda *_args, **_kwargs: trip)
    monkeypatch.setattr(trip_service.policy_repository, "get_policy_by_slug", lambda *_args, **_kwargs: policy)
    monkeypatch.setattr(trip_service.trip_repository, "get_trip_policy", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(trip_service.trip_repository, "remove_trip_policy", lambda _db, link: removed_links.append(link))

    result = trip_service.remove_policy_from_trip(fake_db, user, "7", "fixture-policy")

    assert result == {"tripId": "7", "policyId": "fixture-policy", "added": False}
    assert removed_links == []
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
            address=kwargs["address"],
            latitude=Decimal(str(kwargs["latitude"])) if kwargs["latitude"] is not None else None,
            longitude=Decimal(str(kwargs["longitude"])) if kwargs["longitude"] is not None else None,
            visit_time=kwargs["visit_time"],
            order_num=kwargs["order_num"],
            memo=kwargs["memo"],
        )
        place.category_group_code = kwargs["category_group_code"]
        place.category_group_name = kwargs["category_group_name"]
        place.place_url = kwargs["place_url"]
        place.source_provider = kwargs["source_provider"]
        place.external_place_id = kwargs["external_place_id"]
        trip.days[0].places.append(place)
        return place

    monkeypatch.setattr(trip_service.trip_repository, "add_trip_place", add_place_stub)

    payload = trip_service.add_place_to_trip_day(
        fake_db,
        user,
        "7",
        1,
        CreateTripPlaceRequest(
            time="14:30",
            label="Cafe stop",
            meta="Dessert",
            address="Gangwon road 1",
            latitude=38.1,
            longitude=128.6,
            category="Food",
            categoryCode="FD6",
            placeUrl="http://place.map.kakao.com/food-1",
            sourceProvider="kakao_local",
            externalPlaceId="food-1",
        ),
    )

    assert captured["trip_day_id"] == 1
    assert captured["place_name"] == "Cafe stop"
    assert captured["visit_time"] == time(14, 30)
    assert captured["order_num"] == 2
    assert captured["address"] == "Gangwon road 1"
    assert captured["latitude"] == 38.1
    assert captured["longitude"] == 128.6
    assert captured["category_group_name"] == "Food"
    assert captured["category_group_code"] == "FD6"
    assert captured["place_url"] == "http://place.map.kakao.com/food-1"
    assert captured["source_provider"] == "kakao_local"
    assert captured["external_place_id"] == "food-1"
    added = payload["days"][1][-1]
    assert added["id"] == "2"
    assert added["time"] == "14:30"
    assert added["label"] == "Cafe stop"
    assert added["meta"] == "Dessert"
    assert added["address"] == "Gangwon road 1"
    assert added["categoryCode"] == "FD6"
    assert added["sourceProvider"] == "kakao_local"
    assert added["externalPlaceId"] == "food-1"
    assert fake_db.commits == 1


class FakeRecommendationProvider:
    def __init__(self, candidates_by_code):
        self.candidates_by_code = candidates_by_code

    def search(self, *, area_name: str, city: str, category_group_code: str):
        return list(self.candidates_by_code.get(category_group_code, []))


def _recommendation_candidate(external_id: str, title: str, category_code: str = "FD6"):
    return itinerary_recommendations.ExternalPlaceCandidate(
        source_provider="kakao_local",
        external_place_id=external_id,
        title=title,
        category_group_code=category_code,
        category_group_name="Food" if category_code == "FD6" else "Attraction",
        address="Jeju road 1",
        latitude=33.4,
        longitude=126.5,
        place_url=f"http://place.map.kakao.com/{external_id}",
    )


def test_list_recommendations_excludes_existing_trip_places(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    trip.days[0].places[0].source_provider = "kakao_local"
    trip.days[0].places[0].external_place_id = "same-place"
    trip.days[0].places[0].place_name = "Existing Food"
    provider = FakeRecommendationProvider(
        {
            "FD6": [
                _recommendation_candidate("same-place", "Different title"),
                _recommendation_candidate("new-title", "Existing Food"),
                _recommendation_candidate("new-food", "New Food"),
            ]
        }
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )
    monkeypatch.setattr(trip_service, "_build_external_place_provider", lambda: provider)

    items = trip_service.list_recommendations(fake_db, user, "7")

    assert items is not None
    assert [item["externalPlaceId"] for item in items] == ["new-food"]
    assert items[0]["categoryGroup"] == "food"
    assert items[0]["suggestedDay"] == 1
    assert items[0]["sourceType"] == "freshCandidate"


def test_list_recommendations_marks_saved_summary_fallback(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    stored_recommendation = Recommendation(
        id=1,
        user_id=user.id,
        trip_id=trip.id,
        query="trip_create",
        result=[
            {
                "label": "attraction",
                "title": "Saved summary spot",
                "meta": "Day 1",
                "reason": "일정 생성 시 저장된 추천 요약입니다.",
            }
        ],
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )
    monkeypatch.setattr(trip_service, "_build_external_place_provider", lambda: None)
    monkeypatch.setattr(
        trip_service.trip_repository,
        "list_recommendations",
        lambda db, trip_id, user_id: [stored_recommendation]
        if db is fake_db and trip_id == 7 and user_id == 1
        else [],
    )

    items = trip_service.list_recommendations(fake_db, user, "7")

    assert items is not None
    assert items[0]["title"] == "Saved summary spot"
    assert items[0]["sourceType"] == "savedSummary"


def test_list_recommendations_backfills_to_ten_after_duplicate_filtering(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    trip.days[0].places[0].source_provider = "kakao_local"
    trip.days[0].places[0].external_place_id = "spot-1"
    trip.days[0].places[0].place_name = "Spot 1"
    provider = FakeRecommendationProvider(
        {
            "AT4": [
                _recommendation_candidate(f"spot-{index}", f"Spot {index}", "AT4")
                for index in range(1, 8)
            ],
            "FD6": [
                _recommendation_candidate(f"food-{index}", f"Food {index}", "FD6")
                for index in range(1, 8)
            ],
            "CE7": [
                _recommendation_candidate(f"cafe-{index}", f"Cafe {index}", "CE7")
                for index in range(1, 5)
            ],
            "AD5": [
                _recommendation_candidate(f"stay-{index}", f"Stay {index}", "AD5")
                for index in range(1, 5)
            ],
        }
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )
    monkeypatch.setattr(trip_service, "_build_external_place_provider", lambda: provider)

    items = trip_service.list_recommendations(fake_db, user, "7")

    assert items is not None
    counts: dict[str, int] = {}
    for item in items:
        counts[str(item["categoryGroup"])] = counts.get(str(item["categoryGroup"]), 0) + 1
    assert len(items) >= 10
    assert all(item["externalPlaceId"] != "spot-1" for item in items)
    assert counts["attraction"] >= 3
    assert counts["food"] >= 3
    assert counts["stay"] >= 2


def test_list_recommendations_filters_duplicates_before_final_ten_slice(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    duplicate_specs = [
        *(("spot", index, "Spot") for index in range(1, 4)),
        *(("food", index, "Food") for index in range(1, 4)),
        *(("stay", index, "Stay") for index in range(1, 3)),
        ("spot", 4, "Spot"),
    ]
    trip.days[0].places = [
        TripPlace(
            id=index,
            trip_day_id=1,
            place_name=f"{title_prefix} {candidate_index}",
            visit_time=time(9, 0),
            order_num=index,
            source_provider="kakao_local",
            external_place_id=f"{prefix}-{candidate_index}",
        )
        for index, (prefix, candidate_index, title_prefix) in enumerate(duplicate_specs, start=1)
    ]
    provider = FakeRecommendationProvider(
        {
            "AT4": [
                _recommendation_candidate(f"spot-{index}", f"Spot {index}", "AT4")
                for index in range(1, 7)
            ],
            "FD6": [
                _recommendation_candidate(f"food-{index}", f"Food {index}", "FD6")
                for index in range(1, 7)
            ],
            "CE7": [
                _recommendation_candidate(f"cafe-{index}", f"Cafe {index}", "CE7")
                for index in range(1, 7)
            ],
            "AD5": [
                _recommendation_candidate(f"stay-{index}", f"Stay {index}", "AD5")
                for index in range(1, 6)
            ],
        }
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )
    monkeypatch.setattr(trip_service, "_build_external_place_provider", lambda: provider)

    items = trip_service.list_recommendations(fake_db, user, "7")

    assert items is not None
    assert len(items) >= 10
    returned_ids = {item["externalPlaceId"] for item in items}
    duplicate_ids = {f"{prefix}-{index}" for prefix, index, _title_prefix in duplicate_specs}
    assert returned_ids.isdisjoint(duplicate_ids)


def test_list_recommendations_assigns_suggested_day_round_robin(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    trip = make_trip()
    day_two = TripDay(id=2, trip_id=7, day_number=2, date=date(2026, 6, 16))
    day_two.places = []
    trip.days.append(day_two)
    provider = FakeRecommendationProvider(
        {
            "FD6": [
                _recommendation_candidate("food-1", "Food 1"),
                _recommendation_candidate("food-2", "Food 2"),
            ],
            "AT4": [_recommendation_candidate("spot-1", "Spot 1", "AT4")],
        }
    )

    monkeypatch.setattr(
        trip_service.trip_repository,
        "get_accessible_trip_by_id",
        lambda db, trip_id, user_id: trip
        if db is fake_db and trip_id == 7 and user_id == 1
        else None,
    )
    monkeypatch.setattr(trip_service, "_build_external_place_provider", lambda: provider)

    items = trip_service.list_recommendations(fake_db, user, "7")

    assert items is not None
    assert [item["suggestedDay"] for item in items[:3]] == [1, 2, 1]


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

    updated = payload["days"][1][0]
    assert updated["id"] == "1"
    assert updated["time"] == "10:15"
    assert updated["label"] == "Updated peak"
    assert updated["meta"] == "New memo"
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


def test_repository_add_trip_place_accepts_kakao_metadata(sqlite_db_session) -> None:
    user = UserModel(
        email="owner@example.com",
        password_hash="hashed",
        nickname="Owner",
        onboarding_completed=True,
    )
    sqlite_db_session.add(user)
    sqlite_db_session.flush()

    trip = trip_service.trip_repository.create_trip(
        sqlite_db_session,
        owner_id=user.id,
        title="속초",
        start_date=date(2026, 7, 12),
        end_date=date(2026, 7, 13),
        status="draft",
        region="강원 속초시",
        travel_area_id="gangwon-sokcho-goseong-yangyang",
        participant_count=2,
        description="식사 위주",
    )
    trip_day = trip_service.trip_repository.add_trip_day(
        sqlite_db_session,
        trip_id=trip.id,
        day_number=1,
        date_value=date(2026, 7, 12),
    )

    place = trip_service.trip_repository.add_trip_place(
        sqlite_db_session,
        trip_day_id=trip_day.id,
        place_name="속초 중앙시장",
        visit_time=time(13, 0),
        order_num=1,
        memo="식사 추천 장소",
        address="강원 속초시 중앙로 47",
        latitude=Decimal("38.2041234"),
        longitude=Decimal("128.5901234"),
        source_provider="kakao_local",
        external_place_id="12345",
        category_group_code="FD6",
        category_group_name="음식점",
        place_url="http://place.map.kakao.com/12345",
    )

    assert place.source_provider == "kakao_local"
    assert place.external_place_id == "12345"
    assert place.category_group_code == "FD6"
    assert place.category_group_name == "음식점"
    assert place.place_url == "http://place.map.kakao.com/12345"
    assert str(place.latitude) == "38.2041234"
    assert str(place.longitude) == "128.5901234"


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

    assert items == [
        {
            "label": "CA",
            "title": "Cafe",
            "meta": "Day 2",
            "reason": "Good route",
            "sourceType": "savedSummary",
        }
    ]


def test_invite_to_api_computes_display_flags() -> None:
    from app.models import TripInvite

    now = trip_service.security.utc_now_naive()
    invite = TripInvite(
        id=9,
        trip_id=7,
        invite_token="abc",
        created_by=1,
        role="viewer",
        created_at=now - timedelta(days=1),
        expires_at=now + timedelta(days=30),
    )

    payload = trip_service.invite_to_api(invite, trip_id=7)

    assert payload["id"] == "9"
    assert payload["tripId"] == "7"
    assert payload["inviteUrl"] == "http://127.0.0.1:5173/invites/abc/accept"
    assert payload["invited"] is True
    assert payload["copied"] is False
    assert payload["role"] == "viewer"


def test_invite_to_api_uses_public_frontend_base_url(monkeypatch) -> None:
    from app.models import TripInvite

    class PublicSettings:
        def frontend_base_url(self) -> str:
            return "https://travel-hunter.co.kr"

    monkeypatch.setattr(trip_service, "settings", PublicSettings())
    now = trip_service.security.utc_now_naive()
    invite = TripInvite(
        id=9,
        trip_id=7,
        invite_token="abc",
        created_by=1,
        role="viewer",
        created_at=now - timedelta(days=1),
        expires_at=now + timedelta(days=30),
    )

    payload = trip_service.invite_to_api(invite, trip_id=7)

    assert payload["inviteUrl"] == "https://travel-hunter.co.kr/invites/abc/accept"


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
    captured: dict[str, object] = {"trip_days": [], "trip_places": [], "recommendations": []}
    created_trip = make_trip()
    created_trip.id = 11

    def create_trip_stub(db, **kwargs):
        captured["create_trip"] = kwargs
        created_trip.status = kwargs["status"]
        created_trip.title = kwargs["title"]
        created_trip.start_date = kwargs["start_date"]
        created_trip.end_date = kwargs["end_date"]
        created_trip.region = kwargs["region"]
        created_trip.travel_area_id = kwargs["travel_area_id"]
        created_trip.participant_count = kwargs["participant_count"]
        created_trip.description = kwargs["description"]
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

    def add_trip_place_stub(_db, **kwargs):
        captured["trip_places"].append(kwargs)

    def add_recommendation_stub(_db, **kwargs):
        captured["recommendations"].append(kwargs)

    monkeypatch.setattr(trip_service.trip_repository, "create_trip", create_trip_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_member", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_day", add_trip_day_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_trip_place", add_trip_place_stub)
    monkeypatch.setattr(trip_service.trip_repository, "add_recommendation", add_recommendation_stub)
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


def test_create_trip_with_travel_area_id_stores_resolved_area(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)
    area = SimpleNamespace(
        id="gangwon-sokcho-goseong-yangyang",
        name="Sokcho-Goseong-Yangyang",
    )
    monkeypatch.setattr(trip_service, "get_travel_area", lambda area_id: area if area_id == area.id else None)

    created = trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(
            travelAreaId="gangwon-sokcho-goseong-yangyang",
            style="Sea",
            durationDays=2,
        ),
    )

    assert created["travelAreaId"] == "gangwon-sokcho-goseong-yangyang"
    assert "Sokcho-Goseong-Yangyang" in created["title"]
    assert captured["create_trip"]["region"] == "Sokcho-Goseong-Yangyang"
    assert captured["create_trip"]["travel_area_id"] == "gangwon-sokcho-goseong-yangyang"
    assert captured["create_trip"]["participant_count"] == 1


def test_kakao_itinerary_provider_queries_multiple_keywords_and_dedupes() -> None:
    class FakeKakaoClient:
        def __init__(self) -> None:
            self.calls: list[dict[str, object]] = []

        def search_keyword(self, *, query: str, category_group_code: str):
            self.calls.append({"query": query, "category_group_code": category_group_code})
            if len(self.calls) == 1:
                return [
                    KakaoLocalPlace(
                        external_place_id="same-id",
                        name="Same place",
                        category_name="Food",
                        category_group_code="FD6",
                        category_group_name="Food",
                        phone="051-123-4567",
                        address="Busan road",
                        latitude=35.1,
                        longitude=129.1,
                        place_url="http://place.map.kakao.com/same-id",
                    )
                ]
            return [
                KakaoLocalPlace(
                    external_place_id="same-id",
                    name="Same place duplicate",
                    category_name="Food",
                    category_group_code="FD6",
                    category_group_name="Food",
                    phone="051-123-4567",
                    address="Busan road",
                    latitude=35.1,
                    longitude=129.1,
                    place_url="http://place.map.kakao.com/same-id",
                ),
                KakaoLocalPlace(
                    external_place_id=f"new-{len(self.calls)}",
                    name=f"New place {len(self.calls)}",
                    category_name="Food",
                    category_group_code="FD6",
                    category_group_name="Food",
                    phone="051-987-6543",
                    address="Busan road",
                    latitude=35.2,
                    longitude=129.2,
                    place_url=f"http://place.map.kakao.com/new-{len(self.calls)}",
                ),
            ]

    client = FakeKakaoClient()
    provider = trip_service.KakaoItineraryPlaceProvider(client)

    candidates = provider.search(area_name="Busan", city="Busan", category_group_code="FD6")

    assert len(client.calls) == 2
    assert all(call["category_group_code"] == "FD6" for call in client.calls)
    assert [candidate.external_place_id for candidate in candidates] == ["same-id", "new-2"]
    assert candidates[0].phone == "051-123-4567"
    assert candidates[1].phone == "051-987-6543"


def test_create_trip_persists_participant_count_without_fake_members(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    created = trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="Busan", participantCount=4, durationDays=2),
    )

    assert created["participantCount"] == 4
    assert created["people"] == ["Test User", "Minseo"]
    assert captured["create_trip"]["participant_count"] == 4


def test_create_trip_with_unknown_travel_area_id_returns_400(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    monkeypatch.setattr(trip_service, "get_travel_area", lambda _area_id: None)

    with pytest.raises(trip_service.TripServiceError) as error:
        trip_service.create_trip(
            fake_db,
            user,
            CreateTripRequest(travelAreaId="missing-area"),
        )

    assert error.value.status_code == 400
    assert error.value.detail == "Travel area not found"
    assert fake_db.commits == 0


def test_create_trip_region_only_remains_legacy_compatible(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    created = trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="Gangwon", durationDays=2),
    )

    assert created["travelAreaId"] is None
    assert "Gangwon" in created["title"]
    assert captured["create_trip"]["region"] == "Gangwon"
    assert captured["create_trip"]["travel_area_id"] is None


def test_create_trip_generates_catalog_places_and_recommendations(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)
    monkeypatch.setattr(trip_service, "_build_external_place_provider", lambda: None)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="제주", style="자연", durationDays=2),
    )

    assert len(captured["trip_days"]) == 2
    assert len(captured["trip_places"]) == 6
    assert [place["visit_time"] for place in captured["trip_places"][:3]] == [time(10), time(14), time(18)]
    assert captured["trip_places"][0]["place_name"] == "성산 일출봉"
    assert captured["trip_places"][0]["order_num"] == 1
    assert captured["trip_places"][0]["memo"] == "자연 · 제주 동부"
    assert len(captured["recommendations"]) == 1
    recommendation_result = captured["recommendations"][0]["result"]
    assert recommendation_result[0]["title"] == "성산 일출봉"
    assert recommendation_result[0]["meta"].startswith("Day 1 · 10:00")
    assert fake_db.commits == 1


def test_create_trip_persists_generated_external_place_metadata(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)
    generated = itinerary_recommendations.GeneratedCourse(
        places=[
            itinerary_recommendations.GeneratedPlace(
                day_number=1,
                date=date(2026, 7, 12),
                time="13:00",
                order_num=1,
                region="Busan",
                style="Food",
                label="FO",
                title="Kakao food place",
                meta="Food · Busan road",
                reason="Kakao candidate",
                address="Busan road",
                latitude=35.1,
                longitude=129.1,
                source_provider="kakao_local",
                external_place_id="12345",
                category_group_code="FD6",
                category_group_name="Food",
                place_url="http://place.map.kakao.com/12345",
            )
        ],
        recommendations=[],
    )
    monkeypatch.setattr(
        trip_service.itinerary_recommendations,
        "generate_auto_course",
        lambda **_kwargs: generated,
    )

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="Busan", style="Food", startDate=date(2026, 7, 12), endDate=date(2026, 7, 13)),
    )

    place_kwargs = captured["trip_places"][0]
    assert place_kwargs["address"] == "Busan road"
    assert place_kwargs["latitude"] == 35.1
    assert place_kwargs["longitude"] == 129.1
    assert place_kwargs["source_provider"] == "kakao_local"
    assert place_kwargs["external_place_id"] == "12345"
    assert place_kwargs["category_group_code"] == "FD6"
    assert place_kwargs["category_group_name"] == "Food"
    assert place_kwargs["place_url"] == "http://place.map.kakao.com/12345"


def test_create_trip_returns_persisted_kakao_coordinates_from_db(sqlite_db_session, monkeypatch) -> None:
    user = UserModel(
        email="kakao-course@example.com",
        password_hash="hashed",
        nickname="Kakao Course",
        onboarding_completed=True,
    )
    sqlite_db_session.add(user)
    sqlite_db_session.commit()
    generated = itinerary_recommendations.GeneratedCourse(
        places=[
            itinerary_recommendations.GeneratedPlace(
                day_number=1,
                date=date(2026, 7, 12),
                time="13:00",
                order_num=1,
                region="Busan",
                style="Food",
                label="FO",
                title="Kakao food place",
                meta="Food · Busan road",
                reason="Kakao candidate",
                address="Busan road",
                latitude=35.1234567,
                longitude=129.7654321,
                source_provider="kakao_local",
                external_place_id="12345",
                category_group_code="FD6",
                category_group_name="Food",
                place_url="http://place.map.kakao.com/12345",
            )
        ],
        recommendations=[],
    )
    monkeypatch.setattr(
        trip_service.itinerary_recommendations,
        "generate_auto_course",
        lambda **_kwargs: generated,
    )

    created = trip_service.create_trip(
        sqlite_db_session,
        user,
        CreateTripRequest(
            region="Busan",
            style="Food",
            startDate=date(2026, 7, 12),
            endDate=date(2026, 7, 13),
            title="Kakao coordinate verification",
        ),
    )

    api_place = created["days"][1][0]
    assert api_place["label"] == "Kakao food place"
    assert api_place["address"] == "Busan road"
    assert api_place["latitude"] == 35.1234567
    assert api_place["longitude"] == 129.7654321
    assert api_place["sourceProvider"] == "kakao_local"
    assert api_place["externalPlaceId"] == "12345"
    assert api_place["categoryCode"] == "FD6"
    assert api_place["placeUrl"] == "http://place.map.kakao.com/12345"

    persisted_place = sqlite_db_session.query(TripPlace).one()
    assert str(persisted_place.latitude) == "35.1234567"
    assert str(persisted_place.longitude) == "129.7654321"


def test_create_trip_persists_generated_days_places_and_recommendations_in_db(sqlite_db_session, monkeypatch) -> None:
    monkeypatch.setattr(trip_service, "_build_external_place_provider", lambda: None)
    user = UserModel(
        email="auto-course@example.com",
        password_hash="hashed",
        nickname="Auto Course",
        onboarding_completed=True,
    )
    sqlite_db_session.add(user)
    sqlite_db_session.commit()

    created = trip_service.create_trip(
        sqlite_db_session,
        user,
        CreateTripRequest(
            region="부산",
            style="맛집",
            startDate=date(2026, 7, 12),
            endDate=date(2026, 7, 14),
            title="Busan auto-course verification",
        ),
    )

    assert created["title"] == "Busan auto-course verification"
    assert sorted(created["days"].keys()) == [1, 2, 3]
    for day_places in created["days"].values():
        assert len(day_places) == 3
        assert [place["time"] for place in day_places] == ["10:00", "14:00", "18:00"]
        assert all(place["label"] for place in day_places)

    recommendations = trip_service.list_recommendations(sqlite_db_session, user, created["id"])
    assert recommendations is not None
    assert len(recommendations) >= 3
    assert all(item["sourceType"] == "savedSummary" for item in recommendations)


def test_create_trip_persists_empty_recommendations_when_catalog_has_no_region(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    captured = install_create_trip_stubs(monkeypatch)

    trip_service.create_trip(
        fake_db,
        user,
        CreateTripRequest(region="미지원", style="자연", durationDays=2),
    )

    assert len(captured["trip_days"]) == 2
    assert captured["trip_places"] == []
    assert len(captured["recommendations"]) == 1
    assert captured["recommendations"][0]["result"] == []
    assert fake_db.commits == 1


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
    policy = Policy(id=3, slug="fixture-policy", title="Vacation policy", benefit_amount=300000)
    captured = install_create_trip_stubs(monkeypatch, policy=policy)

    trip_service.create_trip(fake_db, user, CreateTripRequest(policySlug="fixture-policy"))

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
