from datetime import date

from app.models import Policy as PolicyModel
from app.models import ExternalSourceRecord
from app.models import PolicyDocument
from app.models import User as UserModel
from app.models import UserSavedPolicy
from app.services import policies as policy_service


def make_policy() -> PolicyModel:
    policy = PolicyModel(
        id=1,
        slug="local-vacation",
        title="Local Vacation Support",
        organization="Travel Hunter",
        policy_type="지역할인",
        description="Domestic travel support",
        benefit_amount=300000,
        benefit_detail="Up to 300000 KRW",
        target_condition="Domestic resident\nAt least one night\nReceipt required",
        region="National",
        end_date=date(2026, 10, 31),
        official_url="https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267",
        apply_url=None,
        policy_comment="Support for domestic travel expenses.",
    )
    policy.documents = [
        PolicyDocument(document_name="ID card"),
        PolicyDocument(document_name="Accommodation receipt"),
    ]
    return policy


def test_policy_to_api_preserves_contract_shape() -> None:
    payload = policy_service.policy_to_api(make_policy())

    assert payload["id"] == "local-vacation"
    assert payload["slug"] == "local-vacation"
    assert payload["label"] == "TH"
    assert payload["deadline"] == "2026-10-31"
    assert payload["amount"] == "Up to 300000 KRW"
    assert payload["match"] == 98
    assert payload["requirements"] == [
        "Domestic resident",
        "At least one night",
        "Receipt required",
    ]
    assert payload["documents"] == ["ID card", "Accommodation receipt"]
    assert payload["officialUrl"] == "https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267"
    assert payload["applyUrl"] is None
    assert payload["category"] == "지역할인"


def test_db_policy_service_uses_repository_boundary(monkeypatch) -> None:
    fake_db = object()
    policy = make_policy()

    monkeypatch.setattr(
        policy_service.policy_repository,
        "list_policies",
        lambda db: [policy] if db is fake_db else [],
    )
    monkeypatch.setattr(
        policy_service.policy_repository,
        "get_policy_by_slug",
        lambda db, slug: policy if db is fake_db and slug == "local-vacation" else None,
    )
    monkeypatch.setattr(
        policy_service.external_source_repository,
        "list_regional_benefit_recommendation_records",
        lambda db: [] if db is fake_db else [],
    )
    monkeypatch.setattr(
        policy_service.external_source_repository,
        "get_external_source_record_by_policy_slug",
        lambda db, slug: None,
    )

    policies = policy_service.list_policies(fake_db)
    detail = policy_service.get_policy("local-vacation", fake_db)
    missing = policy_service.get_policy("missing", fake_db)

    assert policies[0]["slug"] == "local-vacation"
    assert detail is not None
    assert detail["title"] == "Local Vacation Support"
    assert missing is None


def make_external_record() -> ExternalSourceRecord:
    return ExternalSourceRecord(
        id=58,
        source_name="여행가는 달",
        source_type="official",
        source_category="regional_benefit",
        external_id="tm-58",
        canonical_key="busan-photo-benefit",
        detail_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        collected_page_url="https://korean.visitkorea.or.kr/travelmonth/benefit.do",
        title="부산 야경투어 여행가는 달 할인",
        organizer_text="부산관광공사",
        region="부산",
        is_nationwide=False,
        status_text="진행중",
        status="active",
        end_date=date(2026, 6, 30),
        benefit_text="부산 야경투어 상품 할인",
        benefit_value_text="최대 2만원",
        extracted_amount_krw=20000,
        tags=["사진", "체험"],
        inferred_travel_styles=["사진", "체험"],
        confidence=0.8,
        field_completeness=0.9,
        freshness_status="fresh",
    )


def test_db_policy_list_includes_collected_external_benefits(monkeypatch) -> None:
    fake_db = object()
    policy = make_policy()
    external_record = make_external_record()

    monkeypatch.setattr(
        policy_service.policy_repository,
        "list_policies",
        lambda db: [policy] if db is fake_db else [],
    )
    monkeypatch.setattr(
        policy_service.external_source_repository,
        "list_regional_benefit_recommendation_records",
        lambda db: [external_record] if db is fake_db else [],
    )

    payload = policy_service.list_policies(fake_db)

    assert [policy_payload["slug"] for policy_payload in payload] == [
        "local-vacation",
        "travelmonth-58",
    ]
    collected = payload[1]
    assert collected["sourceType"] == "external"
    assert collected["title"] == "부산 야경투어 여행가는 달 할인"
    assert collected["org"] == "부산관광공사"
    assert collected["region"] == "부산"
    assert collected["deadline"] == "2026-06-30"
    assert collected["amount"] == "최대 2만원"
    assert collected["tag"] == "최대 2만원"
    assert collected["category"] == "지역할인"
    assert collected["officialUrl"] == "https://korean.visitkorea.or.kr/travelmonth/benefit.do"
    assert collected["applyUrl"] is None


