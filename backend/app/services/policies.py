from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User
from app.models import Policy as PolicyModel
from app.repositories import policies as policy_repository
from app.services import mock_store


DISPLAY_OVERRIDES = {
    "local-vacation": {"label": "TH", "tag": "최대 30만원", "match": 98},
    "sokcho-stay": {"label": "SC", "tag": "50% 할인", "match": 86},
    "busan-cashback": {"label": "BS", "tag": "5% 캐시백", "match": 79},
}

SUPPORTED_CATEGORIES = {"추천", "환급", "숙박", "캐시백"}


def _format_benefit_amount(value: int | None) -> str | None:
    if value is None:
        return None
    if value >= 10000 and value % 10000 == 0:
        return f"최대 {value // 10000}만원"
    return f"최대 {value:,}원"


def _split_lines(value: str | None) -> list[str]:
    if not value:
        return []
    return [line.strip() for line in value.splitlines() if line.strip()]


def policy_to_api(policy: PolicyModel) -> dict[str, object]:
    slug = policy.slug or str(policy.id)
    display = DISPLAY_OVERRIDES.get(slug, {})
    benefit_prefix = _format_benefit_amount(policy.benefit_amount)
    amount = policy.benefit_detail or benefit_prefix or ""
    category = policy.policy_type if policy.policy_type in SUPPORTED_CATEGORIES else "추천"

    return {
        "id": slug,
        "slug": slug,
        "label": str(display.get("label", slug[:2].upper())),
        "tag": str(display.get("tag", benefit_prefix or category)),
        "title": policy.title,
        "org": policy.organization or "",
        "region": policy.region,
        "deadline": policy.end_date.isoformat() if policy.end_date else "",
        "amount": amount,
        "summary": policy.policy_comment or policy.description or "",
        "match": int(display.get("match", 90)),
        "category": category,
        "requirements": _split_lines(policy.target_condition),
        "documents": [document.document_name for document in policy.documents],
        "officialUrl": policy.official_url,
    }


def list_policies(db: Session | None = None) -> list[dict[str, object]]:
    if settings.backend_data_source != "db":
        return mock_store.list_policies()
    if db is None:
        raise RuntimeError("DB session is required when BACKEND_DATA_SOURCE=db.")
    return [policy_to_api(policy) for policy in policy_repository.list_policies(db)]


def get_policy(policy_slug: str, db: Session | None = None) -> dict[str, object] | None:
    if settings.backend_data_source != "db":
        return mock_store.get_policy(policy_slug)
    if db is None:
        raise RuntimeError("DB session is required when BACKEND_DATA_SOURCE=db.")

    policy = policy_repository.get_policy_by_slug(db, policy_slug)
    if policy is None:
        return None
    return policy_to_api(policy)


def save_policy(
    policy_slug: str,
    db: Session | None = None,
    user: User | None = None,
) -> dict[str, object] | None:
    if settings.backend_data_source != "db":
        return mock_store.save_policy(policy_slug)
    if db is None:
        raise RuntimeError("DB session is required when BACKEND_DATA_SOURCE=db.")
    if user is None:
        raise RuntimeError("User is required when BACKEND_DATA_SOURCE=db.")

    policy = policy_repository.get_policy_by_slug(db, policy_slug)
    if policy is None:
        return None

    existing = policy_repository.get_saved_policy(
        db,
        user_id=user.id,
        policy_id=policy.id,
    )
    if existing is None:
        policy_repository.add_saved_policy(
            db,
            user_id=user.id,
            policy_id=policy.id,
        )
        db.commit()

    return {
        "policyId": policy_slug,
        "saved": True,
    }
