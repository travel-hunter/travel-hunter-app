from __future__ import annotations

from sqlalchemy.orm import Session

from app.data.policy_display import DISPLAY_OVERRIDES, SUPPORTED_CATEGORIES
from app.models import User
from app.models import Policy as PolicyModel
from app.repositories import policies as policy_repository


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
        "applyUrl": policy.apply_url,
    }


def list_policies(db: Session | None = None) -> list[dict[str, object]]:
    if db is None:
        raise RuntimeError("DB session is required.")
    return [policy_to_api(policy) for policy in policy_repository.list_policies(db)]


def get_policy(policy_slug: str, db: Session | None = None) -> dict[str, object] | None:
    if db is None:
        raise RuntimeError("DB session is required.")

    policy = policy_repository.get_policy_by_slug(db, policy_slug)
    if policy is None:
        return None
    return policy_to_api(policy)


def save_policy(
    policy_slug: str,
    db: Session | None = None,
    user: User | None = None,
) -> dict[str, object] | None:
    if db is None:
        raise RuntimeError("DB session is required.")
    if user is None:
        raise RuntimeError("User is required.")

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


def list_saved_policies(
    db: Session | None = None,
    user: User | None = None,
) -> list[dict[str, object]]:
    if db is None:
        raise RuntimeError("DB session is required.")
    if user is None:
        raise RuntimeError("User is required.")

    return [
        policy_to_api(policy)
        for policy in policy_repository.list_saved_policies(db, user_id=user.id)
    ]


def remove_saved_policy(
    policy_slug: str,
    db: Session | None = None,
    user: User | None = None,
) -> dict[str, object] | None:
    if db is None:
        raise RuntimeError("DB session is required.")
    if user is None:
        raise RuntimeError("User is required.")

    policy = policy_repository.get_policy_by_slug(db, policy_slug)
    if policy is None:
        return None

    policy_repository.remove_saved_policy(
        db,
        user_id=user.id,
        policy_id=policy.id,
    )
    db.commit()
    return {
        "policyId": policy_slug,
        "saved": False,
    }
