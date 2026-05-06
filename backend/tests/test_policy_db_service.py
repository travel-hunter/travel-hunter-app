from datetime import date
from types import SimpleNamespace

from app.models import Policy as PolicyModel
from app.models import PolicyDocument
from app.models import User as UserModel
from app.models import UserSavedPolicy
from app.services import policies as policy_service


def make_policy() -> PolicyModel:
    policy = PolicyModel(
        id=1,
        slug="local-vacation",
        title="지역사랑 휴가지원",
        organization="한국관광공사",
        policy_type="환급",
        description="국내 여행 지원",
        benefit_amount=300000,
        benefit_detail="최대 30만원 환급",
        target_condition="국내 거주자\n숙박 1박 이상\n영수증 제출",
        region="전국",
        end_date=date(2026, 10, 31),
        official_url="https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267",
        apply_url=None,
        policy_comment="국내 1박 이상 여행 시 여행비 일부를 환급합니다.",
    )
    policy.documents = [
        PolicyDocument(document_name="신분증 사본"),
        PolicyDocument(document_name="숙박 영수증"),
    ]
    return policy


def test_policy_to_api_preserves_contract_shape() -> None:
    payload = policy_service.policy_to_api(make_policy())

    assert payload["id"] == "local-vacation"
    assert payload["slug"] == "local-vacation"
    assert payload["label"] == "TH"
    assert payload["tag"] == "최대 30만원"
    assert payload["deadline"] == "2026-10-31"
    assert payload["amount"] == "최대 30만원 환급"
    assert payload["match"] == 98
    assert payload["requirements"] == ["국내 거주자", "숙박 1박 이상", "영수증 제출"]
    assert payload["documents"] == ["신분증 사본", "숙박 영수증"]
    assert payload["officialUrl"] == "https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267"
    assert payload["applyUrl"] is None


def test_db_policy_service_uses_repository_boundary(monkeypatch) -> None:
    fake_db = object()
    policy = make_policy()

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
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

    policies = policy_service.list_policies(fake_db)
    detail = policy_service.get_policy("local-vacation", fake_db)
    missing = policy_service.get_policy("missing", fake_db)

    assert policies[0]["slug"] == "local-vacation"
    assert detail is not None
    assert detail["title"] == "지역사랑 휴가지원"
    assert missing is None


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

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
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

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
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

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(policy_service.policy_repository, "get_policy_by_slug", lambda *_args: None)

    assert policy_service.save_policy("missing-policy", fake_db, user) is None
    assert fake_db.commits == 0


def test_db_list_saved_policies_maps_saved_rows(monkeypatch) -> None:
    fake_db = object()
    user = make_user()
    policy = make_policy()

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(
        policy_service.policy_repository,
        "list_saved_policies",
        lambda db, user_id: [policy] if db is fake_db and user_id == user.id else [],
    )

    payload = policy_service.list_saved_policies(fake_db, user)

    assert [policy_payload["slug"] for policy_payload in payload] == ["local-vacation"]


def test_db_remove_saved_policy_is_idempotent_for_existing_policy(monkeypatch) -> None:
    fake_db = FakeDb()
    user = make_user()
    policy = make_policy()
    removed_rows: list[dict[str, int]] = []

    monkeypatch.setattr(policy_service, "settings", SimpleNamespace(backend_data_source="db"))
    monkeypatch.setattr(policy_service.policy_repository, "get_policy_by_slug", lambda *_args: policy)

    def remove_saved_policy_stub(_db, **kwargs):
        removed_rows.append(kwargs)
        return True

    monkeypatch.setattr(policy_service.policy_repository, "remove_saved_policy", remove_saved_policy_stub)

    payload = policy_service.remove_saved_policy("local-vacation", fake_db, user)

    assert payload == {"policyId": "local-vacation", "saved": False}
    assert removed_rows == [{"user_id": 7, "policy_id": 1}]
    assert fake_db.commits == 1
