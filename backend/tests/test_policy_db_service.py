from datetime import date
from types import SimpleNamespace

from app.models import Policy as PolicyModel
from app.models import PolicyDocument
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
