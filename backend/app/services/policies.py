from __future__ import annotations

from typing import Literal
from sqlalchemy.orm import Session

from app.data.policy_display import DISPLAY_OVERRIDES, SUPPORTED_CATEGORIES
from app.models import ExternalSourceRecord
from app.models import User
from app.models import Policy as PolicyModel
from app.repositories import external_sources as external_source_repository
from app.repositories import policies as policy_repository
from app.services.policy_category_classifier import classify_external_policy_category
from app.services import stay_discount_aliases
from app.services import local_half_trip_display


LEGACY_CATEGORY_MAP = {
    "추천": "지역할인",
    "환급": "지역할인",
    "캐시백": "지역할인",
}


API_POLICY_SOURCE_TYPES = {"internal", "external"}


def _normalize_policy_source_type(policy: PolicyModel) -> Literal["internal", "external"]:
    if policy.external_source_record_id is not None:
        return "external"
    source_type = (policy.source_type or "internal").lower()
    if source_type in API_POLICY_SOURCE_TYPES:
        return source_type
    return "external"


def _normalize_policy_category(policy_type: str | None) -> str:
    if policy_type in SUPPORTED_CATEGORIES:
        return policy_type
    return LEGACY_CATEGORY_MAP.get(policy_type or "", "기타")


def _external_policy_category(record: ExternalSourceRecord) -> str:
    return classify_external_policy_category(record).category


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
    category = _normalize_policy_category(policy.policy_type)
    source_type = _normalize_policy_source_type(policy)

    title = local_half_trip_display.policy_title(
        policy.title,
        policy.source_category,
    )

    return {
        "id": slug,
        "slug": slug,
        "label": str(display.get("label", slug[:2].upper())),
        "tag": str(display.get("tag", benefit_prefix or category)),
        "title": title,
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
        "sourceType": source_type,
    }


def _policy_to_stay_discount_alias_api(
    policy: PolicyModel,
    alias_area: stay_discount_aliases.StayDiscountAliasArea,
) -> dict[str, object]:
    payload = policy_to_api(policy)
    payload.update(
        {
            "id": alias_area.slug,
            "slug": alias_area.slug,
            "label": alias_area.sido[:2],
            "title": stay_discount_aliases.alias_title(policy.title, alias_area),
            "region": alias_area.sido,
            "category": "숙박",
            "sourceType": "external",
        }
    )
    payload.pop("actionStatus", None)
    return payload


def _policy_detail_with_alias(
    policy: PolicyModel,
    alias_area: stay_discount_aliases.StayDiscountAliasArea,
) -> dict[str, object]:
    payload = policy_to_api(policy)
    payload["id"] = alias_area.slug
    payload["slug"] = alias_area.slug
    payload["title"] = stay_discount_aliases.alias_title(policy.title, alias_area)
    payload["region"] = alias_area.sido
    payload["category"] = "숙박"
    payload.pop("actionStatus", None)
    return payload


def external_policy_slug(record: ExternalSourceRecord) -> str:
    return f"{external_source_repository.EXTERNAL_POLICY_SLUG_PREFIX}{record.id}"


def _external_policy_label(record: ExternalSourceRecord) -> str:
    region = record.region or ("전국" if record.is_nationwide else "")
    if region:
        return region[:2]
    return "공식"


def external_source_record_to_policy_api(
    record: ExternalSourceRecord,
) -> dict[str, object]:
    amount = record.benefit_value_text or record.benefit_text or "혜택 확인 필요"
    category = _external_policy_category(record)
    tag = record.benefit_value_text or record.benefit_text or category
    summary_parts = [
        value
        for value in [record.benefit_text, record.raw_detail_text]
        if value
    ]
    summary = summary_parts[0] if summary_parts else "공식 혜택 안내를 확인해 주세요."
    if len(summary) > 180:
        summary = f"{summary[:177].rstrip()}..."

    title = local_half_trip_display.policy_title(
        record.title,
        record.source_category,
        record.city,
    )

    return {
        "id": external_policy_slug(record),
        "slug": external_policy_slug(record),
        "label": _external_policy_label(record),
        "tag": tag,
        "title": title,
        "org": record.organizer_text or record.source_name,
        "region": record.region or "전국",
        "deadline": record.end_date.isoformat() if record.end_date else "",
        "amount": amount,
        "summary": summary,
        "match": 80,
        "category": category,
        "requirements": ["공식 안내에서 신청 조건을 확인하세요."],
        "documents": ["혜택 안내 확인"],
        "officialUrl": record.detail_url or record.collected_page_url,
        "applyUrl": None,
        "sourceType": "external",
        "actionStatus": "infoOnly",
    }


