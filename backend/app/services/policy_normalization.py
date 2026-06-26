from __future__ import annotations

from dataclasses import dataclass
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExternalSourceRecord, Policy
from app.repositories import external_sources as external_source_repository
from app.services.policies import _external_policy_category
from app.services.travelmonth_normalizer import extract_benefit_value


DEFAULT_TARGET_CONDITION = "공식 혜택 안내에서 조건을 확인하세요."
LOCAL_HALF_TRIP_SOURCE_CATEGORY = "local_half_trip"
CONTACT_ONLY_PATTERN = re.compile(
    r"^\s*(?:문의전화|문의|전화|tel|contact|고객센터|운영사무국)?\s*[:：-]?\s*"
    r"(?:\+?\d[\d\s().-]{5,}\d)\s*$",
    re.IGNORECASE,
)
CONTACT_HINT_PATTERN = re.compile(r"문의|전화|tel|contact|고객센터|운영사무국", re.IGNORECASE)
CONDITION_HINT_PATTERN = re.compile(
    r"특이사항|조건|인증|방문|결제|가맹점|지역화폐|제로페이|상품|예약|쿠폰|할인|환급|지원|사용|이용|대상|숙박|식사|체험"
)


@dataclass(frozen=True)
class PolicyPromotionResult:
    promoted_count: int


def _normalized_text(value: object) -> str:
    return " ".join(str(value or "").split())


def _is_contact_only_text(value: str) -> bool:
    text = _normalized_text(value)
    if not text:
        return False
    return bool(CONTACT_ONLY_PATTERN.match(text))


def _is_condition_candidate(value: str) -> bool:
    text = _normalized_text(value)
    if not text:
        return False
    if _is_contact_only_text(text):
        return False
    if CONTACT_HINT_PATTERN.search(text) and not CONDITION_HINT_PATTERN.search(text):
        return False
    return bool(CONDITION_HINT_PATTERN.search(text))


def _raw_field_value(record: ExternalSourceRecord, field_name: str) -> str:
    raw_payload = record.raw_payload if isinstance(record.raw_payload, dict) else {}
    field_values = raw_payload.get("field_values")
    if not isinstance(field_values, dict):
        return ""
    return _normalized_text(field_values.get(field_name))


def _local_half_trip_target_condition(record: ExternalSourceRecord) -> str:
    candidates = [
        _raw_field_value(record, "특이사항"),
        _raw_field_value(record, "지역화폐"),
        _raw_field_value(record, "신청조건"),
        _raw_field_value(record, "사용조건"),
        _raw_field_value(record, "이용조건"),
        _normalized_text(record.raw_detail_text),
    ]
    for candidate in candidates:
        if _is_condition_candidate(candidate):
            return candidate
    return DEFAULT_TARGET_CONDITION


def _target_condition_for_record(record: ExternalSourceRecord) -> str:
    if record.source_category == LOCAL_HALF_TRIP_SOURCE_CATEGORY:
        return _local_half_trip_target_condition(record)
    contact_text = _normalized_text(record.contact_text)
    if contact_text and not _is_contact_only_text(contact_text):
        return contact_text
    return DEFAULT_TARGET_CONDITION


def _policy_slug_for_external_record(record: ExternalSourceRecord) -> str:
    return f"{external_source_repository.EXTERNAL_POLICY_SLUG_PREFIX}{record.id}"


def _get_policy_for_external_record(
    db: Session,
    record: ExternalSourceRecord,
) -> Policy | None:
    if record.id is not None:
        by_source_record = db.scalar(
            select(Policy).where(Policy.external_source_record_id == record.id)
        )
        if by_source_record is not None:
            return by_source_record
    return db.scalar(select(Policy).where(Policy.slug == _policy_slug_for_external_record(record)))


def _assign_policy_from_external_record(
    policy: Policy,
    record: ExternalSourceRecord,
) -> Policy:
    policy.status = "active"
    if getattr(policy, "admin_override_enabled", False) is True:
        policy.source_type = record.source_type
        policy.source_name = record.source_name
        policy.source_category = record.source_category
        policy.external_source_record_id = record.id
        policy.source_url = record.detail_url or record.collected_page_url or record.source_url
        policy.source_canonical_key = record.canonical_key
        policy.normalized_at = record.last_fetched_at
        policy.last_verified_at = record.last_verified_at
        policy.verification_status = record.freshness_status
        return policy

    benefit_value = extract_benefit_value(record.benefit_text or "", title=record.title)
    benefit_detail = record.benefit_value_text or benefit_value.value_text or record.benefit_text
    policy.slug = _policy_slug_for_external_record(record)
    policy.title = record.title
    policy.organization = record.organizer_text or record.source_name
    policy.policy_type = _external_policy_category(record)
    policy.description = record.raw_detail_text or record.benefit_text
    policy.benefit_amount = record.extracted_amount_krw or benefit_value.amount_krw
    policy.benefit_detail = benefit_detail
    policy.target_condition = _target_condition_for_record(record)
    policy.region = record.region or "전국"
    policy.start_date = record.start_date
    policy.end_date = record.end_date
    policy.official_url = record.detail_url or record.collected_page_url
    policy.apply_url = None
    policy.policy_comment = record.benefit_text[:300] if record.benefit_text else None
    policy.policy_period = None
    policy.source_type = record.source_type
    policy.source_name = record.source_name
    policy.source_category = record.source_category
    policy.external_source_record_id = record.id
    policy.source_url = record.detail_url or record.collected_page_url or record.source_url
    policy.source_canonical_key = record.canonical_key
    policy.normalized_at = record.last_fetched_at
    policy.last_verified_at = record.last_verified_at
    policy.verification_status = record.freshness_status
    return policy


def _hide_policy_for_external_record(
    db: Session,
    record: ExternalSourceRecord,
) -> bool:
    policy = _get_policy_for_external_record(db, record)
    if policy is None:
        return False
    policy.status = "hidden"
    policy.source_type = record.source_type
    policy.source_name = record.source_name
    policy.source_category = record.source_category
    policy.external_source_record_id = record.id
    policy.source_url = record.detail_url or record.collected_page_url or record.source_url
    policy.source_canonical_key = record.canonical_key
    policy.normalized_at = record.last_fetched_at
    policy.last_verified_at = record.last_verified_at
    policy.verification_status = record.freshness_status
    return True


def promote_external_benefits_to_policies(db: Session) -> PolicyPromotionResult:
    records = external_source_repository.list_policy_promotion_records(db)
    promoted_count = 0
    promoted_categories: set[str] = set()
    for record in records:
        policy = _get_policy_for_external_record(db, record)
        if policy is None:
            policy = Policy()
            db.add(policy)
        _assign_policy_from_external_record(policy, record)
        promoted_categories.add(record.source_category)
        promoted_count += 1
    for record in external_source_repository.list_policy_deactivation_records(db):
        _hide_policy_for_external_record(db, record)
    if "local_half_trip" in promoted_categories:
        _hide_legacy_dgtour_seed_policies(db)
    db.flush()
    return PolicyPromotionResult(promoted_count=promoted_count)


def _hide_legacy_dgtour_seed_policies(db: Session) -> None:
    legacy_policies = db.scalars(
        select(Policy).where(Policy.slug.like("dgtour-%"))
    ).all()
    for policy in legacy_policies:
        policy.status = "hidden"
