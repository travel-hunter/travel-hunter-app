from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ExternalSourceRecord, Policy
from app.repositories import external_sources as external_source_repository
from app.services.policies import _external_policy_category


DEFAULT_TARGET_CONDITION = "공식 혜택 안내에서 조건을 확인하세요."


@dataclass(frozen=True)
class PolicyPromotionResult:
    promoted_count: int


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
    policy.slug = _policy_slug_for_external_record(record)
    policy.title = record.title
    policy.organization = record.organizer_text or record.source_name
    policy.policy_type = _external_policy_category(record)
    policy.description = record.raw_detail_text or record.benefit_text
    policy.benefit_amount = record.extracted_amount_krw
    policy.benefit_detail = record.benefit_value_text or record.benefit_text
    policy.target_condition = record.contact_text or DEFAULT_TARGET_CONDITION
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


def promote_external_benefits_to_policies(db: Session) -> PolicyPromotionResult:
    records = external_source_repository.list_policy_promotion_records(db)
    promoted_count = 0
    for record in records:
        policy = _get_policy_for_external_record(db, record)
        if policy is None:
            policy = Policy()
            db.add(policy)
        _assign_policy_from_external_record(policy, record)
        promoted_count += 1
    db.flush()
    return PolicyPromotionResult(promoted_count=promoted_count)