def list_policies(db: Session | None = None) -> list[dict[str, object]]:
    if db is None:
        raise RuntimeError("DB session is required.")
    payloads: list[dict[str, object]] = []
    for policy in policy_repository.list_policies(db):
        if stay_discount_aliases.is_stay_discount_canonical_policy(policy):
            alias_areas = stay_discount_aliases.alias_areas_for_policy(db, policy)
            if alias_areas:
                payloads.extend(
                    _policy_to_stay_discount_alias_api(policy, area)
                    for area in alias_areas
                )
            continue
        payloads.append(policy_to_api(policy))
    return payloads


def get_policy(policy_slug: str, db: Session | None = None) -> dict[str, object] | None:
    if db is None:
        raise RuntimeError("DB session is required.")

    alias_resolution = stay_discount_aliases.resolve_stay_discount_alias_slug(db, policy_slug)
    if alias_resolution is not None:
        policy = alias_resolution.canonical_policy
        if (getattr(policy, "status", "active") or "active") != "active":
            return None
        if alias_resolution.alias_area is None:
            return policy_to_api(policy)
        return _policy_detail_with_alias(policy, alias_resolution.alias_area)

    try:
        policy = policy_repository.get_policy_by_slug_any_status(db, policy_slug)
    except AttributeError:
        policy = policy_repository.get_policy_by_slug(db, policy_slug)
    if policy is not None:
        if (getattr(policy, "status", "active") or "active") != "active":
            return None
        return policy_to_api(policy)

    if policy is None:
        external_record = external_source_repository.get_external_source_record_by_policy_slug(
            db,
            policy_slug,
        )
        if external_record is None:
            return None
        return external_source_record_to_policy_api(external_record)


def save_policy(
    policy_slug: str,
    db: Session | None = None,
    user: User | None = None,
) -> dict[str, object] | None:
    if db is None:
        raise RuntimeError("DB session is required.")
    if user is None:
        raise RuntimeError("User is required.")

    alias_resolution = stay_discount_aliases.resolve_stay_discount_alias_slug(db, policy_slug)
    policy = (
        alias_resolution.canonical_policy
        if alias_resolution is not None
        else policy_repository.get_policy_by_slug(db, policy_slug)
    )
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

    seen_slugs: set[str] = set()
    saved_policies: list[dict[str, object]] = []
    for policy in policy_repository.list_saved_policies(db, user_id=user.id):
        policy_payload = policy_to_api(policy)
        slug = str(policy_payload["slug"])
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        saved_policies.append(policy_payload)
    return saved_policies


def list_applied_policies(
    db: Session | None = None,
    user: User | None = None,
) -> list[dict[str, object]]:
    if db is None:
        raise RuntimeError("DB session is required.")
    if user is None:
        raise RuntimeError("User is required.")

    return [
        policy_to_api(policy)
        for policy in policy_repository.list_applied_policies(db, user_id=user.id)
    ]


def list_applied_policy_links(
    db: Session | None = None,
    user: User | None = None,
) -> list[dict[str, object]]:
    if db is None:
        raise RuntimeError("DB session is required.")
    if user is None:
        raise RuntimeError("User is required.")

    grouped: dict[int, dict[str, object]] = {}
    for link in policy_repository.list_applied_policy_links(db, user_id=user.id):
        policy = link.policy
        trip = link.trip
        if policy is None or trip is None:
            continue
        if policy.id not in grouped:
            grouped[policy.id] = {
                "policy": policy_to_api(policy),
                "linkedTrips": [],
            }
        linked_trips = grouped[policy.id]["linkedTrips"]
        assert isinstance(linked_trips, list)
        linked_trips.append(
            {
                "id": str(trip.id),
                "title": trip.title,
                "region": trip.region or "",
                "startDate": trip.start_date.isoformat() if trip.start_date else None,
                "endDate": trip.end_date.isoformat() if trip.end_date else None,
            }
        )
    return list(grouped.values())


def remove_saved_policy(
    policy_slug: str,
    db: Session | None = None,
    user: User | None = None,
) -> dict[str, object] | None:
    if db is None:
        raise RuntimeError("DB session is required.")
    if user is None:
        raise RuntimeError("User is required.")

    alias_resolution = stay_discount_aliases.resolve_stay_discount_alias_slug(db, policy_slug)
    policy = (
        alias_resolution.canonical_policy
        if alias_resolution is not None
        else policy_repository.get_policy_by_slug(db, policy_slug)
    )
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