def test_db_policy_detail_resolves_collected_external_benefit_slug(monkeypatch) -> None:
    fake_db = object()
    external_record = make_external_record()

    monkeypatch.setattr(policy_service.policy_repository, "get_policy_by_slug", lambda *_args: None)
    monkeypatch.setattr(
        policy_service.external_source_repository,
        "get_external_source_record_by_policy_slug",
        lambda db, slug: external_record if db is fake_db and slug == "travelmonth-58" else None,
    )

    detail = policy_service.get_policy("travelmonth-58", fake_db)

    assert detail is not None
    assert detail["slug"] == "travelmonth-58"
    assert detail["sourceType"] == "external"


def test_external_policy_category_uses_official_source_not_travel_styles() -> None:
    record = make_external_record()
    record.collected_page_url = "https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do"
    record.inferred_travel_styles = ["맛집", "사진"]

    payload = policy_service.external_source_record_to_policy_api(record)

    assert payload["category"] == "교통"


def test_external_policy_fallback_copy_uses_official_benefit_wording() -> None:
    record = make_external_record()
    record.benefit_value_text = None
    record.benefit_text = None

    payload = policy_service.external_source_record_to_policy_api(record)

    assert payload["amount"] == "혜택 확인 필요"
    assert payload["tag"] == "지역할인"
    assert payload["summary"] == "공식 혜택 안내를 확인해 주세요."
    assert payload["documents"] == ["혜택 안내 확인"]


class FakeDb:
    def __init__(self) -> None:
        self.commits = 0

    def commit(self) -> None:
        self.commits += 1


def make_user() -> UserModel:
    return UserModel(id=7, email="friend@travel.kr", nickname="Friend")


def test_db_save_policy_creates_idempotent_saved_policy(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    policy = make_policy()
    added_rows: list[dict[str, int]] = []

    monkeypatch.setattr(
        policy_service.policy_repository,
        "get_policy_by_slug",
        lambda db, slug: policy if db is fake_db and slug == "local-vacation" else None,
    )
    monkeypatch.setattr(
        policy_service.policy_repository,
        "get_saved_policy",
        lambda *_args, **_kwargs: None,
    )

    def add_saved_policy_stub(_db, **kwargs):
        added_rows.append(kwargs)
        return UserSavedPolicy(id=1, **kwargs)

    monkeypatch.setattr(policy_service.policy_repository, "add_saved_policy", add_saved_policy_stub)

    payload = policy_service.save_policy("local-vacation", fake_db, user)

    assert payload == {"policyId": "local-vacation", "saved": True}
    assert added_rows == [{"user_id": 7, "policy_id": 1}]
    assert fake_db.commits == 1


def test_db_save_policy_returns_existing_saved_policy_without_duplicate(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    policy = make_policy()
    added_rows: list[dict[str, int]] = []

    monkeypatch.setattr(policy_service.policy_repository, "get_policy_by_slug", lambda *_args: policy)
    monkeypatch.setattr(
        policy_service.policy_repository,
        "get_saved_policy",
        lambda *_args, **_kwargs: UserSavedPolicy(id=1, user_id=7, policy_id=1),
    )
    monkeypatch.setattr(
        policy_service.policy_repository,
        "add_saved_policy",
        lambda _db, **kwargs: added_rows.append(kwargs),
    )

    payload = policy_service.save_policy("local-vacation", fake_db, user)

    assert payload == {"policyId": "local-vacation", "saved": True}
    assert added_rows == []
    assert fake_db.commits == 0


def test_db_save_policy_returns_none_for_unknown_policy(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()

    monkeypatch.setattr(policy_service.policy_repository, "get_policy_by_slug", lambda *_args: None)

    assert policy_service.save_policy("missing-policy", fake_db, user) is None
    assert fake_db.commits == 0


def test_db_list_saved_policies_maps_saved_rows(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    policy = make_policy()

    monkeypatch.setattr(
        policy_service.policy_repository,
        "list_saved_policies",
        lambda db, user_id: [policy] if db is fake_db and user_id == user.id else [],
    )

    payload = policy_service.list_saved_policies(fake_db, user)

    assert [policy_payload["slug"] for policy_payload in payload] == ["local-vacation"]


def test_db_list_applied_policies_maps_accessible_trip_policy_rows(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    policy = make_policy()

    monkeypatch.setattr(
        policy_service.policy_repository,
        "list_applied_policies",
        lambda db, user_id: [policy] if db is fake_db and user_id == user.id else [],
    )

    payload = policy_service.list_applied_policies(fake_db, user)

    assert [policy_payload["slug"] for policy_payload in payload] == ["local-vacation"]


def test_db_remove_saved_policy_is_idempotent_for_existing_policy(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    policy = make_policy()
    removed_rows: list[dict[str, int]] = []

    monkeypatch.setattr(policy_service.policy_repository, "get_policy_by_slug", lambda *_args: policy)

    def remove_saved_policy_stub(_db, **kwargs):
        removed_rows.append(kwargs)
        return True

    monkeypatch.setattr(policy_service.policy_repository, "remove_saved_policy", remove_saved_policy_stub)

    payload = policy_service.remove_saved_policy("local-vacation", fake_db, user)

    assert payload == {"policyId": "local-vacation", "saved": False}
    assert removed_rows == [{"user_id": 7, "policy_id": 1}]
    assert fake_db.commits == 1
